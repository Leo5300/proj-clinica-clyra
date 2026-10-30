import React, { useCallback, useEffect, useState } from 'react';
import { RefreshControl, View } from 'react-native';
import Animated, {
  Extrapolation,
  FadeIn,
  FadeOut,
  interpolate,
  useAnimatedReaction,
  useAnimatedStyle,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { useIsFocused } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import {
  Avatar,
  BarraAbas,
  Botao,
  CartaoTinta,
  ComVidro,
  Esqueleto,
  EstadoErro,
  EstadoVazio,
  ItemDeLista,
  Logotipo,
  NumeralRolante,
  PlanoTopo,
  Pressionavel,
  Texto,
  Vidro,
  escalaDoVidro,
  modoDoVidro,
  iniciais,
  useEspacoDaBarra,
  useRolagem,
} from '../../components';
import {
  useTema,
  espaco,
  margemTela,
  raio,
  toque,
  estilosDeTexto,
  duracao,
} from '../../theme';
import {
  ANTECEDENCIA_MINUTOS,
  dataDaConsulta,
  garantirPermissao,
  notificacoesPermitidas,
  sincronizarLembretes,
} from '../../services/lembretes';
import {
  saudacaoPorHorario,
  quandoRelativo,
  nomeCurtoDoDia,
  nomeDoMes,
  formatarFaixa,
  formatarDiaEHora,
  formatarHorario,
} from '../../services/datas';
import { vibrarSelecao } from '../../services/haptica';
import { especialidadeERegistro } from '../../services/profissionais';

// Inicio do paciente: a proxima consulta em destaque, o aviso dos
// lembretes e as ultimas consultas. Tudo vem da API e do usuario logado.

// Mesma regra do servidor: remarcar ou cancelar pelo app so com 24 h.
const ANTECEDENCIA_MINIMA_MS = 24 * 60 * 60 * 1000;
const MAX_ULTIMAS = 5;

// Rolagem em que o numeral chega ao menor tamanho, e em que a data ja saiu
// da tela e vira a capsula de vidro.
const FIM_DO_ENCOLHER = 180;
const LIMITE_DA_CAPSULA = 260;

const LEMBRETE =
  ANTECEDENCIA_MINUTOS === 60 ? 'uma hora' : `${ANTECEDENCIA_MINUTOS} minutos`;

function BlocoDestaque({ children }) {
  const { cores } = useTema();
  const insets = useSafeAreaInsets();

  return (
    <PlanoTopo
      fundo={cores.destaque}
      corTexto={cores.sobrePlano}
      style={{
        paddingTop: insets.top + espaco.xs,
        paddingHorizontal: margemTela + 2,
        paddingBottom: 26,
        gap: 22,
      }}
    >
      <View style={{ minHeight: toque.minimo, justifyContent: 'center' }}>
        <Logotipo cor="sobrePlano" />
      </View>
      {children}
    </PlanoTopo>
  );
}

function ProximaConsulta({ consulta, medico, primeiroNome, navigation, rolagem }) {
  const { cores, movimentoReduzido } = useTema();

  // Preso a rolagem, sem tempo fixo. Com "reduzir movimento" nao encolhe:
  // so a capsula troca de uma vez.
  const estiloDoNumeral = useAnimatedStyle(() => {
    if (movimentoReduzido) return {};
    return {
      transform: [
        {
          scale: interpolate(
            rolagem.get(),
            [0, FIM_DO_ENCOLHER],
            [1, 0.7],
            Extrapolation.CLAMP,
          ),
        },
      ],
    };
  });
  const quando = dataDaConsulta(consulta);
  const falta = quando - new Date();
  const podeAlterar = falta >= ANTECEDENCIA_MINIMA_MS;
  const limite = new Date(quando.getTime() - ANTECEDENCIA_MINIMA_MS);

  return (
    <View style={{ gap: 18 }}>
      <View style={{ gap: 2 }}>
        <Texto variante="rotulo" cor="sobrePlano2">
          {saudacaoPorHorario(new Date())}
          {primeiroNome ? `, ${primeiroNome}` : ''}
        </Texto>
        <Texto variante="corpoForte" cor="sobrePlano" accessibilityRole="header">
          Sua próxima consulta
        </Texto>
      </View>

      <View
        accessible
        accessibilityLabel={`Dia ${quando.getDate()} de ${nomeDoMes(quando)}, ${formatarFaixa(quando)}, ${quandoRelativo(quando)}`}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}
      >
        <Animated.View style={[{ transformOrigin: 'left center' }, estiloDoNumeral]}>
          <NumeralRolante
            chave="inicio-data"
            valor={quando.getDate()}
            tamanho="grande"
            cor="sobrePlano"
          />
        </Animated.View>
        <View style={{ flex: 1, gap: 4 }}>
          <Texto variante="titulo" cor="sobrePlano">
            {nomeDoMes(quando)} · {nomeCurtoDoDia(quando)}
          </Texto>
          <Texto variante="corpo" cor="sobrePlano2" tabular>
            {formatarFaixa(quando)}
          </Texto>
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
              {quandoRelativo(quando)}
            </Texto>
          </View>
        </View>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: espaco.sm }}>
        <Avatar nome={medico?.nome} fotoUri={medico?.fotoUri} tom="vidro" />
        <View style={{ flex: 1, gap: 2 }}>
          <Texto variante="corpoForte" cor="sobrePlano">
            {medico?.nome ?? 'Profissional'}
          </Texto>
          {especialidadeERegistro(medico) ? (
            <Texto variante="rotulo" cor="sobrePlano2">
              {especialidadeERegistro(medico)}
            </Texto>
          ) : null}
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Botao
          titulo="Ver detalhes"
          variante="inverso"
          style={{ flex: 1 }}
          onPress={() =>
            navigation.navigate('DetalheConsulta', {
              consultaId: String(consulta.id),
            })
          }
        />
        {podeAlterar ? (
          <Botao
            titulo="Remarcar"
            variante="contornoClaro"
            style={{ flex: 1 }}
            onPress={() => navigation.navigate('Agendar', { consulta })}
          />
        ) : null}
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 6 }}>
        <Feather
          name="clock"
          size={14}
          color={cores.sobrePlano2}
          style={{ marginTop: 2 }}
        />
        <Texto variante="legenda" cor="sobrePlano2" style={{ flex: 1 }}>
          {podeAlterar
            ? `Remarcação livre até ${formatarDiaEHora(limite)}`
            : 'Faltam menos de 24 h. Para remarcar, ligue para a recepção.'}
        </Texto>
      </View>
    </View>
  );
}

