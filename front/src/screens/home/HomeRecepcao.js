import React, { useState } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  LinearTransition,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import {
  BarraAbas,
  Botao,
  ComVidro,
  Esqueleto,
  EstadoErro,
  EstadoVazio,
  Pressionavel,
  Selo,
  Texto,
  Vidro,
  useEspacoDaBarra,
  useRolagem,
} from '../../components';
import { useTema, espaco, margemTela, raio, duracao } from '../../theme';
import { dataDaConsulta } from '../../services/lembretes';
import { formatarDataPorExtenso, formatarHorario } from '../../services/datas';
import { vibrarSelecao } from '../../services/haptica';
import TopoDaEquipe from './TopoDaEquipe';

// Agenda do dia da recepcao: filtro por profissional fixo em vidro, o que
// ja passou recolhido em "Mais cedo", a linha "Agora" e o que vem a
// seguir. Tudo vem da API.

const ALTURA_FILTRO = 52;
const ENTRA = FadeIn.duration(duracao.lista);
const SAI = FadeOut.duration(150);
const REFLUI = LinearTransition.duration(duracao.lista);

function mesmoDia(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

// "em 18 min", "em 2 h"
function faltaPara(data, agora) {
  const minutos = Math.max(0, Math.round((data - agora) / 60000));
  if (minutos < 60) return `Em ${minutos} min`;
  return `Em ${Math.round(minutos / 60)} h`;
}

const primeiroNome = (nome) => String(nome ?? '').trim().split(/\s+/)[0] || 'Profissional';

function FiltroDeProfissional({ opcoes, valor, aoMudar }) {
  const { cores } = useTema();

  return (
    <Vidro style={{ height: ALTURA_FILTRO }}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        accessibilityLabel="Filtrar por profissional"
        contentContainerStyle={{ padding: 4, gap: 4, alignItems: 'center' }}
      >
        {opcoes.map((opcao) => {
          const selecionada = opcao.valor === valor;
          return (
            <Pressionavel
              key={opcao.valor}
              onPress={() => {
                if (selecionada) return;
                vibrarSelecao();
                aoMudar(opcao.valor);
              }}
              accessibilityRole="button"
              accessibilityState={{ selected: selecionada }}
              style={{
                minHeight: ALTURA_FILTRO - 10,
                paddingHorizontal: espaco.md,
                borderRadius: raio.capsula,
                justifyContent: 'center',
                backgroundColor: selecionada ? cores.selFundo : 'transparent',
                transitionProperty: ['backgroundColor', 'transform'],
                transitionDuration: duracao.selecao,
              }}
            >
              <Texto
                variante={selecionada ? 'rotuloForte' : 'rotulo'}
                cor={selecionada ? 'selTexto' : 'tinta'}
                numberOfLines={1}
              >
                {opcao.rotulo}
              </Texto>
            </Pressionavel>
          );
        })}
      </ScrollView>
    </Vidro>
  );
}

function LinhaDaAgenda({ consulta, paciente, medico, agora, proxima, passada, onPress }) {
  const { cores, movimentoReduzido } = useTema();
  const quando = dataDaConsulta(consulta);

  return (
    <Animated.View
      entering={movimentoReduzido ? undefined : ENTRA}
      exiting={movimentoReduzido ? undefined : SAI}
      layout={movimentoReduzido ? undefined : REFLUI}
    >
      <Pressionavel
        onPress={onPress}
        accessibilityRole="button"
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: espaco.sm,
          paddingVertical: 14,
          borderBottomWidth: 1,
          borderBottomColor: cores.linha,
        }}
      >
        <Texto
          variante="corpoForte"
          cor={proxima ? 'link' : passada ? 'apoio' : 'tinta'}
          tabular
          style={{ width: 56 }}
        >
          {formatarHorario(quando)}
        </Texto>
        <View style={{ flex: 1, gap: 2 }}>
          <Texto variante="corpoForte" cor={passada ? 'tinta2' : 'tinta'}>
            {paciente?.nome ?? 'Paciente'}
          </Texto>
          <Texto variante="legenda" cor="apoio">
            {medico?.nome ?? 'Profissional'}
          </Texto>
        </View>
        {proxima ? (
          <Selo texto={faltaPara(quando, agora)} icone="clock" />
        ) : passada ? null : (
          <Selo texto="Agendada" tom="neutro" icone="calendar" />
        )}
      </Pressionavel>
    </Animated.View>
  );
}

