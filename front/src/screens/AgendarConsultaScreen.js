import React, { useState, useEffect, useCallback } from 'react';
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
  buscarDisponibilidade,
  criarConsulta,
  atualizarConsulta,
  SessaoExpirada,
  ErroDaApi,
} from '../services/api';
import {
  agendarLembrete,
  dataDaConsulta,
  formatarHora,
} from '../services/lembretes';
import { useUsuario } from '../services/sessao';
import { nomeCurtoDoDia, formatarDataCurta } from '../services/datas';

// Agenda uma consulta nova ou remarca uma existente (route.params.consulta).
// So aparecem dias e horarios que o servidor diz estarem livres: ninguem
// digita data. Mesmo assim o servidor confere tudo de novo ao gravar -- o
// horario pode ter sido ocupado por outra pessoa no meio do caminho (409).
// O lembrete vem DEPOIS de o servidor confirmar, e so no aparelho do
// proprio paciente.

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

const AREA_DE_TOQUE = { top: 11, bottom: 11, left: 11, right: 11 };

// Tres semanas: o servidor devolve so os dias com horario livre.
const DIAS_DE_BUSCA = 21;

const MAX_RESULTADOS_PACIENTE = 6;

function formatarDiaMes(data) {
  const dia = String(data.getDate()).padStart(2, '0');
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  return `${dia}/${mes}`;
}

// "seg, 05/10 às 08:30"
function formatarEscolha(data, hora) {
  return `${formatarDataCurta(dataDaConsulta({ data, hora }))} às ${hora}`;
}

// Busca sem diferenciar maiusculas nem acentos ("joao" acha "João").
// normalize nao existe em todo motor JavaScript: sem ele, so ignora
// maiusculas.
function normalizar(texto) {
  const minusculo = String(texto ?? '').toLowerCase();

  try {
    return minusculo.normalize('NFD').replace(/[̀-ͯ]/g, '');
  } catch (e) {
    return minusculo;
  }
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

function Opcao({ texto, detalhe, selecionada, onPress }) {
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
      {detalhe ? <Text style={styles.opcaoDetalhe}>{detalhe}</Text> : null}
    </TouchableOpacity>
  );
}

function Chip({ selecionado, onPress, children }) {
  return (
    <TouchableOpacity
      style={[styles.chip, selecionado && styles.chipSelecionado]}
      onPress={onPress}
    >
      {children}
    </TouchableOpacity>
  );
}

