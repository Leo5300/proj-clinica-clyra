import React, { useState, useCallback } from 'react';
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import {
  buscarConsulta,
  excluirConsulta,
  buscarMedicos,
  buscarPaciente,
  buscarSinaisVitais,
  SessaoExpirada,
  SemPermissao,
  ErroDaApi,
} from '../services/api';
import {
  cancelarLembrete,
  dataDaConsulta,
  formatarHora,
} from '../services/lembretes';
import { useUsuario } from '../services/sessao';
import { nomeCurtoDoDia, formatarDataLonga } from '../services/datas';
import { CLINICA } from '../services/localizacao';

// Tela de destino do toque no lembrete. Recebe so o consultaId (o que
// viaja em content.data) e busca o resto no servidor: a notificacao pode
// ter sido agendada dias atras, e o servidor e a fonte da verdade.

// TODO: mover para front/src/theme quando o ThemeContext existir.
const colors = {
  bg: '#F5F5F2',
  surface: '#FFFFFF',
  border: '#E2E1DB',
  ink: '#4A5560',
  muted: '#8B909A',
  sage: '#4B7776',
  danger: '#B0555F',
};

const AREA_DE_TOQUE = { top: 11, bottom: 11, left: 11, right: 11 };

// Mesma regra do servidor: o paciente so remarca ou cancela sozinho com
// 24 h de antecedencia. A tela so evita oferecer o que seria recusado.
const ANTECEDENCIA_MINIMA_MS = 24 * 60 * 60 * 1000;

// "seg, 05/10/2026 às 08:30"
function formatarQuando(data) {
  return `${nomeCurtoDoDia(data)}, ${formatarDataLonga(data)} às ${formatarHora(data)}`;
}

// "registrado em 05/10 às 08:12"
function formatarRegistro(texto) {
  const data = new Date(texto);
  const dia = String(data.getDate()).padStart(2, '0');
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  return `registrado em ${dia}/${mes} às ${formatarHora(data)}`;
}

// "72 bpm, média de 5 leituras (Bluetooth)"
function resumoDoSinal(sinal) {
  const leituras =
    sinal.quantidadeLeituras > 1
      ? `média de ${sinal.quantidadeLeituras} leituras`
      : '1 leitura';
  const origem = sinal.origem === 'bluetooth' ? 'Bluetooth' : 'digitado';

  return `${sinal.frequenciaCardiaca} bpm, ${leituras} (${origem})`;
}

