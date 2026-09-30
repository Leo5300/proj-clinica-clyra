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
  get,
  SessaoExpirada,
} from '../services/api';
import {
  cancelarLembrete,
  dataDaConsulta,
  formatarHora,
} from '../services/lembretes';

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

function formatarDataLonga(data) {
  const dia = String(data.getDate()).padStart(2, '0');
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  return `${dia}/${mes}/${data.getFullYear()} às ${formatarHora(data)}`;
}

export default function DetalheConsultaScreen({ navigation, route }) {
  const consultaId = route.params?.consultaId;

  const [consulta, setConsulta] = useState(null);
  const [paciente, setPaciente] = useState(null);
  const [medico, setMedico] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);
  const [naoExiste, setNaoExiste] = useState(false);
  const [cancelando, setCancelando] = useState(false);

  const irParaLogin = () => {
    navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
  };

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    setNaoExiste(false);

    try {
      const dados = await buscarConsulta(consultaId);
      setConsulta(dados);

      // Nomes buscados a parte: a consulta guarda so os ids.
      const [pacienteDados, medicos] = await Promise.all([
        get(`/pacientes/${dados.pacienteId}`).catch(() => null),
        buscarMedicos().catch(() => []),
      ]);

      setPaciente(pacienteDados);
      setMedico(
        medicos.find((m) => String(m.id) === String(dados.medicoId)) ?? null,
      );
    } catch (e) {
      if (e instanceof SessaoExpirada) {
        irParaLogin();
        return;
      }

      // api.js lanca "Erro 404 ..." quando o registro nao existe. Aqui isso
      // significa: a consulta foi cancelada em outro lugar (outro aparelho,
      // a recepcao). O lembrete deste aparelho virou orfao -- cancela.
      if (String(e.message).includes('404')) {
        setNaoExiste(true);
        await cancelarLembrete(consultaId);
      } else {
        setErro('Não foi possível carregar a consulta agora.');
      }
    } finally {
      setCarregando(false);
    }
  }, [consultaId]);

  // useFocusEffect: ao voltar da remarcacao, a tela mostra a data nova
  // vinda do servidor, nao a que estava em memoria.
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

      Alert.alert('Erro', 'Não foi possível cancelar a consulta agora.');
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

    return (
      <>
        <View style={styles.card}>
          <Text style={styles.rotulo}>Quando</Text>
          <Text style={styles.valor}>
            {formatarDataLonga(dataDaConsulta(consulta))}
          </Text>

          <Text style={styles.rotulo}>Paciente</Text>
          <Text style={styles.valor}>{paciente?.nome ?? '—'}</Text>

          <Text style={styles.rotulo}>Médico</Text>
          <Text style={styles.valor}>{medico?.nome ?? '—'}</Text>
        </View>

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

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
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
  texto: { fontSize: 14, color: colors.ink, lineHeight: 20 },
  erroTexto: { fontSize: 14, color: colors.danger, marginBottom: 6 },

  botao: {
    backgroundColor: colors.sage,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 10,
  },
  botaoPerigo: { backgroundColor: colors.danger },
  botaoDesabilitado: { opacity: 0.6 },
  botaoTexto: { color: '#fff', fontWeight: '700', fontSize: 14 },
});