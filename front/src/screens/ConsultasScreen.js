import React, { useState, useCallback } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  SectionList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import {
  buscarConsultas,
  buscarPacientes,
  buscarMedicos,
  SessaoExpirada,
  SemPermissao,
} from '../services/api';
import {
  dataDaConsulta,
  formatarHora,
  listarLembretesAgendados,
  notificacoesPermitidas,
  sincronizarLembretes,
} from '../services/lembretes';
import { useUsuario } from '../services/sessao';
import { formatarDataCurta } from '../services/datas';
import { TITULO_CONSULTAS } from '../navigation/permissoes';

// Lista de consultas. O servidor ja devolve so as que o perfil pode ver:
// recepcao ve todas, medico a propria agenda, paciente as proprias.
// Para o paciente, mostra tambem quantos lembretes o aparelho tem
// agendados: e a conferencia de que cancelar consulta cancela lembrete.

// TODO: mover para front/src/theme quando o ThemeContext existir.
const colors = {
  bg: '#F5F5F2',
  surface: '#FFFFFF',
  border: '#E2E1DB',
  ink: '#4A5560',
  muted: '#8B909A',
  sage: '#4B7776',
  danger: '#B0555F',
  lavenderSoft: '#EFE9F3',
};

const AREA_DE_TOQUE = { top: 11, bottom: 11, left: 11, right: 11 };

const MAX_ANTERIORES = 20;

// "seg, 05/10 às 08:30"
function formatarQuando(data) {
  return `${formatarDataCurta(data)} às ${formatarHora(data)}`;
}

