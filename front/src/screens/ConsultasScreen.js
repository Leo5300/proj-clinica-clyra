import React, { useState, useCallback, useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
  listarLembretesAgendados,
  notificacoesPermitidas,
  sincronizarLembretes,
} from '../services/lembretes';
import { useUsuario } from '../services/sessao';
import {
  formatarDiaEHora,
  formatarHorario,
  nomeDoMes,
  nomeLongoDoDia,
} from '../services/datas';
import { TITULO_CONSULTAS } from '../navigation/permissoes';
import {
  BarraAbas,
  Botao,
  Cabecalho,
  ComVidro,
  Esqueleto,
  EstadoErro,
  EstadoVazio,
  ItemDeLista,
  Pressionavel,
  Segmentado,
  Selo,
  Texto,
  ehAba,
  useEspacoDaBarra,
  useRolagem,
} from '../components';
import { useTema, espaco, margemTela, raio, toque, duracao, planoDaArea } from '../theme';

// Lista de consultas. O servidor ja devolve so as que o perfil pode ver:
// recepcao ve todas, medico a propria agenda, paciente as proprias.
// Para o paciente, mostra tambem quantos lembretes o aparelho tem
// agendados: e a conferencia de que cancelar consulta cancela lembrete.

const MAX_ANTERIORES = 20;

const ABAS = [
  { valor: 'proximas', rotulo: 'Próximas' },
  { valor: 'anteriores', rotulo: 'Anteriores' },
];

// Altura do segmento de vidro e o respiro abaixo dele.
const ALTURA_SEGMENTO = 52;

const TROCA_DE_LISTA = FadeIn.duration(duracao.lista);

