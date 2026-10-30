import React, { useState, useCallback, useEffect } from 'react';
import { Linking, View } from 'react-native';
import Animated, {
  FadeIn,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import {
  buscarConsulta,
  buscarConsultas,
  excluirConsulta,
  buscarMedicos,
  buscarPaciente,
  buscarSinaisVitais,
  SessaoExpirada,
  SemPermissao,
  ErroDaApi,
} from '../services/api';
import {
  ANTECEDENCIA_MINUTOS,
  cancelarLembrete,
  dataDaConsulta,
  formatarHora,
} from '../services/lembretes';
import { useUsuario } from '../services/sessao';
import {
  formatarDiaEHora,
  formatarDiaEMes,
  formatarFaixa,
  nomeCurtoDoDia,
  nomeDoMes,
  nomeLongoDoDia,
  DURACAO_CONSULTA_MIN,
} from '../services/datas';
import { CLINICA } from '../services/localizacao';
import {
  BarraDoTopo,
  BilheteConsulta,
  Botao,
  Cabecalho,
  CartaoTinta,
  ComVidro,
  Esqueleto,
  EstadoErro,
  EstadoVazio,
  FolhaDecisao,
  ItemDeLista,
  EtiquetaArea,
  PlanoTopo,
  Selo,
  SeloSucesso,
  Texto,
  useRolagem,
} from '../components';
import {
  useTema,
  espaco,
  margemTela,
  raio,
  toque,
  planoDaArea,
  ehPsiquiatria,
  duracao,
  curva,
} from '../theme';
import { vibrarImpacto } from '../services/haptica';
import { especialidadeERegistro } from '../services/profissionais';

// Tela de destino do toque no lembrete. Recebe so o consultaId (o que
// viaja em content.data) e busca o resto no servidor: a notificacao pode
// ter sido agendada dias atras, e o servidor e a fonte da verdade.

// Mesma regra do servidor: o paciente so remarca ou cancela sozinho com
// 24 h de antecedencia. A tela so evita oferecer o que seria recusado.
const ANTECEDENCIA_MINIMA_MS = 24 * 60 * 60 * 1000;

const MAX_HISTORICO = 4;

// Quanto o bilhete invade o topo colorido.
const SOBREPOSICAO = 64;

const minuscula = (texto) => `${texto[0].toLowerCase()}${texto.slice(1)}`;

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

// Cartao opaco: dado de saude, horario e valor nunca vao em vidro.
function Cartao({ children, style }) {
  const { cores } = useTema();

  return (
    <View
      style={[
        {
          backgroundColor: cores.superficie,
          borderColor: cores.linha,
          borderWidth: 1,
          borderRadius: raio.cartaoGrande,
          borderCurve: 'continuous',
          padding: espaco.md + 2,
          gap: espaco.sm,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

function Linha({ icone, rotulo, valor }) {
  const { cores } = useTema();

  return (
    <View style={{ flexDirection: 'row', gap: espaco.sm, alignItems: 'flex-start' }}>
      <Feather name={icone} size={18} color={cores.apoio} style={{ marginTop: 2 }} />
      <View style={{ flex: 1, gap: 1 }}>
        <Texto variante="legenda" cor="apoio">
          {rotulo}
        </Texto>
        <Texto variante="rotulo" selectable>
          {valor}
        </Texto>
      </View>
    </View>
  );
}

export default function DetalheConsultaScreen({ navigation, route }) {
  const consultaId = route.params?.consultaId;

  const { usuario } = useUsuario();
  const { cores, escuro, movimentoReduzido } = useTema();
  const insets = useSafeAreaInsets();
  const { aoRolar, rolou } = useRolagem(120);
  // Quando o dado chega, o conteudo entra em fade sobre o esqueleto.
  const chegada = FadeIn.duration(
    movimentoReduzido ? duracao.reduzido : duracao.conteudo,
  );

  // O topo nasce lavanda e, se a consulta for de Psiquiatria, vai a verde
  // no mesmo tempo do crossfade (200 ms). Com "reduzir movimento", troca na
  // hora.
  const paraVerde = useSharedValue(0);
  // O texto do topo so fica branco quando o verde ja chegou: nunca branco
  // sobre lavanda, nem de passagem.
  const [topoVerde, setTopoVerde] = useState(false);
  const corDoPlano = cores.destaque;
  const corVerde = cores.planoVerde;
  const estiloDoTopo = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(paraVerde.get(), [0, 1], [corDoPlano, corVerde]),
  }));

  const perfil = usuario?.perfil;

  const [consulta, setConsulta] = useState(null);
  const [paciente, setPaciente] = useState(null);
  const [medico, setMedico] = useState(null);
  const [historico, setHistorico] = useState([]);
  const [ultimoSinal, setUltimoSinal] = useState(null);
  const [erroSinais, setErroSinais] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);
  const [naoExiste, setNaoExiste] = useState(false);
  const [cancelando, setCancelando] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [cancelada, setCancelada] = useState(false);
  const [erroCancelar, setErroCancelar] = useState(null);

  const irParaLogin = () => {
    navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
  };

  const carregar = useCallback(async () => {
    if (!perfil) return;

    setErro(null);
    setNaoExiste(false);

    try {
      const dados = await buscarConsulta(consultaId);
      setConsulta(dados);

      // Nomes buscados a parte: a consulta guarda so os ids. O paciente
      // logado nao precisa buscar o proprio cadastro para esta tela.
      const [pacienteDados, medicos, todas] = await Promise.all([
        perfil === 'paciente'
          ? null
          : buscarPaciente(dados.pacienteId).catch(() => null),
        buscarMedicos().catch(() => []),
        buscarConsultas().catch(() => []),
      ]);

      setPaciente(pacienteDados);
      setMedico(
        medicos.find((m) => String(m.id) === String(dados.medicoId)) ?? null,
      );

      // Historico do mesmo paciente com o mesmo profissional.
      const agora = new Date();
      setHistorico(
        todas
          .filter(
            (c) =>
              String(c.id) !== String(dados.id) &&
              String(c.medicoId) === String(dados.medicoId) &&
              String(c.pacienteId) === String(dados.pacienteId) &&
              dataDaConsulta(c) < agora,
          )
          .sort((a, b) => dataDaConsulta(b) - dataDaConsulta(a))
          .slice(0, MAX_HISTORICO),
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
        setErro('Confira a internet do celular e tente de novo.');
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
      if (!cancelada) carregar();
    }, [carregar, cancelada]),
  );

  const areaDoMedico = medico?.area;
  useEffect(() => {
    const alvo = ehPsiquiatria(areaDoMedico) ? 1 : 0;
    if (movimentoReduzido || alvo === 0) {
      paraVerde.set(alvo);
      setTopoVerde(alvo === 1);
      return;
    }
    paraVerde.set(
      withTiming(alvo, { duration: duracao.conteudo, easing: curva.saida }, (terminou) => {
        if (terminou) scheduleOnRN(setTopoVerde, true);
      }),
    );
  }, [areaDoMedico, movimentoReduzido]);

  const cancelarConsulta = async () => {
    vibrarImpacto();
    setCancelando(true);
    setErroCancelar(null);

    try {
      // Primeiro o servidor: se o DELETE falhar, a consulta continua
      // existindo e o lembrete precisa continuar tambem.
      await excluirConsulta(consultaId);

      // O passo que todo mundo esquece. Sem ele, a consulta some mas o
      // aviso dispara -- e o paciente vai a clinica a toa.
      await cancelarLembrete(consultaId);

      setConfirmando(false);
      setCancelada(true);
    } catch (e) {
      if (e instanceof SessaoExpirada) {
        irParaLogin();
        return;
      }

      setErroCancelar(
        e instanceof ErroDaApi && e.mensagem
          ? e.mensagem
          : 'Não foi possível cancelar a consulta agora.',
      );
    } finally {
      setCancelando(false);
    }
  };

  const ligarParaRecepcao = () => {
    Linking.openURL(`tel:${CLINICA.telefone.replace(/\D/g, '')}`).catch(() => {});
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
      <Cartao>
        <Texto variante="secao" accessibilityRole="header">
          Sinais vitais
        </Texto>

        {erroSinais ? (
          <Texto variante="rotulo" cor="tinta2">
            {erroSinais}
          </Texto>
        ) : ultimoSinal ? (
          <View style={{ gap: 2 }}>
            <Texto variante="corpoForte" tabular selectable>
              {resumoDoSinal(ultimoSinal)}
            </Texto>
            <Texto variante="legenda" cor="apoio" tabular>
              {formatarRegistro(ultimoSinal.registradoEm)}
            </Texto>
          </View>
        ) : (
          <Texto variante="rotulo" cor="tinta2">
            Nenhum registro para esta consulta.
          </Texto>
        )}

        {podeRegistrar && (
          <Botao
            titulo="Registrar sinais vitais"
            variante="contorno"
            icone="activity"
            onPress={() =>
              navigation.navigate('SinaisVitais', {
                paciente: pacienteDoRegistro,
                consultaId,
              })
            }
          />
        )}
      </Cartao>
    );
  };

  const renderAcoes = (passou, faltaMs, quando) => {
    // Medico consulta a agenda; quem marca e desmarca e a recepcao ou o
    // proprio paciente.
    if (perfil === 'medico') return null;

    if (passou) {
      return perfil === 'paciente' ? (
        <Botao
          titulo="Agendar nova consulta"
          onPress={() => navigation.navigate('Agendar')}
        />
      ) : null;
    }

    // Menos de 24 h: os botoes que o servidor recusaria dao lugar a um
    // caminho que funciona.
    if (perfil === 'paciente' && faltaMs < ANTECEDENCIA_MINIMA_MS) {
      return (
        <CartaoTinta
          titulo="Remarcar ou cancelar"
          texto={`Faltam menos de 24 horas. Agora, só pela recepção: ${CLINICA.telefone}.`}
        >
          <Botao
            titulo="Ligar para a recepção"
            icone="phone"
            variante="lavanda"
            onPress={ligarParaRecepcao}
          />
        </CartaoTinta>
      );
    }

    const limite = new Date(quando.getTime() - ANTECEDENCIA_MINIMA_MS);

    return (
      <View style={{ gap: espaco.sm }}>
        {perfil === 'paciente' ? (
          <CartaoTinta
            titulo="Remarcar ou cancelar"
            texto={`Até 24 horas antes, ou seja, até ${minuscula(formatarDiaEHora(limite))}.`}
          />
        ) : null}
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Botao
            titulo="Remarcar"
            style={{ flex: 1 }}
            onPress={() => navigation.navigate('Agendar', { consulta })}
          />
          <Botao
            titulo="Cancelar"
            variante="contornoAlerta"
            style={{ flex: 1 }}
            onPress={() => {
              setErroCancelar(null);
              setConfirmando(true);
            }}
          />
        </View>
      </View>
    );
  };

  const topo = insets.top + espaco.xs + toque.minimo + espaco.md;

  const renderConteudo = () => {
    if (carregando) {
      return (
        <View accessibilityState={{ busy: true }} accessibilityLabel="Carregando a consulta">
          <PlanoTopo
            fundo={cores.destaque}
            corTexto={cores.sobrePlano}
            style={{
              paddingTop: topo,
              paddingHorizontal: margemTela + 2,
              paddingBottom: SOBREPOSICAO + espaco.lg,
              gap: espaco.sm,
            }}
          >
            <Esqueleto sobreDestaque largura={110} altura={14} raio={5} />
            <Esqueleto sobreDestaque largura={230} altura={30} raio={8} />
            <Esqueleto sobreDestaque largura={180} altura={14} raio={5} />
          </PlanoTopo>
          <View style={{ paddingHorizontal: margemTela + 2, marginTop: -SOBREPOSICAO, gap: espaco.md }}>
            <Esqueleto altura={128} raio={22} />
            <Esqueleto altura={72} raio={20} />
            <Esqueleto altura={48} raio={raio.botao} />
          </View>
        </View>
      );
    }

    if (cancelada) {
      return (
        <View style={{ paddingTop: topo + espaco.xl, paddingHorizontal: margemTela + 2, gap: espaco.lg }}>
          <SeloSucesso
            titulo="Consulta cancelada"
            texto="O horário voltou para a agenda da clínica e o lembrete deste aparelho foi cancelado."
          />
          <Botao titulo="Voltar" onPress={() => navigation.goBack()} />
        </View>
      );
    }

    if (naoExiste) {
      return (
        <View style={{ paddingTop: topo, paddingHorizontal: margemTela + 2 }}>
          <EstadoVazio
            titulo="Esta consulta não existe mais"
            texto="Ela foi cancelada em outro lugar. O lembrete dela neste aparelho também foi cancelado."
          />
        </View>
      );
    }

    if (erro || !consulta) {
      return (
        <View style={{ paddingTop: topo, paddingHorizontal: margemTela + 2 }}>
          <EstadoErro texto={erro ?? undefined} aoTentar={carregar} />
        </View>
      );
    }

    const quando = dataDaConsulta(consulta);
    const faltaMs = quando - new Date();
    const passou = faltaMs <= 0;
    const registro = especialidadeERegistro(medico);
    const plano = planoDaArea(topoVerde ? medico?.area : null, cores);
    const lembrete =
      ANTECEDENCIA_MINUTOS === 60 ? 'uma hora' : `${ANTECEDENCIA_MINUTOS} minutos`;

    return (
      <Animated.View entering={chegada}>
        <PlanoTopo
          fundo={plano.fundo}
          corTexto={plano.texto}
          estiloAnimado={estiloDoTopo}
          style={{
            paddingTop: insets.top + espaco.xs,
            paddingHorizontal: margemTela + 2,
            paddingBottom: SOBREPOSICAO + espaco.lg,
            gap: 2,
          }}
        >
          <View
            style={{
              minHeight: toque.minimo,
              alignItems: 'flex-end',
              justifyContent: 'center',
              marginBottom: espaco.md,
            }}
          >
            <Selo
              texto={passou ? 'Anterior' : 'Agendada'}
              tom={passou ? 'neutro' : 'lavanda'}
              icone={passou ? 'check' : 'calendar'}
            />
          </View>
          <Texto variante="rotulo" cor={plano.texto2}>
            Consulta com
          </Texto>
          <Texto variante="tituloGrande" cor={plano.texto} accessibilityRole="header">
            {medico?.nome ?? 'Profissional'}
          </Texto>
          {registro ? (
            <Texto variante="rotulo" cor={plano.texto2} selectable>
              {registro}
            </Texto>
          ) : null}
        </PlanoTopo>

        <View
          style={{
            paddingHorizontal: margemTela + 2,
            paddingBottom: insets.bottom + espaco.xl,
            marginTop: -SOBREPOSICAO,
            gap: espaco.md,
          }}
        >
          <BilheteConsulta
            dia={quando.getDate()}
            mes={nomeDoMes(quando)}
            diaDaSemana={nomeCurtoDoDia(quando)}
            horario={formatarFaixa(quando)}
            detalhe={`${DURACAO_CONSULTA_MIN} min`}
            area={medico?.area}
            aoComoChegar={
              perfil === 'paciente' && !passou
                ? () => navigation.navigate('ComoChegar')
                : undefined
            }
          />

          {medico?.area || (perfil === 'paciente' && !passou) ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: espaco.xs }}>
              <EtiquetaArea area={medico?.area} />
              {perfil === 'paciente' && !passou ? (
                <Texto variante="legenda" cor="tinta2" style={{ flexShrink: 1 }}>
                  Avisamos {lembrete} antes, neste aparelho.
                </Texto>
              ) : null}
            </View>
          ) : null}

          {perfil !== 'paciente' ? (
            <Cartao>
              <Linha icone="user" rotulo="Paciente" valor={paciente?.nome ?? '—'} />
            </Cartao>
          ) : null}

          {renderSinaisVitais(passou)}

          {renderAcoes(passou, faltaMs, quando)}

          {historico.length > 0 ? (
            <View style={{ gap: 2, marginTop: espaco.xs }}>
              <Texto variante="secao" accessibilityRole="header">
                Com {medico?.nome ?? 'este profissional'}
              </Texto>
              {historico.map((c, indice) => (
                <ItemDeLista
                  key={String(c.id)}
                  titulo={formatarDiaEHora(dataDaConsulta(c))}
                  tabular
                  seta
                  divisor={indice < historico.length - 1}
                  onPress={() =>
                    navigation.push('DetalheConsulta', { consultaId: String(c.id) })
                  }
                />
              ))}
            </View>
          ) : null}
        </View>
      </Animated.View>
    );
  };

  const quando = consulta ? dataDaConsulta(consulta) : null;

  return (
    <View style={{ flex: 1, backgroundColor: cores.papel }}>
      <BarraDoTopo clara={rolou ? escuro : topoVerde} />
      <ComVidro
        conteudo={
          <Animated.ScrollView onScroll={aoRolar} scrollEventThrottle={16}>
            {renderConteudo()}
          </Animated.ScrollView>
        }
      >
        <Cabecalho
          flutuante
          titulo={medico?.nome ?? 'Consulta'}
          rolou={rolou}
          aoVoltar={() => navigation.goBack()}
        />
      </ComVidro>

      <FolhaDecisao
        visivel={confirmando}
        aoFechar={() => !cancelando && setConfirmando(false)}
        titulo={
          quando ? `Cancelar a consulta de ${nomeLongoDoDia(quando)}?` : 'Cancelar a consulta?'
        }
        texto={
          quando
            ? `${formatarDiaEMes(quando)} às ${formatarHora(quando)} com ${medico?.nome ?? 'o profissional'}. Você pode marcar outro horário quando quiser.`
            : null
        }
        acaoPrincipal={{
          titulo: 'Cancelar consulta',
          variante: 'alerta',
          carregando: cancelando,
          onPress: cancelarConsulta,
        }}
        acaoSecundaria={{ titulo: 'Manter consulta', onPress: () => setConfirmando(false) }}
      >
        {erroCancelar ? (
          <Texto variante="legenda" cor="alerta" selectable>
            {erroCancelar}
          </Texto>
        ) : null}
      </FolhaDecisao>
    </View>
  );
}