export default function DetalheConsultaScreen({ navigation, route }) {
  const consultaId = route.params?.consultaId;

  const { usuario } = useUsuario();
  const perfil = usuario?.perfil;

  const [consulta, setConsulta] = useState(null);
  const [paciente, setPaciente] = useState(null);
  const [medico, setMedico] = useState(null);
  const [ultimoSinal, setUltimoSinal] = useState(null);
  const [erroSinais, setErroSinais] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);
  const [naoExiste, setNaoExiste] = useState(false);
  const [cancelando, setCancelando] = useState(false);

  const irParaLogin = () => {
    navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
  };

  const carregar = useCallback(async () => {
    if (!perfil) return;

    setCarregando(true);
    setErro(null);
    setNaoExiste(false);

    try {
      const dados = await buscarConsulta(consultaId);
      setConsulta(dados);

      // Nomes buscados a parte: a consulta guarda so os ids. O paciente
      // logado nao precisa buscar o proprio cadastro para esta tela.
      const [pacienteDados, medicos] = await Promise.all([
        perfil === 'paciente'
          ? null
          : buscarPaciente(dados.pacienteId).catch(() => null),
        buscarMedicos().catch(() => []),
      ]);

      setPaciente(pacienteDados);
      setMedico(
        medicos.find((m) => String(m.id) === String(dados.medicoId)) ?? null,
      );

      // Sinais vitais so para quem atende e para o proprio paciente. Falha
      // aqui nao derruba o resto da tela.
      if (perfil === 'medico' || perfil === 'paciente') {
        try {
          const sinais = await buscarSinaisVitais({ consultaId });
          setUltimoSinal(sinais[0] ?? null);
          setErroSinais(null);
        } catch (e) {
          setUltimoSinal(null);
          setErroSinais('Não foi possível carregar os sinais vitais.');
        }
      }
    } catch (e) {
      if (e instanceof SessaoExpirada) {
        irParaLogin();
        return;
      }

      // 404 aqui significa: a consulta foi cancelada em outro lugar (outro
      // aparelho, a recepcao) ou nao e de quem esta logado. O lembrete
      // deste aparelho virou orfao -- cancela.
      if (e instanceof ErroDaApi && e.status === 404) {
        setNaoExiste(true);
        await cancelarLembrete(consultaId);
      } else if (e instanceof SemPermissao) {
        setErro(e.mensagem ?? 'Você não tem permissão para isso.');
      } else {
        setErro('Não foi possível carregar a consulta agora.');
      }
    } finally {
      setCarregando(false);
    }
  }, [consultaId, perfil]);

  // useFocusEffect: ao voltar da remarcacao ou do registro de sinais
  // vitais, a tela mostra o que esta no servidor, nao o que estava em
  // memoria.
  useFocusEffect(
    useCallback(() => {
      carregar();
    }, [carregar]),
  );

  const cancelarConsulta = async () => {
    setCancelando(true);

    try {
      // Primeiro o servidor: se o DELETE falhar, a consulta continua
      // existindo e o lembrete precisa continuar tambem.
      await excluirConsulta(consultaId);

      // O passo que todo mundo esquece. Sem ele, a consulta some mas o
      // aviso dispara -- e o paciente vai a clinica a toa.
      await cancelarLembrete(consultaId);

      Alert.alert(
        'Consulta cancelada',
        'A consulta e o lembrete foram cancelados.',
        [{ text: 'OK', onPress: () => navigation.goBack() }],
      );
    } catch (e) {
      if (e instanceof SessaoExpirada) {
        irParaLogin();
        return;
      }

      Alert.alert(
        'Não foi possível cancelar',
        e instanceof ErroDaApi && e.mensagem
          ? e.mensagem
          : 'Não foi possível cancelar a consulta agora.',
      );
    } finally {
      setCancelando(false);
    }
  };

  const confirmarCancelamento = () => {
    Alert.alert(
      'Cancelar consulta',
      'A consulta e o lembrete dela serão cancelados.',
      [
        { text: 'Voltar', style: 'cancel' },
        {
          text: 'Cancelar consulta',
          style: 'destructive',
          onPress: cancelarConsulta,
        },
      ],
    );
  };

  const renderSinaisVitais = (passou) => {
    if (perfil !== 'medico' && perfil !== 'paciente') return null;

    // Quem registra precisa saber de quem e o registro. Para o paciente
    // logado, e ele mesmo.
    const pacienteDoRegistro =
      perfil === 'paciente'
        ? { id: usuario.vinculoId, nome: usuario.nome }
        : paciente && { id: paciente.id, nome: paciente.nome };

    const podeRegistrar =
      Boolean(pacienteDoRegistro) && (perfil === 'medico' || !passou);

    return (
      <View style={styles.card}>
        <Text style={styles.cardTitulo}>Sinais vitais</Text>

        {erroSinais ? (
          <Text style={styles.texto}>{erroSinais}</Text>
        ) : ultimoSinal ? (
          <>
            <Text style={styles.valor}>{resumoDoSinal(ultimoSinal)}</Text>
            <Text style={styles.nota}>
              {formatarRegistro(ultimoSinal.registradoEm)}
            </Text>
          </>
        ) : (
          <Text style={styles.texto}>Nenhum registro para esta consulta.</Text>
        )}

        {podeRegistrar && (
          <TouchableOpacity
            style={[styles.botao, styles.botaoSecundario]}
            onPress={() =>
              navigation.navigate('SinaisVitais', {
                paciente: pacienteDoRegistro,
                consultaId,
              })
            }
          >
            <Text style={styles.botaoSecundarioTexto}>
              Registrar sinais vitais
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderAcoes = (passou, faltaMs) => {
    // Medico consulta a agenda; quem marca e desmarca e a recepcao ou o
    // proprio paciente.
    if (perfil === 'medico' || passou) return null;

    if (perfil === 'paciente' && faltaMs < ANTECEDENCIA_MINIMA_MS) {
      return (
        <Text style={styles.nota}>
          Faltam menos de 24 h. Para remarcar ou cancelar, ligue para a
          recepção: {CLINICA.telefone}.
        </Text>
      );
    }

    return (
      <>
        <TouchableOpacity
          style={styles.botao}
          onPress={() => navigation.navigate('Agendar', { consulta })}
          disabled={cancelando}
        >
          <Text style={styles.botaoTexto}>Remarcar</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.botao,
            styles.botaoPerigo,
            cancelando && styles.botaoDesabilitado,
          ]}
          onPress={confirmarCancelamento}
          disabled={cancelando}
        >
          <Text style={styles.botaoTexto}>
            {cancelando ? 'Cancelando...' : 'Cancelar consulta'}
          </Text>
        </TouchableOpacity>
      </>
    );
  };

  const renderConteudo = () => {
    if (carregando) {
      return (
        <ActivityIndicator
          color={colors.sage}
          style={styles.indicador}
        />
      );
    }

    if (naoExiste) {
      return (
        <View style={styles.card}>
          <Text style={styles.cardTitulo}>Esta consulta não existe mais</Text>
          <Text style={styles.texto}>
            Ela foi cancelada em outro lugar. O lembrete dela neste aparelho
            também foi cancelado.
          </Text>
        </View>
      );
    }

    if (erro) {
      return (
        <View style={styles.card}>
          <Text style={styles.erroTexto}>{erro}</Text>
          <TouchableOpacity style={styles.botao} onPress={carregar}>
            <Text style={styles.botaoTexto}>Tentar novamente</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (!consulta) return null;

    const quando = dataDaConsulta(consulta);
    const faltaMs = quando - new Date();
    const passou = faltaMs <= 0;

    return (
      <>
        <View style={styles.card}>
          <Text style={styles.rotulo}>Quando</Text>
          <Text style={styles.valor}>{formatarQuando(quando)}</Text>

          <Text style={styles.rotulo}>Médico</Text>
          <Text style={styles.valor}>{medico?.nome ?? '—'}</Text>
          {medico?.especialidade ? (
            <Text style={styles.nota}>{medico.especialidade}</Text>
          ) : null}

          {perfil !== 'paciente' && (
            <>
              <Text style={styles.rotulo}>Paciente</Text>
              <Text style={styles.valor}>{paciente?.nome ?? '—'}</Text>
            </>
          )}
        </View>

        {renderSinaisVitais(passou)}

        {renderAcoes(passou, faltaMs)}
      </>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Voltar"
          hitSlop={AREA_DE_TOQUE}
        >
          <Feather name="arrow-left" size={22} color={colors.ink} />
        </TouchableOpacity>
        <Text style={styles.title}>Consulta</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {renderConteudo()}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  title: { fontSize: 17, fontWeight: '700', color: colors.ink },
  headerSpacer: { width: 22 },

  content: { padding: 20, paddingBottom: 40 },
  indicador: { marginTop: 40 },

  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
  },
  cardTitulo: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.ink,
    marginBottom: 6,
  },
  rotulo: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.muted,
    marginTop: 10,
  },
  valor: { fontSize: 15, color: colors.ink, marginTop: 2 },
  nota: { fontSize: 13, color: colors.muted, marginTop: 4, lineHeight: 18 },
  texto: { fontSize: 14, color: colors.ink, lineHeight: 20 },
  erroTexto: { fontSize: 14, color: colors.danger, marginBottom: 6 },

  botao: {
    backgroundColor: colors.sage,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 10,
  },
  botaoSecundario: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: 14,
  },
  botaoSecundarioTexto: { color: colors.sage, fontWeight: '700', fontSize: 14 },
  botaoPerigo: { backgroundColor: colors.danger },
  botaoDesabilitado: { opacity: 0.6 },
  botaoTexto: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
