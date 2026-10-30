import React, { useState, useEffect, useCallback } from 'react';
import { BackHandler, ScrollView, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
import {
  nomeCurtoDoDia,
  formatarDiaEMes,
  formatarDiaEHora,
  faixaDeMeses,
  formatarFaixa,
  nomeDoMes,
  DURACAO_CONSULTA_MIN,
} from '../services/datas';
import {
  Avatar,
  BilheteConsulta,
  Botao,
  Cabecalho,
  Campo,
  Chip,
  ComVidro,
  Esqueleto,
  EstadoErro,
  EstadoVazio,
  FiltroArea,
  FolhaDecisao,
  ItemDeLista,
  PlanoTopo,
  Pressionavel,
  EtiquetaArea,
  SeloSucesso,
  Texto,
  Vidro,
  useRolagem,
} from '../components';
import {
  useTema,
  espaco,
  margemTela,
  raio,
  toque,
  corDaArea,
  planoDaArea,
  planoDoPaciente,
} from '../theme';
import { vibrarAviso } from '../services/haptica';
import { especialidadeERegistro } from '../services/profissionais';

// Agenda uma consulta nova ou remarca uma existente (route.params.consulta).
// Dois passos: 1) com quem (area e profissional); 2) dia e horario.
// So aparecem dias e horarios que o servidor diz estarem livres: ninguem
// digita data. Mesmo assim o servidor confere tudo de novo ao gravar -- o
// horario pode ter sido ocupado por outra pessoa no meio do caminho (409).
// O lembrete vem DEPOIS de o servidor confirmar, e so no aparelho do
// proprio paciente.

// Tres semanas: o servidor devolve so os dias com horario livre.
const DIAS_DE_BUSCA = 21;

const MAX_RESULTADOS_PACIENTE = 6;

// Horarios por linha na grade do passo 2.
const COLUNAS = 3;

// Valor do filtro sem area escolhida.
const TODAS = 'todas';

function formatarDiaMes(data) {
  const dia = String(data.getDate()).padStart(2, '0');
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  return `${dia}/${mes}`;
}

// "Ter, 3 nov às 14:30"
function formatarEscolha(data, hora) {
  return `${formatarDiaEMes(dataDaConsulta({ data, hora }))} às ${hora}`;
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


// Topo do fluxo: a mesma cor do comeco ao fim (verde para o paciente,
// lavanda para a recepcao). A area so colore etiquetas, barras e filtros.
function TopoDoPasso({ etapa, titulo, subtitulo, plano, children }) {
  const insets = useSafeAreaInsets();

  return (
    <PlanoTopo
      fundo={plano.fundo}
      corTexto={plano.texto}
      style={{
        paddingTop: insets.top + espaco.xs,
        paddingHorizontal: margemTela + 2,
        paddingBottom: espaco.lg,
        gap: 4,
      }}
    >
      <View
        style={{
          minHeight: toque.minimo,
          alignItems: 'flex-end',
          justifyContent: 'center',
          marginBottom: espaco.sm,
        }}
      >
        {etapa ? (
          <Texto variante="rotuloForte" cor={plano.texto}>
            Passo {etapa} de 3
          </Texto>
        ) : null}
      </View>
      <Texto variante="tituloGrande" cor={plano.texto} accessibilityRole="header">
        {titulo}
      </Texto>
      {subtitulo ? (
        <Texto variante="rotulo" cor={plano.texto2}>
          {subtitulo}
        </Texto>
      ) : null}
      {children}
    </PlanoTopo>
  );
}

function Rotulo({ children, direita }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
      <Texto variante="secao" accessibilityRole="header">
        {children}
      </Texto>
      {direita ? (
        <Texto variante="legenda" cor="apoio">
          {direita}
        </Texto>
      ) : null}
    </View>
  );
}

function CartaoProfissional({ medico, proximo, onPress }) {
  const { cores } = useTema();

  return (
    <Pressionavel
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Escolher ${medico.nome}`}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        padding: espaco.md,
        paddingLeft: espaco.md + 6,
        borderRadius: raio.cartao,
        borderCurve: 'continuous',
        backgroundColor: cores.superficie,
        borderWidth: 1,
        borderColor: cores.linha,
        overflow: 'hidden',
      }}
    >
      <View
        style={{
          position: 'absolute',
          left: 10,
          top: 14,
          bottom: 14,
          width: 4,
          borderRadius: 2,
          backgroundColor: corDaArea(medico.area, cores),
        }}
      />
      <Avatar nome={medico.nome} fotoUri={medico.fotoUri} tamanho={52} />
      <View style={{ flex: 1, gap: 3 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: espaco.xs }}>
          <Texto variante="corpoForte">{medico.nome}</Texto>
          <EtiquetaArea area={medico.area} />
        </View>
        {especialidadeERegistro(medico) ? (
          <Texto variante="legenda" cor="apoio">
            {especialidadeERegistro(medico)}
          </Texto>
        ) : null}
        {proximo === undefined ? (
          <Esqueleto largura={150} altura={14} raio={4} style={{ marginTop: 2 }} />
        ) : proximo ? (
          <Texto variante="legendaForte" cor="link" tabular>
            Próximo livre: {formatarDiaEHora(dataDaConsulta(proximo))}
          </Texto>
        ) : (
          <Texto variante="legenda" cor="apoio">
            Sem horários livres nas próximas 3 semanas
          </Texto>
        )}
      </View>
      <Feather name="chevron-right" size={20} color={cores.apoio} />
    </Pressionavel>
  );
}

export default function AgendarConsultaScreen({ navigation, route }) {
  // Presenca da consulta = remarcacao.
  const consulta = route.params?.consulta;

  const { usuario } = useUsuario();
  const { cores } = useTema();
  const insets = useSafeAreaInsets();
  const { aoRolar, rolou } = useRolagem(60);

  const perfil = usuario?.perfil;
  const ehRecepcao = perfil === 'recepcao';

  // Remarcacao ja sabe com quem: comeca no horario.
  const [passo, setPasso] = useState(consulta ? 2 : 1);

  const [pacientes, setPacientes] = useState([]);
  const [medicos, setMedicos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erroCarga, setErroCarga] = useState(null);
  // id do medico -> primeiro horario livre ({ data, hora }), null se nao
  // ha, ausente enquanto carrega.
  const [proximos, setProximos] = useState({});

  const [busca, setBusca] = useState('');
  const [pacienteId, setPacienteId] = useState(
    consulta ? String(consulta.pacienteId) : null,
  );
  const [area, setArea] = useState(TODAS);
  const [medicoId, setMedicoId] = useState(
    consulta ? String(consulta.medicoId) : null,
  );

  const [dias, setDias] = useState([]);
  const [carregandoDias, setCarregandoDias] = useState(false);
  const [erroDias, setErroDias] = useState(null);
  const [data, setData] = useState(null);
  const [hora, setHora] = useState(null);
  const [salvando, setSalvando] = useState(false);

  // { hora, mensagem, sugestao } quando o servidor recusou.
  const [conflito, setConflito] = useState(null);
  const [folhaConflito, setFolhaConflito] = useState(false);
  // { titulo, texto, consultaId } depois de gravar.
  const [sucesso, setSucesso] = useState(null);

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
          : 'Não foi possível carregar os profissionais.',
      );
    } finally {
      setCarregando(false);
    }
  }, [perfil]);

  useEffect(() => {
    carregarListas();
  }, [carregarListas]);

  // Primeiro horario livre de cada profissional, para o passo 1. Falhar
  // aqui so esconde a linha: a escolha continua possivel.
  useEffect(() => {
    if (medicos.length === 0) return undefined;

    let ativo = true;

    medicos.forEach((m) => {
      buscarDisponibilidade(m.id, { dias: DIAS_DE_BUSCA })
        .then((livres) => {
          const dia = livres.find((d) => d.horarios?.length > 0);
          const proximo = dia ? { data: dia.data, hora: dia.horarios[0] } : null;
          if (ativo) setProximos((atuais) => ({ ...atuais, [String(m.id)]: proximo }));
        })
        .catch(() => {
          if (ativo) setProximos((atuais) => ({ ...atuais, [String(m.id)]: null }));
        });
    });

    return () => {
      ativo = false;
    };
  }, [medicos]);

  const carregarDias = useCallback(async () => {
    if (!medicoId) return [];

    setCarregandoDias(true);
    setErroDias(null);

    try {
      const livres = await buscarDisponibilidade(medicoId, {
        dias: DIAS_DE_BUSCA,
        ignorarConsultaId: consulta?.id,
      });
      setDias(livres);
      return livres;
    } catch (e) {
      if (e instanceof SessaoExpirada) {
        irParaLogin();
        return [];
      }

      setDias([]);
      setErroDias(
        e instanceof ErroDaApi && e.mensagem
          ? e.mensagem
          : 'Não foi possível carregar os horários livres.',
      );
      return [];
    } finally {
      setCarregandoDias(false);
    }
  }, [medicoId, consulta?.id]);

  useEffect(() => {
    carregarDias();
  }, [carregarDias]);

  // Voltar do Android no passo 2 volta ao passo 1, nao sai da tela.
  useEffect(() => {
    if (passo !== 2 || consulta || sucesso) return undefined;

    const inscricao = BackHandler.addEventListener('hardwareBackPress', () => {
      setPasso(1);
      return true;
    });

    return () => inscricao.remove();
  }, [passo, consulta, sucesso]);

  const escolherMedico = (id) => {
    setMedicoId(id);
    setData(null);
    setHora(null);
    setConflito(null);
    setPasso(2);
  };

  const escolherDia = (texto) => {
    setData(texto);
    setHora(null);
  };

  const voltar = () => {
    if (passo === 2 && !consulta && !sucesso) {
      setPasso(1);
      return;
    }
    navigation.goBack();
  };

  // So as areas que tem profissional, como a API devolve (sem lista fixa):
  // escolher uma area sem ninguem levaria a uma lista vazia.
  const areas = [...new Set(medicos.map((m) => m.area).filter(Boolean))].sort(
    (a, b) => a.localeCompare(b),
  );

  const medicosDaArea =
    area === TODAS ? medicos : medicos.filter((m) => m.area === area);

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
    setConflito(null);

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

      // Alguem ocupou o horario no meio do caminho: mostra qual, traz a
      // agenda atualizada e sugere o livre mais perto.
      if (e instanceof ErroDaApi && e.status === 409) {
        vibrarAviso();
        const ocupado = hora;
        setHora(null);
        const livres = await carregarDias();
        const doDia = livres.find((d) => d.data === data);
        const outroDia = livres.find((d) => d.horarios?.length > 0);
        let sugestao = null;
        if (doDia?.horarios?.length > 0) {
          sugestao = {
            data,
            hora: doDia.horarios.find((h) => h > ocupado) ?? doDia.horarios[0],
          };
        } else if (outroDia) {
          sugestao = { data: outroDia.data, hora: outroDia.horarios[0] };
        }
        setConflito({ hora: ocupado, mensagem: e.mensagem, sugestao });
        setFolhaConflito(true);
        return;
      }

      setConflito({
        hora: null,
        mensagem:
          e instanceof ErroDaApi && e.mensagem
            ? e.mensagem
            : 'Não foi possível salvar a consulta agora.',
        sugestao: null,
      });
      return;
    }

    const titulo = consulta ? 'Consulta remarcada' : 'Consulta agendada';

    // A recepcao agenda pelo aparelho da clinica: lembrete ali avisaria a
    // pessoa errada. O aparelho do paciente sincroniza quando ele abrir o
    // app.
    if (ehRecepcao) {
      setSalvando(false);
      setSucesso({
        titulo,
        texto: `${formatarEscolha(data, hora)}.`,
        consultaId: String(consultaSalva.id),
      });
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
    setSucesso({
      titulo,
      texto: `${formatarEscolha(data, hora)}. ${mensagem}`,
      consultaId: String(consultaSalva.id),
    });
  };

  const agendarOutra = () => {
    setSucesso(null);
    setMedicoId(null);
    setData(null);
    setHora(null);
    setConflito(null);
    if (ehRecepcao) setPacienteId(null);
    setPasso(1);
  };

  const ficarComSugestao = () => {
    const sugestao = conflito?.sugestao;
    setFolhaConflito(false);
    if (!sugestao) return;
    setData(sugestao.data);
    setHora(sugestao.hora);
  };

  const renderPaciente = () => {
    if (!ehRecepcao) return null;

    // Remarcacao muda data e hora, nunca de quem e a consulta.
    if (consulta) {
      return (
        <View style={{ gap: espaco.xs }}>
          <Rotulo>Paciente</Rotulo>
          <ItemDeLista titulo={pacienteEscolhido?.nome ?? 'Paciente'} divisor={false} />
        </View>
      );
    }

    return (
      <View style={{ gap: espaco.xs }}>
        <Rotulo>Para quem é a consulta?</Rotulo>
        <Campo
          value={busca}
          onChangeText={setBusca}
          placeholder="Buscar paciente por nome ou CPF"
          accessibilityLabel="Buscar paciente"
          autoCorrect={false}
        />

        {pacienteEscolhido &&
          !encontrados.some((p) => String(p.id) === String(pacienteId)) && (
            <ItemDeLista
              titulo={pacienteEscolhido.nome}
              corDoTitulo="link"
              direita={<Feather name="check" size={20} color={cores.link} />}
            />
          )}

        {encontrados.map((p) => {
          const escolhido = String(pacienteId) === String(p.id);
          return (
            <ItemDeLista
              key={String(p.id)}
              titulo={p.nome}
              subtitulo={p.cpf ? `CPF ${p.cpf}` : null}
              corDoTitulo={escolhido ? 'link' : 'tinta'}
              direita={
                escolhido ? <Feather name="check" size={20} color={cores.link} /> : null
              }
              accessibilityLabel={`Escolher ${p.nome}`}
              onPress={() => setPacienteId(String(p.id))}
            />
          );
        })}

        {encontrados.length === 0 && (
          <Texto variante="legenda" cor="apoio">
            Nenhum paciente encontrado. Confira o nome ou cadastre o paciente
            em Pacientes.
          </Texto>
        )}
      </View>
    );
  };

  const renderPasso1 = () => {
    const mostrarMedicos = !ehRecepcao || Boolean(pacienteId);

    return (
      <>
        {renderPaciente()}

        {mostrarMedicos && (
          <View style={{ gap: espaco.sm }}>
            {ehRecepcao ? <Rotulo>Profissional</Rotulo> : null}

            {areas.length > 1 ? (
              <FiltroArea areas={areas} valor={area} aoMudar={setArea} />
            ) : null}

            {medicosDaArea.length === 0 ? (
              <EstadoVazio
                titulo="Nenhum profissional aqui"
                texto="Não há profissional nesta área. Escolha outra."
              />
            ) : (
              medicosDaArea.map((m) => (
                <CartaoProfissional
                  key={String(m.id)}
                  medico={m}
                  proximo={proximos[String(m.id)]}
                  onPress={() => escolherMedico(String(m.id))}
                />
              ))
            )}
          </View>
        )}
      </>
    );
  };

  const renderHorarios = () => {
    if (carregandoDias) {
      return (
        <View style={{ gap: espaco.sm }} accessibilityState={{ busy: true }}>
          <View style={{ flexDirection: 'row', gap: espaco.xs }}>
            {[0, 1, 2, 3, 4].map((i) => (
              <Esqueleto key={i} largura={56} altura={60} raio={raio.campo} />
            ))}
          </View>
          <Esqueleto altura={100} raio={raio.campo} />
        </View>
      );
    }

    if (erroDias) {
      return <EstadoErro texto={erroDias} aoTentar={carregarDias} />;
    }

    if (dias.length === 0) {
      return (
        <EstadoVazio
          titulo="Sem horários livres"
          texto={
            ehRecepcao
              ? 'Nada livre nas próximas 3 semanas. Escolha outro profissional ou cadastre horários de atendimento.'
              : 'Nada livre nas próximas 3 semanas. Escolha outro profissional.'
          }
          acao={consulta ? null : { titulo: 'Trocar profissional', onPress: () => setPasso(1) }}
        />
      );
    }

    const datas = dias.map((d) => dataDaConsulta({ data: d.data, hora: '00:00' }));
    const manha = diaEscolhido?.horarios.filter((h) => h < '12:00') ?? [];
    const tarde = diaEscolhido?.horarios.filter((h) => h >= '12:00') ?? [];

    // Tres por linha; a ultima linha completa com espacos vazios para os
    // horarios nao esticarem.
    const grade = (rotulo, lista) => {
      if (lista.length === 0) return null;
      const linhas = [];
      for (let i = 0; i < lista.length; i += COLUNAS) {
        linhas.push(lista.slice(i, i + COLUNAS));
      }

      return (
        <View style={{ gap: espaco.xs }}>
          <Texto variante="rotulo" cor="apoio">
            {rotulo}
          </Texto>
          {linhas.map((linha) => (
            <View key={linha[0]} style={{ flexDirection: 'row', gap: espaco.xs }}>
              {linha.map((h) => (
                <Chip
                  key={h}
                  rotulo={h}
                  selecionado={h === hora}
                  onPress={() => setHora(h)}
                  style={{ flex: 1 }}
                />
              ))}
              {Array.from({ length: COLUNAS - linha.length }, (_, i) => (
                <View key={`vazio-${i}`} style={{ flex: 1 }} />
              ))}
            </View>
          ))}
        </View>
      );
    };

    return (
      <>
        <View style={{ gap: espaco.sm }}>
          <Rotulo direita={faixaDeMeses(datas)}>Dia</Rotulo>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: espaco.xs, paddingHorizontal: margemTela + 2 }}
            style={{ marginHorizontal: -(margemTela + 2) }}
          >
            {dias.map((d, i) => (
              <Chip
                key={d.data}
                detalhe={nomeCurtoDoDia(datas[i])}
                rotulo={String(datas[i].getDate())}
                selecionado={d.data === data}
                onPress={() => escolherDia(d.data)}
                accessibilityLabel={formatarDiaEMes(datas[i])}
                style={{ minWidth: 56 }}
              />
            ))}
          </ScrollView>
        </View>

        {conflito ? (
          <View
            accessibilityRole="alert"
            style={{
              flexDirection: 'row',
              gap: espaco.xs,
              backgroundColor: cores.alertaSuave,
              borderColor: cores.alertaBorda,
              borderWidth: 1,
              borderRadius: raio.campo,
              padding: espaco.sm,
            }}
          >
            <Feather name="alert-circle" size={16} color={cores.alerta} style={{ marginTop: 2 }} />
            <Texto variante="legenda" cor="alerta" style={{ flex: 1 }} selectable>
              {conflito.hora
                ? `Alguém marcou ${conflito.hora} agora há pouco. Escolha outro, os livres já estão atualizados.`
                : conflito.mensagem}
            </Texto>
          </View>
        ) : null}

        {diaEscolhido ? (
          <View style={{ gap: espaco.md }}>
            <Rotulo direita={`${DURACAO_CONSULTA_MIN} min cada`}>
              {`Horários de ${nomeCurtoDoDia(dataDaConsulta({ data, hora: '00:00' }))}, ${dataDaConsulta({ data, hora: '00:00' }).getDate()}`}
            </Rotulo>
            {grade('Manhã', manha)}
            {grade('Tarde', tarde)}
          </View>
        ) : (
          <Texto variante="rotulo" cor="apoio">
            Escolha um dia para ver os horários livres.
          </Texto>
        )}
      </>
    );
  };

  const renderPasso2 = () => (
    <>
      {ehRecepcao && pacienteEscolhido ? (
        <Texto variante="rotulo" cor="tinta2">
          Paciente: {pacienteEscolhido.nome}
        </Texto>
      ) : null}

      {renderHorarios()}

      {!ehRecepcao ? (
        <Texto variante="legenda" cor="apoio">
          Você pode remarcar ou cancelar pelo app até 24 h antes do horário. Um
          lembrete é agendado neste aparelho uma hora antes da consulta.
        </Texto>
      ) : null}
    </>
  );

  const renderPasso3 = () => {
    const quando = dataDaConsulta({ data, hora });

    return (
      <>
        <BilheteConsulta
          dia={quando.getDate()}
          mes={nomeDoMes(quando)}
          diaDaSemana={nomeCurtoDoDia(quando)}
          horario={formatarFaixa(quando)}
          detalhe={`${DURACAO_CONSULTA_MIN} min`}
          area={medico?.area}
        />
        <SeloSucesso titulo={sucesso.titulo} texto={sucesso.texto} />
        <View style={{ gap: espaco.sm }}>
          <Botao
            titulo="Ver detalhes"
            onPress={() =>
              navigation.replace('DetalheConsulta', { consultaId: sucesso.consultaId })
            }
          />
          {consulta ? (
            <Botao titulo="Voltar" variante="contorno" onPress={() => navigation.goBack()} />
          ) : (
            <Botao titulo="Agendar outra" variante="contorno" onPress={agendarOutra} />
          )}
        </View>
      </>
    );
  };

  // Topo de cada passo: verde para o paciente, lavanda para a recepcao.
  const planoDoTopo = ehRecepcao ? planoDaArea(null, cores) : planoDoPaciente(cores);
  let topo;
  if (sucesso) {
    topo = (
      <TopoDoPasso
        plano={planoDoTopo}
        etapa={consulta ? null : 3}
        titulo={sucesso.titulo}
        subtitulo={`Com ${medico?.nome ?? 'o profissional'}`}
      />
    );
  } else if (passo === 1 || carregando || erroCarga) {
    topo = (
      <TopoDoPasso
        plano={planoDoTopo}
        etapa={1}
        titulo={ehRecepcao ? 'Nova consulta' : 'Agendar consulta'}
        subtitulo={ehRecepcao && !pacienteId ? 'Escolha o paciente' : 'Escolha o profissional'}
      />
    );
  } else {
    const registro = especialidadeERegistro(medico);
    topo = (
      <TopoDoPasso plano={planoDoTopo} etapa={consulta ? null : 2} titulo={consulta ? 'Novo horário' : 'Dia e horário'}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: espaco.sm, marginTop: espaco.sm }}>
          <Avatar nome={medico?.nome} fotoUri={medico?.fotoUri} tom={ehRecepcao ? 'vidro' : 'lavanda'} />
          <View style={{ flex: 1, gap: 2 }}>
            <Texto variante="corpoForte" cor={planoDoTopo.texto}>
              {medico?.nome ?? 'Profissional'}
            </Texto>
            {registro ? (
              <Texto variante="legenda" cor={planoDoTopo.texto2}>
                {registro}
              </Texto>
            ) : null}
            <EtiquetaArea area={medico?.area} style={{ marginTop: 2 }} />
          </View>
          {!consulta ? (
            <Pressionavel
              onPress={() => setPasso(1)}
              accessibilityRole="button"
              accessibilityLabel="Trocar profissional"
              style={{ minHeight: toque.minimo, justifyContent: 'center' }}
            >
              <Texto
                variante="rotuloForte"
                cor={planoDoTopo.texto}
                style={{ textDecorationLine: 'underline' }}
              >
                Trocar
              </Texto>
            </Pressionavel>
          ) : null}
        </View>
      </TopoDoPasso>
    );
  }

  let corpo;
  if (sucesso) {
    corpo = renderPasso3();
  } else if (carregando) {
    corpo = (
      <View style={{ gap: 10 }} accessibilityState={{ busy: true }}>
        <Esqueleto largura={240} altura={32} raio={8} />
        <Esqueleto altura={44} raio={raio.campo} />
        {[0, 1, 2].map((i) => (
          <Esqueleto key={i} altura={84} raio={raio.cartao} />
        ))}
      </View>
    );
  } else if (erroCarga) {
    corpo = <EstadoErro texto={erroCarga} aoTentar={carregarListas} />;
  } else {
    corpo = passo === 1 ? renderPasso1() : renderPasso2();
  }

  const tituloDaCapsula = sucesso
    ? sucesso.titulo
    : passo === 1
      ? 'Escolha o profissional'
      : 'Dia e horário';
  const comBarra = passo === 2 && !carregando && !erroCarga && !sucesso;

  return (
    <View style={{ flex: 1, backgroundColor: cores.papel }}>
      <ComVidro
        conteudo={
          <Animated.ScrollView
            key={sucesso ? 3 : passo}
            onScroll={aoRolar}
            scrollEventThrottle={16}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{
              paddingBottom: comBarra ? 170 + insets.bottom : insets.bottom + espaco.xl,
            }}
          >
            {topo}
            <View style={{ paddingTop: espaco.lg, paddingHorizontal: margemTela + 2, gap: 22 }}>
              {corpo}
            </View>
          </Animated.ScrollView>
        }
      >
        <Cabecalho
          flutuante
          titulo={tituloDaCapsula}
          rolou={rolou}
          aoVoltar={voltar}
        />

        {comBarra ? (
          <View
            style={{
              position: 'absolute',
              left: margemTela,
              right: margemTela,
              bottom: insets.bottom + espaco.sm,
              gap: espaco.xs,
            }}
          >
            <Vidro espessura="espesso" raio={raio.cartaoGrande}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: espaco.sm,
                  minHeight: toque.minimo,
                  paddingHorizontal: espaco.md,
                }}
              >
                <Texto variante="rotulo" cor="apoio">
                  Selecionado
                </Texto>
                <Texto variante="rotuloForte" tabular numberOfLines={1} style={{ flexShrink: 1 }}>
                  {pronto ? formatarEscolha(data, hora) : 'nenhum horário'}
                </Texto>
              </View>
            </Vidro>
            <Botao
              titulo={
                !hora
                  ? 'Escolha o horário'
                  : consulta
                    ? 'Confirmar remarcação'
                    : 'Confirmar agendamento'
              }
              desativado={!pronto}
              carregando={salvando}
              onPress={salvar}
            />
          </View>
        ) : null}
      </ComVidro>

      <FolhaDecisao
        visivel={folhaConflito}
        aoFechar={() => setFolhaConflito(false)}
        titulo="Esse horário acabou de ser ocupado"
        texto={
          conflito?.sugestao
            ? `Alguém marcou ${conflito.hora} agora há pouco. O mais perto livre é ${formatarEscolha(conflito.sugestao.data, conflito.sugestao.hora)}.`
            : 'Alguém marcou esse horário agora há pouco. Os livres já estão atualizados.'
        }
        acaoPrincipal={
          conflito?.sugestao
            ? { titulo: `Ficar com ${conflito.sugestao.hora}`, onPress: ficarComSugestao }
            : { titulo: 'Escolher outro', onPress: () => setFolhaConflito(false) }
        }
        acaoSecundaria={
          conflito?.sugestao
            ? { titulo: 'Escolher outro', onPress: () => setFolhaConflito(false) }
            : false
        }
      />

    </View>
  );
}