// Sem consulta: o topo so cumprimenta; a ilustracao fica abaixo dele.
// A data que saiu da tela, numa capsula de vidro no alto. No iOS 26 o
// vidro do sistema nao aceita pai com opacidade animada: ali so aparece.
function CapsulaDaData({ quando, animar, onPress }) {
  const insets = useSafeAreaInsets();
  const comFade = animar && modoDoVidro !== 'liquido';

  return (
    <Animated.View
      entering={comFade ? FadeIn.duration(duracao.camada) : undefined}
      exiting={comFade ? FadeOut.duration(duracao.camada) : undefined}
      pointerEvents="box-none"
      style={{ position: 'absolute', top: insets.top + espaco.xs, left: espaco.md }}
    >
      <Pressionavel
        escala={escalaDoVidro}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`Próxima consulta, ${quando.getDate()} de ${nomeDoMes(quando)} às ${formatarHorario(quando)}`}
      >
        <Vidro interativo>
          <View
            style={{
              minHeight: toque.minimo,
              justifyContent: 'center',
              paddingHorizontal: espaco.md,
            }}
          >
            <Texto variante="rotuloForte" tabular>
              {quando.getDate()} {nomeDoMes(quando)} · {formatarHorario(quando)}
            </Texto>
          </View>
        </Vidro>
      </Pressionavel>
    </Animated.View>
  );
}

function SemConsulta({ primeiroNome }) {
  return (
    <Texto variante="tituloGrande" cor="sobrePlano" accessibilityRole="header">
      Olá{primeiroNome ? `, ${primeiroNome}` : ''}
    </Texto>
  );
}