function mesmoDia(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

// Hoje e Proximas em ordem de chegada; Anteriores da mais recente para a
// mais antiga. Secao vazia nao aparece.
function montarSecoes(consultas) {
  const agora = new Date();
  const inicioDeHoje = new Date(
    agora.getFullYear(),
    agora.getMonth(),
    agora.getDate(),
  );
  const ordenadas = [...consultas].sort(
    (a, b) => dataDaConsulta(a) - dataDaConsulta(b),
  );

  const hoje = ordenadas.filter((c) => mesmoDia(dataDaConsulta(c), agora));
  const proximas = ordenadas.filter(
    (c) => dataDaConsulta(c) >= inicioDeHoje && !mesmoDia(dataDaConsulta(c), agora),
  );
  const anteriores = ordenadas
    .filter((c) => dataDaConsulta(c) < inicioDeHoje)
    .reverse()
    .slice(0, MAX_ANTERIORES);

  return [
    { title: 'Hoje', chave: 'hoje', data: hoje },
    { title: 'Próximas', chave: 'proximas', data: proximas },
    { title: 'Anteriores', chave: 'anteriores', data: anteriores },
  ].filter((secao) => secao.data.length > 0);
}

export default function ConsultasScreen({ navigation }) {
  const { usuario } = useUsuario();
  const perfil = usuario?.perfil;
  const ehPaciente = perfil === 'paciente';
  const podeAgendar = perfil === 'recepcao' || perfil === 'paciente';

  const [consultas, setConsultas] = useState([]);
  const [pacientes, setPacientes] = useState({});
  const [medicos, setMedicos] = useState({});
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);
  const [lembretesAgendados, setLembretesAgendados] = useState(null);
  const [permitido, setPermitido] = useState(true);

  // Estado dos lembretes no aparelho. Falhar aqui nao impede a lista.
  const conferirLembretes = useCallback(async () => {
    try {
      const [agendados, liberado] = await Promise.all([
        listarLembretesAgendados(),
        notificacoesPermitidas(),
      ]);
      setLembretesAgendados(agendados.length);
      setPermitido(liberado);
    } catch (e) {
      setLembretesAgendados(null);
    }
  }, []);

  const carregar = useCallback(async () => {
    if (!perfil) return;

    setCarregando(true);
    setErro(null);

    let lista = null;

    try {
      // Cada perfil busca so os nomes que mostra: o medico recebe so os
      // proprios pacientes; o paciente nao lista pacientes.
      const [listaConsultas, listaPacientes, listaMedicos] =
        await Promise.all([
          buscarConsultas(),
          perfil === 'paciente' ? [] : buscarPacientes(),
          perfil === 'medico' ? [] : buscarMedicos(),
        ]);

      // Mapas id -> cadastro: a consulta guarda so os ids.
      setPacientes(
        Object.fromEntries(listaPacientes.map((p) => [String(p.id), p])),
      );
      setMedicos(
        Object.fromEntries(listaMedicos.map((m) => [String(m.id), m])),
      );
      setConsultas(listaConsultas);
      lista = listaConsultas;
    } catch (e) {
      if (e instanceof SessaoExpirada) {
        navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
        return;
      }

      setErro(
        e instanceof SemPermissao
          ? e.mensagem ?? 'Você não tem permissão para isso.'
          : 'Não foi possível carregar as consultas.',
      );
    } finally {
      setCarregando(false);
    }

    if (perfil !== 'paciente') return;

    // So no aparelho do paciente: alinha os lembretes com o servidor sem
    // segurar a tela, e depois atualiza a contagem.
    if (lista) {
      sincronizarLembretes(lista).then(conferirLembretes);
    } else {
      conferirLembretes();
    }
  }, [navigation, perfil, conferirLembretes]);

  // useFocusEffect: ao voltar de agendar, remarcar ou cancelar, a lista e a
  // contagem de lembretes vem de novo do servidor e do sistema.
  useFocusEffect(
    useCallback(() => {
      carregar();
    }, [carregar]),
  );

  const nomeDoPaciente = (item) =>
    pacientes[String(item.pacienteId)]?.nome ?? 'Paciente';
  const medicoDa = (item) => medicos[String(item.medicoId)];

  const renderItem = ({ item, section }) => {
    const quando = dataDaConsulta(item);
    let linhas;

    if (perfil === 'medico') {
      linhas = [
        section.chave === 'hoje' ? formatarHora(quando) : formatarQuando(quando),
        nomeDoPaciente(item),
      ];
    } else if (perfil === 'paciente') {
      linhas = [
        formatarQuando(quando),
        medicoDa(item)?.nome ?? 'Médico',
        medicoDa(item)?.especialidade,
      ];
    } else {
      linhas = [
        formatarQuando(quando),
        nomeDoPaciente(item),
        medicoDa(item)?.nome ?? 'Médico',
      ];
    }

    const [principal, ...detalhes] = linhas.filter(Boolean);

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() =>
          navigation.navigate('DetalheConsulta', {
            consultaId: String(item.id),
          })
        }
      >
        <Text style={styles.quando}>{principal}</Text>
        {detalhes.map((texto, indice) => (
          <Text key={indice} style={styles.detalhe}>
            {texto}
          </Text>
        ))}
      </TouchableOpacity>
    );
  };

  const renderVazio = () => {
    const textos = {
      paciente: 'Você ainda não tem consultas.',
      medico: 'Nenhuma consulta na sua agenda.',
      recepcao: 'Nenhuma consulta agendada.',
    };

    return (
      <View style={styles.vazioBloco}>
        <Text style={styles.vazio}>{textos[perfil] ?? textos.recepcao}</Text>
        {podeAgendar && (
          <TouchableOpacity
            style={styles.botao}
            onPress={() => navigation.navigate('Agendar')}
          >
            <Text style={styles.botaoTexto}>Agendar consulta</Text>
          </TouchableOpacity>
        )}
      </View>
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
        <Text style={styles.title}>
          {TITULO_CONSULTAS[perfil] ?? 'Consultas'}
        </Text>
        {podeAgendar ? (
          <TouchableOpacity
            onPress={() => navigation.navigate('Agendar')}
            accessibilityRole="button"
            accessibilityLabel="Agendar consulta"
            hitSlop={AREA_DE_TOQUE}
          >
            <Feather name="plus" size={22} color={colors.ink} />
          </TouchableOpacity>
        ) : (
          <View style={styles.headerSpacer} />
        )}
      </View>

      {ehPaciente && !permitido && (
        // Sem permissao o lembrete falha em silencio. A tela precisa dizer.
        <View style={styles.aviso}>
          <Feather name="bell-off" size={14} color={colors.ink} />
          <Text style={styles.avisoTexto}>
            As notificações estão desativadas neste aparelho: nenhum lembrete
            de consulta vai aparecer. Ative nos ajustes do aparelho.
          </Text>
        </View>
      )}

      {carregando ? (
        <ActivityIndicator color={colors.sage} style={styles.indicador} />
      ) : erro ? (
        <View style={styles.centro}>
          <Text style={styles.erroTexto}>{erro}</Text>
          <TouchableOpacity style={styles.botao} onPress={carregar}>
            <Text style={styles.botaoTexto}>Tentar novamente</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <SectionList
          contentContainerStyle={styles.lista}
          sections={montarSecoes(consultas)}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          renderSectionHeader={({ section }) => (
            <Text style={styles.secao}>{section.title}</Text>
          )}
          stickySectionHeadersEnabled={false}
          ListEmptyComponent={renderVazio()}
          ListFooterComponent={
            ehPaciente &&
            lembretesAgendados !== null && (
              <Text style={styles.rodape}>
                Lembretes agendados neste aparelho: {lembretesAgendados}
              </Text>
            )
          }
        />
      )}
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

  aviso: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: colors.lavenderSoft,
    borderRadius: 10,
    padding: 12,
    marginHorizontal: 20,
    marginBottom: 8,
  },
  avisoTexto: { flex: 1, fontSize: 12, color: colors.ink, lineHeight: 17 },

  indicador: { marginTop: 40 },
  centro: { padding: 20 },
  lista: { padding: 20, paddingBottom: 40 },

  secao: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.muted,
    marginTop: 6,
    marginBottom: 10,
  },

  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
  },
  quando: { fontSize: 16, fontWeight: '700', color: colors.ink },
  detalhe: { fontSize: 13, color: colors.muted, marginTop: 4 },

  vazioBloco: { marginTop: 40 },
  vazio: { textAlign: 'center', color: colors.muted },
  rodape: {
    textAlign: 'center',
    fontSize: 12,
    color: colors.muted,
    marginTop: 16,
  },
  erroTexto: { fontSize: 14, color: colors.danger, marginBottom: 6 },

  botao: {
    backgroundColor: colors.sage,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 10,
  },
  botaoTexto: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
