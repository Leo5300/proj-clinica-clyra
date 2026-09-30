import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import {
  buscarPacientes,
  buscarMedicos,
  criarConsulta,
  atualizarConsulta,
  SessaoExpirada,
} from '../services/api';
import {
  agendarLembrete,
  dataDaConsulta,
  formatarHora,
} from '../services/lembretes';

// Agenda uma consulta nova ou remarca uma existente (route.params.consulta).
// Nos dois casos o lembrete vem DEPOIS de o servidor confirmar: agendar
// antes criaria aviso de uma consulta que talvez nem tenha sido gravada.

// TODO: mover para front/src/theme quando o ThemeContext existir.
const colors = {
  bg: '#F5F5F2',
  surface: '#FFFFFF',
  border: '#E2E1DB',
  ink: '#4A5560',
  muted: '#8B909A',
  sage: '#4B7776',
  sageSoft: '#E4EEEC',
  danger: '#B0555F',
};

function formatarDiaMes(data) {
  const dia = String(data.getDate()).padStart(2, '0');
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  return `${dia}/${mes}`;
}

// A mensagem promete so o que vai acontecer de verdade.
function mensagemDoLembrete(resultado) {
  if (resultado.motivo === 'passado') {
    return 'A consulta é em menos de uma hora, então não haverá lembrete.';
  }

  if (resultado.motivo === 'sem-permissao') {
    return 'As notificações estão desativadas neste aparelho, então não haverá lembrete. Ative nos ajustes para receber avisos.';
  }

  const quando = resultado.horarioLembrete;
  return `Lembrete agendado para ${formatarDiaMes(quando)} às ${formatarHora(quando)}.`;
}

function Opcao({ texto, selecionada, onPress }) {
  return (
    <TouchableOpacity
      style={[styles.opcao, selecionada && styles.opcaoSelecionada]}
      onPress={onPress}
    >
      <Text
        style={[styles.opcaoTexto, selecionada && styles.opcaoTextoSelecionado]}
      >
        {texto}
      </Text>
    </TouchableOpacity>
  );
}

