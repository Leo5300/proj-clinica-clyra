import React, { useState } from 'react';
import { RefreshControl, View } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  LinearTransition,
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
  FiltroArea,
  Numeral,
  PlanoTopo,
  Pressionavel,
  Selo,
  TODAS,
  Texto,
  useEntradaDeLista,
  useEspacoDaBarra,
} from '../../components';
import { useTema, espaco, margemTela, raio, duracao, corDaArea } from '../../theme';
import { dataDaConsulta } from '../../services/lembretes';
import { formatarDataPorExtenso, formatarHorario } from '../../services/datas';
import TopoDaEquipe from './TopoDaEquipe';

// Agenda do dia da recepcao: topo de tinta com a contagem do dia, filtro
// por area, o que ja passou recolhido em "Mais cedo", a linha "Agora" e o
// que vem a seguir. A barra lateral de cada linha diz a area do
// profissional, sempre com o nome da area escrito. Tudo vem da API.

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
  if (minutos < 60) return `em ${minutos} min`;
  return `em ${Math.round(minutos / 60)} h`;
}

const plural = (n, um, varios) => (n === 1 ? um : varios);

function LinhaDaAgenda({ consulta, paciente, medico, agora, proxima, passada, entrada, onPress }) {
  const { cores, movimentoReduzido } = useTema();
  const quando = dataDaConsulta(consulta);

  return (
    <Animated.View
      entering={entrada ?? (movimentoReduzido ? undefined : ENTRA)}
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
          variante="secao"
          cor={passada ? 'apoio' : 'tinta'}
          tabular
          style={{ width: 56 }}
        >
          {formatarHorario(quando)}
        </Texto>
        <View
          style={{
            width: 3,
            alignSelf: 'stretch',
            borderRadius: 2,
            backgroundColor: corDaArea(medico?.area, cores),
            opacity: passada ? 0.4 : 1,
          }}
        />
        <View style={{ flex: 1, gap: 2 }}>
          <Texto variante="corpoForte" cor={passada ? 'tinta2' : 'tinta'}>
            {paciente?.nome ?? 'Paciente'}
          </Texto>
          <Texto variante="legenda" cor="apoio">
            {[medico?.nome ?? 'Profissional', medico?.area].filter(Boolean).join(' · ')}
          </Texto>
        </View>
        {proxima ? <Selo texto={faltaPara(quando, agora)} icone="clock" /> : null}
      </Pressionavel>
    </Animated.View>
  );
}