function mesmoDia(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

// Proximas = de hoje em diante, em ordem de chegada. Anteriores = antes
// de hoje, da mais recente para a mais antiga.
function separar(consultas) {
  const agora = new Date();
  const inicioDeHoje = new Date(
    agora.getFullYear(),
    agora.getMonth(),
    agora.getDate(),
  );
  const ordenadas = [...consultas].sort(
    (a, b) => dataDaConsulta(a) - dataDaConsulta(b),
  );

  return {
    proximas: ordenadas.filter((c) => dataDaConsulta(c) >= inicioDeHoje),
    anteriores: ordenadas
      .filter((c) => dataDaConsulta(c) < inicioDeHoje)
      .reverse()
      .slice(0, MAX_ANTERIORES),
  };
}

const maiuscula = (texto) => `${texto[0].toUpperCase()}${texto.slice(1)}`;

// plano (opcional): azulejo da data na cor da area da consulta, no paciente.
function CartaoProxima({ consulta, primeira, linha, tomDoSelo, plano, onPress }) {
  const { cores } = useTema();
  const quando = dataDaConsulta(consulta);
  const hoje = mesmoDia(quando, new Date());

  return (
    <Pressionavel
      onPress={onPress}
      accessibilityRole="button"
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        padding: espaco.md,
        borderRadius: raio.cartao,
        borderCurve: 'continuous',
        backgroundColor: cores.superficie,
        borderWidth: 1,
        borderColor: cores.linha,
      }}
    >
      <View
        style={{
          width: 56,
          minHeight: 62,
          borderRadius: 14,
          borderCurve: 'continuous',
          backgroundColor: plano ? plano.fundo : primeira ? cores.destaque : cores.superficie2,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Texto variante="pequeno" cor={plano ? plano.texto2 : primeira ? 'sobreDestaque2' : 'apoio'}>
          {nomeDoMes(quando)}
        </Texto>
        <Texto
          variante="tituloMedio"
          cor={plano ? plano.texto : primeira ? 'sobreDestaque' : 'tinta'}
          tabular
          maxFontSizeMultiplier={1.2}
        >
          {quando.getDate()}
        </Texto>
      </View>

      <View style={{ flex: 1, gap: 3 }}>
        <Texto variante="corpoForte" tabular>
          {hoje ? 'Hoje' : maiuscula(nomeLongoDoDia(quando))} · {formatarHorario(quando)}
        </Texto>
        <Texto variante="legenda" cor="apoio">
          {linha}
        </Texto>
        <Selo texto="Agendada" tom={tomDoSelo} icone="calendar" style={{ marginTop: 3 }} />
      </View>

      <Feather name="chevron-right" size={20} color={cores.apoio} />
    </Pressionavel>
  );
}

function CarregandoLista() {
  return (
    <View style={{ gap: 10 }} accessibilityState={{ busy: true }}>
      {[0, 1, 2].map((i) => (
        <Esqueleto key={i} altura={96} raio={raio.cartao} />
      ))}
    </View>
  );
}

export default function ConsultasScreen({ navigation, route }) {
  const { usuario } = useUsuario();
  const { cores } = useTema();
  const insets = useSafeAreaInsets();
  const espacoDaBarra = useEspacoDaBarra();

  const perfil = usuario?.perfil;
  const ehPaciente = perfil === 'paciente';
  const podeAgendar = perfil === 'recepcao' || perfil === 'paciente';
  const comoAba = ehAba(perfil, 'Consultas');

  const [aba, setAba] = useState(route.params?.aba ?? 'proximas');
  const [consultas, setConsultas] = useState([]);
  const [pacientes, setPacientes] = useState({});
  const [medicos, setMedicos] = useState({});
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);
  const [lembretesAgendados, setLembretesAgendados] = useState(null);
  const [permitido, setPermitido] = useState(true);

  const { rolagem, aoRolar } = useRolagem();
  const alturaDoTitulo = useSharedValue(38);

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

  // A lista nova comeca do topo: o segmento volta para baixo do titulo.
  useEffect(() => {
    rolagem.set(0);
  }, [aba]);

  const nomeDoPaciente = (item) =>
    pacientes[String(item.pacienteId)]?.nome ?? 'Paciente';
  const medicoDa = (item) => medicos[String(item.medicoId)];

  // Segunda linha de cada consulta: quem o perfil precisa ver.
  const linhaDe = (item) => {
    if (perfil === 'medico') return nomeDoPaciente(item);

    const medico = medicoDa(item);
    if (perfil === 'paciente') {
      // A cor da area no azulejo vem sempre com o nome escrito.
      return [medico?.nome ?? 'Profissional', medico?.especialidade, medico?.area]
        .filter(Boolean)
        .join(' · ');
    }

    return `${nomeDoPaciente(item)} · ${medico?.nome ?? 'Profissional'}`;
  };

  const abrir = (item) =>
    navigation.navigate('DetalheConsulta', { consultaId: String(item.id) });

  const { proximas, anteriores } = separar(consultas);
  const dados = aba === 'proximas' ? proximas : anteriores;

  // Topo da lista: abaixo do voltar quando a tela nao e aba.
  const topoFixo = insets.top + espaco.xs + (comoAba ? 0 : toque.minimo + espaco.xs);
  const topoDaLista = topoFixo + espaco.md;

  // O segmento comeca abaixo do titulo e, ao rolar, para no topo: segue a
  // rolagem no thread de UI, sem render.
  const estiloSegmento = useAnimatedStyle(() => {
    const repouso = topoDaLista + alturaDoTitulo.get() + espaco.md;
    return {
      transform: [{ translateY: Math.max(topoFixo, repouso - rolagem.get()) }],
    };
  });

  const titulo = ehPaciente
    ? 'Suas consultas'
    : TITULO_CONSULTAS[perfil] ?? 'Consultas';

  const cabecalhoDaLista = (
    <View style={{ gap: espaco.md, marginBottom: espaco.md }}>
      <Texto
        variante="tituloGrande"
        accessibilityRole="header"
        onLayout={(e) => alturaDoTitulo.set(e.nativeEvent.layout.height)}
      >
        {titulo}
      </Texto>
      <View style={{ height: ALTURA_SEGMENTO }} />

      {ehPaciente && !permitido && (
        // Sem permissao o lembrete falha em silencio. A tela precisa dizer.
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'flex-start',
            gap: espaco.xs,
            backgroundColor: cores.lavandaSuave,
            borderRadius: raio.campo,
            padding: espaco.sm,
          }}
        >
          <Feather name="bell-off" size={14} color={cores.sobreLavandaSuave} style={{ marginTop: 2 }} />
          <Texto variante="legenda" cor="sobreLavandaSuave" style={{ flex: 1 }}>
            As notificações estão desativadas neste aparelho: nenhum lembrete
            de consulta vai aparecer. Ative nos ajustes do aparelho.
          </Texto>
        </View>
      )}
    </View>
  );

  const vazio = () => {
    if (carregando) return <CarregandoLista />;
    if (erro) return <EstadoErro texto={erro} aoTentar={carregar} />;

    if (aba === 'anteriores') {
      return (
        <EstadoVazio
          ilustracao
          titulo="Nada por aqui ainda"
          texto="Seu histórico aparece aqui depois da primeira consulta."
        />
      );
    }

    const textos = {
      paciente: 'Quando você agendar, ela aparece aqui com data e profissional.',
      medico: 'Nenhuma consulta na sua agenda.',
      recepcao: 'Nenhuma consulta agendada.',
    };

    return (
      <EstadoVazio
        ilustracao
        titulo="Nenhuma consulta marcada"
        texto={textos[perfil] ?? textos.recepcao}
        acao={
          podeAgendar
            ? { titulo: 'Agendar consulta', onPress: () => navigation.navigate('Agendar') }
            : null
        }
      />
    );
  };

  const renderItem = ({ item, index }) =>
    aba === 'proximas' ? (
      <CartaoProxima
        consulta={item}
        primeira={index === 0}
        linha={linhaDe(item)}
        tomDoSelo={ehPaciente ? 'papel' : 'lavanda'}
        plano={ehPaciente ? planoDaArea(medicoDa(item)?.area, cores) : null}
        onPress={() => abrir(item)}
      />
    ) : (
      <ItemDeLista
        titulo={formatarDiaEHora(dataDaConsulta(item))}
        subtitulo={linhaDe(item)}
        tabular
        seta
        onPress={() => abrir(item)}
      />
    );

  return (
    <View style={{ flex: 1, backgroundColor: cores.papel }}>
      <ComVidro
        conteudo={
          <Animated.View key={aba} entering={TROCA_DE_LISTA} style={{ flex: 1 }}>
            <Animated.FlatList
              data={carregando || erro ? [] : dados}
              keyExtractor={(item) => String(item.id)}
              renderItem={renderItem}
              onScroll={aoRolar}
              scrollEventThrottle={16}
              ItemSeparatorComponent={
                aba === 'proximas' ? () => <View style={{ height: 10 }} /> : null
              }
              ListHeaderComponent={cabecalhoDaLista}
              ListEmptyComponent={vazio()}
              ListFooterComponent={
                ehPaciente && lembretesAgendados !== null && !carregando ? (
                  <Texto
                    variante="legenda"
                    cor="apoio"
                    style={{ textAlign: 'center', marginTop: espaco.md }}
                  >
                    Lembretes agendados neste aparelho: {lembretesAgendados}
                  </Texto>
                ) : null
              }
              contentContainerStyle={{
                paddingTop: topoDaLista,
                paddingHorizontal: margemTela + 2,
                paddingBottom: comoAba ? espacoDaBarra : insets.bottom + espaco.xl,
              }}
            />
          </Animated.View>
        }
      >
        <Animated.View
          pointerEvents="box-none"
          style={[
            {
              position: 'absolute',
              top: 0,
              left: espaco.md,
              right: espaco.md,
            },
            estiloSegmento,
          ]}
        >
          <Segmentado
            variante="vidro"
            rotuloDoGrupo="Mostrar"
            opcoes={ABAS}
            valor={aba}
            aoMudar={setAba}
          />
        </Animated.View>

        {comoAba ? (
          <BarraAbas navigation={navigation} atual="Consultas" />
        ) : (
          <Cabecalho
            flutuante
            aoVoltar={() => navigation.goBack()}
            direita={
              podeAgendar ? (
                // Tinta, nao vidro: o voltar e o segmento ja usam o
                // limite de dois desfoques da tela.
                <Botao
                  variante="tinta"
                  icone="plus"
                  compacto
                  accessibilityLabel="Agendar consulta"
                  onPress={() => navigation.navigate('Agendar')}
                />
              ) : null
            }
          />
        )}
      </ComVidro>
    </View>
  );
}
