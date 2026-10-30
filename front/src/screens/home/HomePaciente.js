import React, { useCallback, useEffect, useState } from 'react';
import { RefreshControl, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useIsFocused } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import {
  Avatar,
  BarraAbas,
  Botao,
  ComVidro,
  Esqueleto,
  EstadoErro,
  ItemDeLista,
  Logotipo,
  Pressionavel,
  Texto,
  Vidro,
  escalaDoVidro,
  iniciais,
  useEspacoDaBarra,
  useRolagem,
} from '../../components';
import { useTema, espaco, margemTela, raio, toque, estilosDeTexto } from '../../theme';
import {
  dataDaConsulta,
  garantirPermissao,
  notificacoesPermitidas,
  sincronizarLembretes,
} from '../../services/lembretes';
import {
  saudacaoPorHorario,
  quandoRelativo,
  nomeDoMes,
  nomeLongoDoDia,
  formatarFaixa,
  formatarDiaEHora,
} from '../../services/datas';

// Inicio do paciente: a proxima consulta em destaque, o aviso dos
// lembretes e as ultimas consultas. Tudo vem da API e do usuario logado.

// Mesma regra do servidor: remarcar ou cancelar pelo app so com 24 h.
const ANTECEDENCIA_MINIMA_MS = 24 * 60 * 60 * 1000;
const MAX_ULTIMAS = 5;

function BlocoDestaque({ children }) {
  const { cores } = useTema();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={{
        backgroundColor: cores.destaque,
        borderBottomLeftRadius: raio.destaque,
        borderBottomRightRadius: raio.destaque,
        borderCurve: 'continuous',
        paddingTop: insets.top + espaco.xs,
        paddingHorizontal: margemTela + 2,
        paddingBottom: 26,
        gap: 22,
      }}
    >
      <View style={{ minHeight: toque.minimo, justifyContent: 'center' }}>
        <Logotipo cor="sobreDestaque2" />
      </View>
      {children}
    </View>
  );
}

function ProximaConsulta({ consulta, medico, primeiroNome, navigation }) {
  const { cores } = useTema();
  const quando = dataDaConsulta(consulta);
  const falta = quando - new Date();
  const podeAlterar = falta >= ANTECEDENCIA_MINIMA_MS;
  const limite = new Date(quando.getTime() - ANTECEDENCIA_MINIMA_MS);

  return (
    <View style={{ gap: 18 }}>
      <View style={{ gap: 2 }}>
        <Texto variante="rotulo" cor="sobreDestaque2">
          {saudacaoPorHorario(new Date())}
          {primeiroNome ? `, ${primeiroNome}` : ''}
        </Texto>
        <Texto variante="secao" cor="sobreDestaque" accessibilityRole="header">
          Sua próxima consulta é {quandoRelativo(quando)}
        </Texto>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'flex-end', flexWrap: 'wrap', gap: 14 }}>
        <Texto
          variante="dataGrande"
          cor="dataDestaque"
          tabular
          maxFontSizeMultiplier={1.15}
        >
          {quando.getDate()}
        </Texto>
        <View style={{ gap: 2, paddingBottom: 6 }}>
          <Texto variante="titulo" cor="sobreDestaque">
            {nomeDoMes(quando)} · {nomeLongoDoDia(quando)}
          </Texto>
          <Texto variante="corpo" cor="sobreDestaque2" tabular>
            {formatarFaixa(quando)}
          </Texto>
        </View>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: espaco.sm }}>
        <Avatar nome={medico?.nome} fotoUri={medico?.fotoUri} />
        <View style={{ flex: 1, gap: 2 }}>
          <Texto variante="corpoForte" cor="sobreDestaque">
            {medico?.nome ?? 'Profissional'}
          </Texto>
          {medico?.especialidade ? (
            <Texto variante="rotulo" cor="sobreDestaque2">
              {medico.especialidade}
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
          color={cores.sobreDestaque2}
          style={{ marginTop: 2 }}
        />
        <Texto variante="legenda" cor="sobreDestaque2" style={{ flex: 1 }}>
          {podeAlterar
            ? `Remarcação livre até ${formatarDiaEHora(limite)}`
            : 'Faltam menos de 24 h. Para remarcar, ligue para a recepção.'}
        </Texto>
      </View>
    </View>
  );
}

function SemConsulta({ primeiroNome, navigation }) {
  return (
    <View style={{ gap: 18 }}>
      <View style={{ gap: 4 }}>
        <Texto variante="rotulo" cor="sobreDestaque2">
          {saudacaoPorHorario(new Date())}
          {primeiroNome ? `, ${primeiroNome}` : ''}
        </Texto>
        <Texto variante="titulo" cor="sobreDestaque" accessibilityRole="header">
          Nenhuma consulta marcada
        </Texto>
      </View>
      <Texto variante="corpo" cor="sobreDestaque2">
        Quando você agendar, ela aparece aqui com data, profissional e lembrete.
      </Texto>
      <Botao
        titulo="Agendar uma consulta"
        variante="inverso"
        onPress={() => navigation.navigate('Agendar')}
      />
    </View>
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
      <View
        accessibilityRole="summary"
        style={{
          backgroundColor: cores.lavandaSuave,
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
            borderRadius: raio.capsula,
            backgroundColor: cores.acao,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Feather name="bell" size={20} color={cores.sobreAcao} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Texto variante="rotuloForte" cor="sobreLavandaSuave">
            Lembretes ativos
          </Texto>
          <Texto variante="legenda" cor="sobreLavandaSuave">
            Você recebe um aviso neste aparelho uma hora antes de cada consulta.
          </Texto>
        </View>
      </View>
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
            : 'Um aviso neste aparelho uma hora antes de cada consulta.'}
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
  const { cores, escuro } = useTema();
  const focada = useIsFocused();
  const insets = useSafeAreaInsets();
  const espacoDaBarra = useEspacoDaBarra();
  const { aoRolar, rolou } = useRolagem(60);

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
            />
          ) : (
            <SemConsulta primeiroNome={primeiroNome} navigation={navigation} />
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

        <BarraAbas navigation={navigation} atual="Home" />
      </ComVidro>
    </View>
  );
}