function Carregando() {
  return (
    <View style={{ gap: 14 }} accessibilityState={{ busy: true }}>
      <Esqueleto largura={240} altura={28} raio={8} />
      <Esqueleto largura={160} altura={16} raio={5} />
      <Esqueleto altura={ALTURA_FILTRO} raio={raio.capsula} />
      {[0, 1, 2, 3].map((i) => (
        <Esqueleto key={i} altura={52} raio={10} />
      ))}
    </View>
  );
}

export default function HomeRecepcao({
  navigation,
  usuario,
  consultas,
  medicos,
  pacientes,
  carregando,
  erro,
  atualizando,
  aoAtualizar,
  aoTentar,
}) {
  const { cores } = useTema();
  const insets = useSafeAreaInsets();
  const espacoDaBarra = useEspacoDaBarra();
  const { rolagem, aoRolar } = useRolagem();
  const alturaDoTopo = useSharedValue(120);

  const [filtro, setFiltro] = useState('todos');
  const [cedoAberto, setCedoAberto] = useState(false);

  const agora = new Date();
  const deHoje = consultas
    .filter((c) => mesmoDia(dataDaConsulta(c), agora))
    .sort((a, b) => dataDaConsulta(a) - dataDaConsulta(b));

  // Filtro so com quem atende hoje: escolher alguem sem agenda levaria a
  // uma lista vazia.
  const idsDeHoje = [...new Set(deHoje.map((c) => String(c.medicoId)))];
  const opcoes = [
    { valor: 'todos', rotulo: 'Todos' },
    ...idsDeHoje
      .map((id) => ({ valor: id, rotulo: primeiroNome(medicos[id]?.nome) }))
      .sort((a, b) => a.rotulo.localeCompare(b.rotulo)),
  ];

  const filtradas = deHoje.filter(
    (c) => filtro === 'todos' || String(c.medicoId) === filtro,
  );
  const cedo = filtradas.filter((c) => dataDaConsulta(c) <= agora);
  const seguir = filtradas.filter((c) => dataDaConsulta(c) > agora);

  const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;
  const resumo = `${plural(deHoje.length, 'consulta', 'consultas')} hoje · ${deHoje.filter((c) => dataDaConsulta(c) > agora).length} a seguir`;

  const topoDaLista = insets.top + espaco.xs;
  const topoFixo = insets.top + espaco.xs;

  // O filtro comeca abaixo do titulo e para no topo ao rolar.
  const estiloFiltro = useAnimatedStyle(() => ({
    transform: [
      {
        translateY: Math.max(
          topoFixo,
          topoDaLista + alturaDoTopo.get() + espaco.md - rolagem.get(),
        ),
      },
    ],
  }));

  const abrir = (c) =>
    navigation.navigate('DetalheConsulta', { consultaId: String(c.id) });

  const mostrarLista = !carregando && usuario && !(erro && consultas.length === 0);

  let corpo;
  if (carregando) {
    corpo = <Carregando />;
  } else if (!mostrarLista) {
    corpo = <EstadoErro aoTentar={aoTentar} />;
  } else if (deHoje.length === 0) {
    corpo = (
      <EstadoVazio
        titulo="Nenhuma consulta hoje"
        texto="Quando alguém marcar para hoje, a agenda aparece aqui."
        acao={{ titulo: 'Nova consulta', onPress: () => navigation.navigate('Agendar') }}
      />
    );
  } else {
    corpo = (
      <View>
        {cedo.length > 0 ? (
          <View>
            <Pressionavel
              onPress={() => setCedoAberto((aberto) => !aberto)}
              accessibilityRole="button"
              accessibilityState={{ expanded: cedoAberto }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: espaco.xs,
                minHeight: 44,
              }}
            >
              <Feather
                name={cedoAberto ? 'chevron-down' : 'chevron-right'}
                size={18}
                color={cores.apoio}
              />
              <Texto variante="rotuloForte" cor="tinta2">
                Mais cedo · {plural(cedo.length, 'consulta', 'consultas')}
              </Texto>
            </Pressionavel>
            {cedoAberto
              ? cedo.map((c) => (
                  <LinhaDaAgenda
                    key={String(c.id)}
                    consulta={c}
                    paciente={pacientes[String(c.pacienteId)]}
                    medico={medicos[String(c.medicoId)]}
                    agora={agora}
                    passada
                    onPress={() => abrir(c)}
                  />
                ))
              : null}
          </View>
        ) : null}

        <View
          accessibilityLabel={`Agora, ${formatarHorario(agora)}`}
          style={{ flexDirection: 'row', alignItems: 'center', gap: espaco.xs, paddingVertical: espaco.sm }}
        >
          <Texto variante="legendaForte" cor="link" tabular>
            Agora · {formatarHorario(agora)}
          </Texto>
          <View style={{ flex: 1, height: 1, backgroundColor: cores.acao }} />
        </View>

        {seguir.length === 0 ? (
          <Texto variante="rotulo" cor="tinta2" style={{ paddingVertical: espaco.sm }}>
            {filtro === 'todos'
              ? 'Nenhuma consulta a seguir hoje.'
              : 'Nenhuma consulta a seguir com esse profissional hoje.'}
          </Texto>
        ) : (
          seguir.map((c, indice) => (
            <LinhaDaAgenda
              key={String(c.id)}
              consulta={c}
              paciente={pacientes[String(c.pacienteId)]}
              medico={medicos[String(c.medicoId)]}
              agora={agora}
              proxima={indice === 0}
              onPress={() => abrir(c)}
            />
          ))
        )}
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: cores.papel }}>
      <ComVidro
        conteudo={
          <Animated.ScrollView
            onScroll={aoRolar}
            scrollEventThrottle={16}
            refreshControl={
              <RefreshControl
                refreshing={atualizando}
                onRefresh={aoAtualizar}
                tintColor={cores.acao}
                progressViewOffset={insets.top}
              />
            }
            contentContainerStyle={{
              paddingTop: topoDaLista,
              paddingHorizontal: margemTela + 2,
              paddingBottom: espacoDaBarra,
            }}
          >
            <View
              onLayout={(e) => alturaDoTopo.set(e.nativeEvent.layout.height)}
              style={{ gap: espaco.md }}
            >
              <TopoDaEquipe usuario={usuario} navigation={navigation} />
              {usuario && !carregando ? (
                <View style={{ gap: 2 }}>
                  <Texto variante="titulo" accessibilityRole="header">
                    {formatarDataPorExtenso(agora)}
                  </Texto>
                  <Texto variante="rotulo" cor="apoio" accessibilityLiveRegion="polite">
                    {resumo}
                  </Texto>
                </View>
              ) : null}
            </View>

            {mostrarLista && deHoje.length > 0 ? (
              <View style={{ height: ALTURA_FILTRO + espaco.md * 2 }} />
            ) : (
              <View style={{ height: espaco.md }} />
            )}

            {corpo}

            {mostrarLista ? (
              <Botao
                variante="texto"
                compacto
                titulo="Ver todas as consultas"
                onPress={() => navigation.navigate('Consultas')}
                style={{ alignSelf: 'flex-start', marginTop: espaco.sm }}
              />
            ) : null}
          </Animated.ScrollView>
        }
      >
        {mostrarLista && deHoje.length > 0 ? (
          <Animated.View
            pointerEvents="box-none"
            style={[
              { position: 'absolute', top: 0, left: espaco.md, right: espaco.md },
              estiloFiltro,
            ]}
          >
            <FiltroDeProfissional opcoes={opcoes} valor={filtro} aoMudar={setFiltro} />
          </Animated.View>
        ) : null}

        <BarraAbas navigation={navigation} atual="Home" />
      </ComVidro>
    </View>
  );
}