export default function AgendarConsultaScreen({ navigation, route }) {
  // Presenca da consulta = remarcacao.
  const consulta = route.params?.consulta;

  const [pacientes, setPacientes] = useState([]);
  const [medicos, setMedicos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erroCarga, setErroCarga] = useState(null);

  const [pacienteId, setPacienteId] = useState(
    consulta ? String(consulta.pacienteId) : null,
  );
  const [medicoId, setMedicoId] = useState(
    consulta ? String(consulta.medicoId) : null,
  );
  const [data, setData] = useState(consulta?.data ?? '');
  const [hora, setHora] = useState(consulta?.hora ?? '');
  const [salvando, setSalvando] = useState(false);

  const irParaLogin = () => {
    navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
  };

  const carregarListas = async () => {
    setCarregando(true);
    setErroCarga(null);

    try {
      const [listaPacientes, listaMedicos] = await Promise.all([
        buscarPacientes(),
        buscarMedicos(),
      ]);
      setPacientes(listaPacientes);
      setMedicos(listaMedicos);
    } catch (e) {
      if (e instanceof SessaoExpirada) {
        irParaLogin();
        return;
      }
      setErroCarga('Não foi possível carregar pacientes e médicos.');
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregarListas();
  }, []);

  const validar = () => {
    if (!pacienteId || !medicoId) {
      Alert.alert('Campos obrigatórios', 'Escolha o paciente e o médico.');
      return false;
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(data) || !/^\d{2}:\d{2}$/.test(hora)) {
      Alert.alert(
        'Data ou hora inválida',
        'Use a data no formato AAAA-MM-DD e a hora no formato HH:MM.',
      );
      return false;
    }

    const quando = dataDaConsulta({ data, hora });
    const [ano, mes, dia] = data.split('-').map(Number);
    const [h, m] = hora.split(':').map(Number);

    // new Date aceita 2026-02-31 e "corrige" para marco. Conferir de volta
    // os campos pega data que nao existe no calendario.
    const existe =
      quando.getFullYear() === ano &&
      quando.getMonth() === mes - 1 &&
      quando.getDate() === dia &&
      quando.getHours() === h &&
      quando.getMinutes() === m;

    if (!existe) {
      Alert.alert('Data ou hora inválida', 'Essa data ou hora não existe.');
      return false;
    }

    if (quando <= new Date()) {
      Alert.alert('Horário no passado', 'Escolha um horário futuro.');
      return false;
    }

    return true;
  };

  const salvar = async () => {
    if (!validar()) return;

    const dados = { pacienteId, medicoId, data, hora };

    setSalvando(true);

    let consultaSalva;

    try {
      // 1) Servidor primeiro. So o que ele confirma existe para a clinica.
      const resposta = consulta
        ? await atualizarConsulta(consulta.id, dados)
        : await criarConsulta(dados);

      // O id vem do servidor, nunca do app.
      consultaSalva = {
        ...dados,
        ...resposta,
        id: resposta?.id ?? consulta?.id,
      };
    } catch (e) {
      setSalvando(false);

      if (e instanceof SessaoExpirada) {
        irParaLogin();
        return;
      }

      Alert.alert('Erro', 'Não foi possível salvar a consulta agora.');
      return;
    }

    // 2) So depois o lembrete. Na remarcacao, agendarLembrete ja cancela o
    // anterior: chega um aviso, nunca dois.
    let mensagem;
    try {
      const resultado = await agendarLembrete(consultaSalva);
      mensagem = mensagemDoLembrete(resultado);
    } catch (e) {
      mensagem = 'Não foi possível agendar o lembrete neste aparelho.';
    }

    setSalvando(false);

    Alert.alert(
      consulta ? 'Consulta remarcada' : 'Consulta agendada',
      mensagem,
      [{ text: 'OK', onPress: () => navigation.goBack() }],
    );
  };

  const renderFormulario = () => {
    if (carregando) {
      return <ActivityIndicator color={colors.sage} style={styles.indicador} />;
    }

    if (erroCarga) {
      return (
        <View>
          <Text style={styles.erroTexto}>{erroCarga}</Text>
          <TouchableOpacity style={styles.botao} onPress={carregarListas}>
            <Text style={styles.botaoTexto}>Tentar novamente</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <>
        <Text style={styles.secao}>Paciente</Text>
        {pacientes.length === 0 && (
          <Text style={styles.nota}>Nenhum paciente cadastrado.</Text>
        )}
        {pacientes.map((p) => (
          <Opcao
            key={String(p.id)}
            texto={p.nome}
            selecionada={pacienteId === String(p.id)}
            onPress={() => setPacienteId(String(p.id))}
          />
        ))}

        <Text style={styles.secao}>Médico</Text>
        {medicos.map((m) => (
          <Opcao
            key={String(m.id)}
            texto={m.especialidade ? `${m.nome} — ${m.especialidade}` : m.nome}
            selecionada={medicoId === String(m.id)}
            onPress={() => setMedicoId(String(m.id))}
          />
        ))}

        <Text style={styles.secao}>Data e hora</Text>

        <Text style={styles.label}>Data</Text>
        <TextInput
          style={styles.input}
          value={data}
          onChangeText={setData}
          placeholder="AAAA-MM-DD"
          placeholderTextColor={colors.muted}
          maxLength={10}
        />

        <Text style={styles.label}>Hora</Text>
        <TextInput
          style={styles.input}
          value={hora}
          onChangeText={setHora}
          placeholder="HH:MM"
          placeholderTextColor={colors.muted}
          maxLength={5}
        />

        <Text style={styles.nota}>
          Um lembrete é agendado neste aparelho uma hora antes da consulta.
        </Text>

        <TouchableOpacity
          style={[styles.botao, salvando && styles.botaoDesabilitado]}
          onPress={salvar}
          disabled={salvando}
        >
          <Text style={styles.botaoTexto}>
            {salvando
              ? 'Salvando...'
              : consulta
                ? 'Remarcar consulta'
                : 'Agendar consulta'}
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
        <Text style={styles.title}>
          {consulta ? 'Remarcar consulta' : 'Agendar consulta'}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {renderFormulario()}
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

  secao: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: colors.muted,
    marginTop: 18,
    marginBottom: 8,
  },

  opcao: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 8,
  },
  opcaoSelecionada: {
    backgroundColor: colors.sageSoft,
    borderColor: colors.sage,
  },
  opcaoTexto: { fontSize: 14, color: colors.ink },
  opcaoTextoSelecionado: { fontWeight: '700', color: colors.sage },

  label: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.muted,
    marginBottom: 6,
    marginTop: 4,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: colors.ink,
    marginBottom: 10,
  },

  nota: { fontSize: 12, color: colors.muted, marginTop: 4, lineHeight: 17 },
  erroTexto: { fontSize: 14, color: colors.danger, marginBottom: 6 },

  botao: {
    backgroundColor: colors.sage,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 16,
  },
  botaoDesabilitado: { opacity: 0.6 },
  botaoTexto: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