function Carregando() {
  return (
    <View style={{ gap: 14 }} accessibilityState={{ busy: true }}>
      <Esqueleto largura={260} altura={40} raio={raio.capsula} />
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
  const entrada = useEntradaDeLista('agenda-recepcao', !carregando);

  const [area, setArea] = useState(TODAS);
  const [cedoAberto, setCedoAberto] = useState(false);

  const agora = new Date();
  const deHoje = consultas
    .filter((c) => mesmoDia(dataDaConsulta(c), agora))
    .sort((a, b) => dataDaConsulta(a) - dataDaConsulta(b));

  const areaDa = (c) => medicos[String(c.medicoId)]?.area;

  // Filtro so com as areas que atendem hoje: escolher uma area sem agenda
  // levaria a uma lista vazia.
  const areas = [...new Set(deHoje.map(areaDa).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b),
  );

  const filtradas = deHoje.filter((c) => area === TODAS || areaDa(c) === area);
  const cedo = filtradas.filter((c) => dataDaConsulta(c) <= agora);
  const seguir = filtradas.filter((c) => dataDaConsulta(c) > agora);
  const aSeguirHoje = deHoje.filter((c) => dataDaConsulta(c) > agora).length;

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
        ilustracao
        titulo="Nenhuma consulta hoje"
        texto="Quando alguém marcar para hoje, a agenda aparece aqui."
        acao={{ titulo: 'Nova consulta', onPress: () => navigation.navigate('Agendar') }}
      />
    );
  } else {
    corpo = (
      <View style={{ gap: espaco.sm }}>
        {areas.length > 1 ? (
          <FiltroArea areas={areas} valor={area} aoMudar={setArea} />
        ) : null}

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
                  justifyContent: 'space-between',
                  gap: espaco.xs,
                  minHeight: 44,
                }}
              >
                <Texto variante="rotuloForte" cor="tinta2">
                  Mais cedo · {cedo.length} {plural(cedo.length, 'consulta', 'consultas')}
                </Texto>
                <Feather
                  name={cedoAberto ? 'chevron-up' : 'chevron-down'}
                  size={18}
                  color={cores.apoio}
                />
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
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: espaco.xs,
              paddingVertical: espaco.sm,
            }}
          >
            <View
              style={{
                width: 10,
                height: 10,
                borderRadius: 5,
                borderWidth: 2,
                borderColor: cores.tinta,
              }}
            />
            <Texto variante="legendaForte" tabular>
              Agora · {formatarHorario(agora)}
            </Texto>
            <View style={{ flex: 1, height: 1, backgroundColor: cores.linhaForte }} />
          </View>

          {seguir.length === 0 ? (
            <Texto variante="rotulo" cor="tinta2" style={{ paddingVertical: espaco.sm }}>
              {area === TODAS
                ? 'Nenhuma consulta a seguir hoje.'
                : `Nenhuma consulta de ${area} a seguir hoje.`}
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
                entrada={entrada(indice)}
                onPress={() => abrir(c)}
              />
            ))
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: cores.papel }}>
      <ComVidro
        conteudo={
          <Animated.ScrollView
            refreshControl={
              <RefreshControl
                refreshing={atualizando}
                onRefresh={aoAtualizar}
                tintColor={cores.lavanda}
                progressViewOffset={insets.top}
              />
            }
            contentContainerStyle={{ paddingBottom: espacoDaBarra }}
          >
            <PlanoTopo
              fundo={cores.planoTinta}
              corTexto={cores.sobrePlanoTinta}
              style={{
                paddingTop: insets.top + espaco.xs,
                paddingHorizontal: margemTela + 2,
                paddingBottom: espaco.lg,
                gap: espaco.md,
              }}
            >
              <TopoDaEquipe
                usuario={usuario}
                navigation={navigation}
                corTexto={cores.sobrePlanoTinta}
                tomDoAvatar="lavanda"
              />
              {usuario && !carregando ? (
                <View style={{ gap: 4 }}>
                  <Texto variante="rotulo" cor={cores.sobrePlanoTinta2}>
                    {formatarDataPorExtenso(agora)}
                  </Texto>
                  <View
                    accessible
                    accessibilityRole="header"
                    accessibilityLabel={`${deHoje.length} ${plural(deHoje.length, 'consulta', 'consultas')} hoje, ${aSeguirHoje} a seguir`}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: espaco.sm }}
                  >
                    <Numeral valor={deHoje.length} tamanho="grande" cor={cores.lavandaNumeral} />
                    <View style={{ flex: 1, gap: 6 }}>
                      <Texto variante="titulo" cor={cores.sobrePlanoTinta}>
                        {plural(deHoje.length, 'consulta', 'consultas')} hoje
                      </Texto>
                      {aSeguirHoje > 0 ? (
                        <View
                          style={{
                            alignSelf: 'flex-start',
                            backgroundColor: cores.manteiga,
                            borderRadius: raio.capsula,
                            paddingHorizontal: 9,
                            paddingVertical: 2,
                          }}
                        >
                          <Texto variante="pequeno" cor="sobreManteiga">
                            {aSeguirHoje} a seguir
                          </Texto>
                        </View>
                      ) : null}
                    </View>
                  </View>
                </View>
              ) : null}
            </PlanoTopo>

            <View
              style={{
                paddingTop: espaco.md,
                paddingHorizontal: margemTela + 2,
                gap: espaco.sm,
              }}
            >
              {corpo}

              {mostrarLista ? (
                <Botao
                  variante="texto"
                  compacto
                  titulo="Ver todas as consultas"
                  onPress={() => navigation.navigate('Consultas')}
                  style={{ alignSelf: 'flex-start' }}
                />
              ) : null}
            </View>
          </Animated.ScrollView>
        }
      >
        <BarraAbas navigation={navigation} atual="Home" />
      </ComVidro>
    </View>
  );
}