export default function AgendarConsultaScreen({ navigation, route }) {
  // Presenca da consulta = remarcacao.
  const consulta = route.params?.consulta;

  const { usuario } = useUsuario();
  const perfil = usuario?.perfil;
  const ehRecepcao = perfil === 'recepcao';

  const [pacientes, setPacientes] = useState([]);
  const [medicos, setMedicos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erroCarga, setErroCarga] = useState(null);

  const [busca, setBusca] = useState('');
  const [pacienteId, setPacienteId] = useState(
    consulta ? String(consulta.pacienteId) : null,
  );
  const [especialidade, setEspecialidade] = useState(null);
  const [medicoId, setMedicoId] = useState(
    consulta ? String(consulta.medicoId) : null,
  );

  const [dias, setDias] = useState([]);
  const [carregandoDias, setCarregandoDias] = useState(false);
  const [erroDias, setErroDias] = useState(null);
  const [data, setData] = useState(null);
  const [hora, setHora] = useState(null);
  const [salvando, setSalvando] = useState(false);

  const irParaLogin = () => {
    navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
  };

  const carregarListas = useCallback(async () => {
    if (!perfil) return;

    setCarregando(true);
    setErroCarga(null);

    try {
      // Paciente nao escolhe paciente: nem pede a lista (o servidor
      // negaria, e ela nao e dele).
      const [listaMedicos, listaPacientes] = await Promise.all([
        buscarMedicos(),
        perfil === 'recepcao' ? buscarPacientes() : [],
      ]);
      setMedicos(listaMedicos);
      setPacientes(listaPacientes);
    } catch (e) {
      if (e instanceof SessaoExpirada) {
        irParaLogin();
        return;
      }

      setErroCarga(
        e instanceof ErroDaApi && e.mensagem
          ? e.mensagem
          : 'Não foi possível carregar os médicos.',
      );
    } finally {
      setCarregando(false);
    }
  }, [perfil]);

  useEffect(() => {
    carregarListas();
  }, [carregarListas]);

  const carregarDias = useCallback(async () => {
    if (!medicoId) return;

    setCarregandoDias(true);
    setErroDias(null);

    try {
      const livres = await buscarDisponibilidade(medicoId, {
        dias: DIAS_DE_BUSCA,
        ignorarConsultaId: consulta?.id,
      });
      setDias(livres);
    } catch (e) {
      if (e instanceof SessaoExpirada) {
        irParaLogin();
        return;
      }

      setDias([]);
      setErroDias(
        e instanceof ErroDaApi && e.mensagem
          ? e.mensagem
          : 'Não foi possível carregar os horários livres.',
      );
    } finally {
      setCarregandoDias(false);
    }
  }, [medicoId, consulta?.id]);

  useEffect(() => {
    carregarDias();
  }, [carregarDias]);

  const escolherMedico = (id) => {
    setMedicoId(id);
    setData(null);
    setHora(null);
  };

  const escolherDia = (texto) => {
    setData(texto);
    setHora(null);
  };

  // So as especialidades que tem medico: escolher uma sem ninguem para
  // atender levaria a pessoa a uma lista vazia. O filtro e pelo id; o nome
  // e o da tela de Especialidades, devolvido pela API junto com o medico.
  const especialidades = [
    ...new Map(
      medicos
        .filter((m) => m.especialidadeId && m.especialidade)
        .map((m) => [String(m.especialidadeId), m.especialidade]),
    ),
  ]
    .map(([id, nome]) => ({ id, nome }))
    .sort((a, b) => a.nome.localeCompare(b.nome));

  const medicosDaEspecialidade = especialidade
    ? medicos.filter((m) => String(m.especialidadeId) === especialidade)
    : medicos;

  const medico = medicos.find((m) => String(m.id) === String(medicoId));
  const pacienteEscolhido = pacientes.find(
    (p) => String(p.id) === String(pacienteId),
  );
  const diaEscolhido = dias.find((d) => d.data === data);

  const termo = normalizar(busca.trim());
  const digitos = busca.replace(/\D/g, '');
  const encontrados = pacientes
    .filter(
      (p) =>
        !termo ||
        normalizar(p.nome).includes(termo) ||
        (digitos && String(p.cpf ?? '').replace(/\D/g, '').includes(digitos)),
    )
    .slice(0, MAX_RESULTADOS_PACIENTE);

  const pronto =
    Boolean(medicoId && data && hora) && (!ehRecepcao || Boolean(pacienteId));

  const salvar = async () => {
    if (!pronto) return;

    // Paciente nao manda pacienteId: o servidor usa o dele.
    const dados = ehRecepcao
      ? { pacienteId, medicoId, data, hora }
      : { medicoId, data, hora };

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

      // Alguem ocupou o horario no meio do caminho: mostra o motivo e
      // traz a agenda atualizada.
      if (e instanceof ErroDaApi && e.status === 409) {
        Alert.alert(
          'Horário indisponível',
          e.mensagem ?? 'Escolha outro horário.',
        );
        setHora(null);
        carregarDias();
        return;
      }

      Alert.alert(
        'Não foi possível salvar',
        e instanceof ErroDaApi && e.mensagem
          ? e.mensagem
          : 'Não foi possível salvar a consulta agora.',
      );
      return;
    }

    const titulo = consulta ? 'Consulta remarcada' : 'Consulta agendada';

    // A recepcao agenda pelo aparelho da clinica: lembrete ali avisaria a
    // pessoa errada. O aparelho do paciente sincroniza quando ele abrir o
    // app.
    if (ehRecepcao) {
      setSalvando(false);
      Alert.alert(titulo, `${formatarEscolha(data, hora)}.`, [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
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

    Alert.alert(titulo, mensagem, [
      { text: 'OK', onPress: () => navigation.goBack() },
    ]);
  };

  const renderPaciente = () => {
    if (!ehRecepcao) return null;

    // Remarcacao muda data e hora, nunca de quem e a consulta.
    if (consulta) {
      return (
        <>
          <Text style={styles.secao}>Paciente</Text>
          <Opcao texto={pacienteEscolhido?.nome ?? 'Paciente'} selecionada />
        </>
      );
    }

    return (
      <>
        <Text style={styles.secao}>Paciente</Text>
        <TextInput
          style={styles.input}
          value={busca}
          onChangeText={setBusca}
          placeholder="Buscar paciente por nome ou CPF"
          placeholderTextColor={colors.muted}
          autoCorrect={false}
        />

        {pacienteEscolhido &&
          !encontrados.some((p) => String(p.id) === String(pacienteId)) && (
            <Opcao texto={pacienteEscolhido.nome} selecionada />
          )}

        {encontrados.map((p) => (
          <Opcao
            key={String(p.id)}
            texto={p.nome}
            detalhe={p.cpf ? `CPF ${p.cpf}` : null}
            selecionada={String(pacienteId) === String(p.id)}
            onPress={() => setPacienteId(String(p.id))}
          />
        ))}

        {encontrados.length === 0 && (
          <Text style={styles.nota}>
            Nenhum paciente encontrado. Confira o nome ou cadastre o paciente
            em Pacientes.
          </Text>
        )}
      </>
    );
  };

  const renderDias = () => {
    if (!medicoId) return null;

    if (carregandoDias) {
      return (
        <>
          <Text style={styles.secao}>Dia</Text>
          <ActivityIndicator color={colors.sage} style={styles.indicadorDias} />
        </>
      );
    }

    if (erroDias) {
      return (
        <>
          <Text style={styles.secao}>Dia</Text>
          <Text style={styles.erroTexto}>{erroDias}</Text>
          <TouchableOpacity style={styles.botao} onPress={carregarDias}>
            <Text style={styles.botaoTexto}>Tentar novamente</Text>
          </TouchableOpacity>
        </>
      );
    }

    if (dias.length === 0) {
      return (
        <>
          <Text style={styles.secao}>Dia</Text>
          <Text style={styles.nota}>
            {ehRecepcao
              ? 'Sem horários livres nas próximas 3 semanas. Escolha outro médico ou cadastre horários de atendimento.'
              : 'Sem horários livres nas próximas 3 semanas. Escolha outro médico.'}
          </Text>
        </>
      );
    }

    return (
      <>
        <Text style={styles.secao}>Dia</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}
        >
          {dias.map((d) => {
            const quando = dataDaConsulta({ data: d.data, hora: '00:00' });
            const selecionado = d.data === data;

            return (
              <Chip
                key={d.data}
                selecionado={selecionado}
                onPress={() => escolherDia(d.data)}
              >
                <Text
                  style={[styles.chipTopo, selecionado && styles.chipTextoSel]}
                >
                  {nomeCurtoDoDia(quando)}
                </Text>
                <Text
                  style={[styles.chipTexto, selecionado && styles.chipTextoSel]}
                >
                  {formatarDiaMes(quando)}
                </Text>
              </Chip>
            );
          })}
        </ScrollView>

        {diaEscolhido && (
          <>
            <Text style={styles.secao}>Horário</Text>
            <View style={styles.grade}>
              {diaEscolhido.horarios.map((h) => (
                <Chip
                  key={h}
                  selecionado={h === hora}
                  onPress={() => setHora(h)}
                >
                  <Text
                    style={[styles.chipTexto, h === hora && styles.chipTextoSel]}
                  >
                    {h}
                  </Text>
                </Chip>
              ))}
            </View>
          </>
        )}
      </>
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

    // Cada bloco aparece quando o anterior foi escolhido.
    const mostrarMedicos = !ehRecepcao || Boolean(pacienteId);

    return (
      <>
        {renderPaciente()}

        {mostrarMedicos && (
          <>
            <Text style={styles.secao}>Especialidade</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chips}
            >
              <Chip
                selecionado={especialidade === null}
                onPress={() => setEspecialidade(null)}
              >
                <Text
                  style={[
                    styles.chipTexto,
                    especialidade === null && styles.chipTextoSel,
                  ]}
                >
                  Todas
                </Text>
              </Chip>
              {especialidades.map((e) => (
                <Chip
                  key={e.id}
                  selecionado={especialidade === e.id}
                  onPress={() => setEspecialidade(e.id)}
                >
                  <Text
                    style={[
                      styles.chipTexto,
                      especialidade === e.id && styles.chipTextoSel,
                    ]}
                  >
                    {e.nome}
                  </Text>
                </Chip>
              ))}
            </ScrollView>

            <Text style={styles.secao}>Médico</Text>
            {medicosDaEspecialidade.length === 0 && (
              <Text style={styles.nota}>
                Nenhum médico nesta especialidade.
              </Text>
            )}
            {medicosDaEspecialidade.map((m) => (
              <Opcao
                key={String(m.id)}
                texto={m.nome}
                detalhe={m.especialidade}
                selecionada={String(medicoId) === String(m.id)}
                onPress={() => escolherMedico(String(m.id))}
              />
            ))}
          </>
        )}

        {mostrarMedicos && renderDias()}

        {pronto && (
          <View style={styles.resumo}>
            <Text style={styles.resumoMedico}>
              {medico?.especialidade
                ? `${medico.nome}, ${medico.especialidade}`
                : medico?.nome}
            </Text>
            <Text style={styles.resumoQuando}>{formatarEscolha(data, hora)}</Text>
          </View>
        )}

        {!ehRecepcao && (
          <Text style={styles.nota}>
            Um lembrete é agendado neste aparelho uma hora antes da consulta.
          </Text>
        )}

        <TouchableOpacity
          style={[
            styles.botao,
            (!pronto || salvando) && styles.botaoDesabilitado,
          ]}
          onPress={salvar}
          disabled={!pronto || salvando}
        >
          <Text style={styles.botaoTexto}>
            {salvando
              ? 'Salvando...'
              : consulta
                ? 'Confirmar remarcação'
                : 'Confirmar agendamento'}
          </Text>
        </TouchableOpacity>
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
        <Text style={styles.title}>
          {consulta ? 'Remarcar consulta' : 'Agendar consulta'}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
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
  indicadorDias: { marginVertical: 12 },

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
  opcaoDetalhe: { fontSize: 12, color: colors.muted, marginTop: 2 },

  chips: { gap: 8, paddingBottom: 4 },
  grade: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    minWidth: 64,
    minHeight: 44,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipSelecionado: {
    backgroundColor: colors.sageSoft,
    borderColor: colors.sage,
  },
  chipTopo: { fontSize: 11, color: colors.muted },
  chipTexto: { fontSize: 14, color: colors.ink, fontWeight: '600' },
  chipTextoSel: { color: colors.sage },

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

  resumo: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 16,
    marginTop: 18,
  },
  resumoMedico: { fontSize: 15, fontWeight: '700', color: colors.ink },
  resumoQuando: { fontSize: 14, color: colors.sage, marginTop: 4 },

  nota: { fontSize: 12, color: colors.muted, marginTop: 8, lineHeight: 17 },
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