// Estado real dos lembretes neste aparelho. Ativar pede a permissao do
// sistema; negado para sempre, a pessoa e mandada aos ajustes.
function AvisoDeLembretes({ consultas }) {
  const { cores } = useTema();
  const [permitido, setPermitido] = useState(null);
  const [negado, setNegado] = useState(false);

  useEffect(() => {
    notificacoesPermitidas().then(setPermitido).catch(() => setPermitido(null));
  }, []);

  const ativar = async () => {
    try {
      const liberado = await garantirPermissao();
      setPermitido(liberado);
      setNegado(!liberado);
      if (liberado) sincronizarLembretes(consultas);
    } catch (e) {
      setNegado(true);
    }
  };

  if (permitido === null) return null;

  if (permitido) {
    return (
      <CartaoTinta
        accessibilityRole="summary"
        titulo="Lembretes ativos"
        texto={`Avisamos ${LEMBRETE} antes de cada consulta, neste aparelho.`}
        direita={
          <View
            style={{
              backgroundColor: cores.lavanda,
              borderRadius: raio.capsula,
              paddingHorizontal: espaco.sm,
              paddingVertical: 4,
            }}
          >
            <Texto variante="pequeno" cor="sobrePlano">
              Ativos
            </Texto>
          </View>
        }
      />
    );
  }

  return (
    <View
      style={{
        backgroundColor: cores.superficie,
        borderColor: cores.linha,
        borderWidth: 1,
        borderRadius: raio.cartao,
        borderCurve: 'continuous',
        padding: espaco.md,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
      }}
    >
      <View
        style={{
          width: toque.minimo,
          height: toque.minimo,
          borderRadius: raio.campo,
          backgroundColor: cores.lavandaSuave,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Feather name="bell-off" size={20} color={cores.sobreLavandaSuave} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Texto variante="rotuloForte">Lembretes de consulta</Texto>
        <Texto variante="legenda" cor="apoio">
          {negado
            ? 'As notificações estão desligadas. Ative nos ajustes do aparelho.'
            : `Um aviso neste aparelho ${LEMBRETE} antes de cada consulta.`}
        </Texto>
      </View>
      {!negado ? (
        <Botao titulo="Ativar" compacto onPress={ativar} />
      ) : null}
    </View>
  );
}

function Carregando() {
  return (
    <View accessibilityState={{ busy: true }} accessibilityLabel="Carregando o início">
      <BlocoDestaque>
        <Esqueleto sobreDestaque largura={180} altura={16} raio={5} />
        <Esqueleto sobreDestaque largura={220} altura={84} raio={12} />
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Esqueleto sobreDestaque altura={48} raio={14} style={{ flex: 1 }} />
          <Esqueleto sobreDestaque altura={48} raio={14} style={{ flex: 1 }} />
        </View>
      </BlocoDestaque>
      <View style={{ padding: margemTela + 2, gap: 14 }}>
        <Esqueleto largura={140} altura={16} raio={5} />
        <Esqueleto altura={44} raio={10} />
        <Esqueleto altura={44} raio={10} />
      </View>
    </View>
  );
}

export default function HomePaciente({
  navigation,
  usuario,
  consultas,
  medicos,
  carregando,
  erro,
  atualizando,
  aoAtualizar,
  aoTentar,
}) {
  const { cores, escuro, movimentoReduzido } = useTema();
  const focada = useIsFocused();
  const insets = useSafeAreaInsets();
  const espacoDaBarra = useEspacoDaBarra();
  const { aoRolar, rolou, rolagem } = useRolagem(60);
  const [capsula, setCapsula] = useState(false);

  useAnimatedReaction(
    () => rolagem.get() > LIMITE_DA_CAPSULA,
    (passou, antes) => {
      if (passou !== antes) scheduleOnRN(setCapsula, passou);
    },
  );

  const primeiroNome = String(usuario?.nome ?? '').split(' ')[0];
  const agora = new Date();
  const ordenadas = [...consultas].sort(
    (a, b) => dataDaConsulta(a) - dataDaConsulta(b),
  );
  const proxima = ordenadas.find((c) => dataDaConsulta(c) > agora);
  const ultimas = ordenadas
    .filter((c) => dataDaConsulta(c) <= agora)
    .reverse()
    .slice(0, MAX_ULTIMAS);

  const abrirConsultas = useCallback(() => {
    navigation.push('Consultas', { viaAba: true, aba: 'anteriores' });
  }, [navigation]);

  let conteudo;

  if (carregando) {
    conteudo = <Carregando />;
  } else if (!usuario || (erro && consultas.length === 0)) {
    conteudo = (
      <View style={{ paddingTop: insets.top + espaco.xs, paddingHorizontal: margemTela + 2, gap: 20 }}>
        <View style={{ minHeight: toque.minimo, justifyContent: 'center' }}>
          <Logotipo cor="link" />
        </View>
        <EstadoErro aoTentar={aoTentar} />
      </View>
    );
  } else {
    conteudo = (
      <>
        <BlocoDestaque>
          {proxima ? (
            <ProximaConsulta
              consulta={proxima}
              medico={medicos[String(proxima.medicoId)]}
              primeiroNome={primeiroNome}
              navigation={navigation}
              rolagem={rolagem}
            />
          ) : (
            <SemConsulta primeiroNome={primeiroNome} />
          )}
        </BlocoDestaque>

        <View
          style={{
            paddingTop: espaco.lg,
            paddingHorizontal: margemTela + 2,
            paddingBottom: espacoDaBarra,
            gap: 22,
          }}
        >
          {!proxima ? (
            <EstadoVazio
              ilustracao
              titulo="Nenhuma consulta marcada"
              texto="Quando você agendar, a próxima aparece aqui, com a data bem grande."
              acao={{ titulo: 'Agendar consulta', onPress: () => navigation.navigate('Agendar') }}
              style={{ paddingVertical: espaco.md }}
            />
          ) : null}

          <AvisoDeLembretes consultas={consultas} />

          <View style={{ gap: 4 }}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <Texto variante="secao" accessibilityRole="header">
                Últimas consultas
              </Texto>
              {ultimas.length > 0 ? (
                <Botao variante="texto" compacto titulo="Ver todas" onPress={abrirConsultas} />
              ) : null}
            </View>

            {ultimas.length === 0 ? (
              <Texto variante="rotulo" cor="tinta2">
                Seu histórico aparece aqui depois da primeira consulta.
              </Texto>
            ) : (
              ultimas.map((c, indice) => (
                <ItemDeLista
                  key={String(c.id)}
                  titulo={formatarDiaEHora(dataDaConsulta(c))}
                  subtitulo={medicos[String(c.medicoId)]?.nome ?? 'Profissional'}
                  tabular
                  seta
                  divisor={indice < ultimas.length - 1}
                  onPress={() =>
                    navigation.navigate('DetalheConsulta', {
                      consultaId: String(c.id),
                    })
                  }
                />
              ))
            )}
          </View>
        </View>
      </>
    );
  }

  // O topo e lavanda nos dois temas: icones escuros enquanto ele aparece;
  // depois da rolagem a barra segue o tema.
  const sobreOTopo = !rolou && !carregando && Boolean(usuario);

  return (
    <View style={{ flex: 1, backgroundColor: cores.papel }}>
      {focada ? <StatusBar style={sobreOTopo || !escuro ? 'dark' : 'light'} /> : null}

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
          >
            {conteudo}
          </Animated.ScrollView>
        }
      >
        {usuario && !carregando ? (
          <View
            pointerEvents="box-none"
            style={{
              position: 'absolute',
              top: insets.top + espaco.xs,
              right: espaco.md,
            }}
          >
            <Pressionavel
              escala={escalaDoVidro}
              onPress={() => navigation.push('Perfil', { viaAba: true })}
              accessibilityRole="button"
              accessibilityLabel="Abrir perfil"
            >
              <Vidro
                espessura={rolou ? 'regular' : 'claro'}
                interativo
                style={{ width: toque.minimo, height: toque.minimo }}
              >
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                  {usuario.fotoUri ? (
                    <Avatar nome={usuario.nome} fotoUri={usuario.fotoUri} tamanho={40} />
                  ) : (
                    <Texto
                      variante="rotuloForte"
                      cor={rolou ? 'tinta' : 'sobreDestaque'}
                      maxFontSizeMultiplier={1.2}
                      style={estilosDeTexto.rotuloForte}
                    >
                      {iniciais(usuario.nome)}
                    </Texto>
                  )}
                </View>
              </Vidro>
            </Pressionavel>
          </View>
        ) : null}

        {capsula && proxima && !carregando ? (
          <CapsulaDaData
            quando={dataDaConsulta(proxima)}
            animar={!movimentoReduzido}
            onPress={() => {
              vibrarSelecao();
              navigation.navigate('DetalheConsulta', { consultaId: String(proxima.id) });
            }}
          />
        ) : null}

        <BarraAbas navigation={navigation} atual="Home" />
      </ComVidro>
    </View>
  );
}
