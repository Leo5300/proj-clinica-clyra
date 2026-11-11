import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  SemPermissao,
  SessaoExpirada,
  buscarConsultas,
  buscarMedicos,
} from '../services/api';
import {
  detectarConflitosAgrupado,
  detectarConflitosAgrupadoEmFatias,
  detectarConflitosIngenuo,
  detectarConflitosIngenuoEmFatias,
  mesmosConflitos,
} from '../services/conflitos';
import { dataDaConsulta } from '../services/lembretes';
import { formatarDiaEMes } from '../services/datas';
import { useTarefaPesada } from '../services/useTarefaPesada';
import {
  Botao,
  Cabecalho,
  ComVidro,
  EstadoErro,
  ItemDeLista,
  Segmentado,
  Selo,
  Texto,
  useRolagem,
} from '../components';
import { useTema, espaco, margemTela, raio, toque } from '../theme';

// Verificacao da agenda: busca todas as consultas e procura horarios que se
// sobrepoem na agenda de cada profissional. So a recepcao ve todas as
// consultas, entao so ela abre esta tela (permissoes.js).
//
// Buscar da API com await nao trava a tela: e espera. O que pesa e conferir
// as consultas, e isso roda em fatias para a tela continuar respondendo.

// 12345 -> "12.345" (sem toLocaleString, que muda de aparelho para aparelho)
function formatarNumero(numero) {
  return String(numero).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function rotuloDeConflitos(total) {
  if (total === 0) {
    return 'Nenhum conflito';
  }

  return total === 1 ? '1 conflito' : `${total} conflitos`;
}

function textoDoErro(erro) {
  if (erro instanceof SemPermissao) {
    return erro.mensagem ?? 'Você não tem permissão para isso.';
  }

  return 'Não foi possível verificar a agenda.';
}

function estiloDoCartao(cores) {
  return {
    backgroundColor: cores.superficie,
    borderColor: cores.linha,
    borderWidth: 1,
    borderRadius: raio.cartao,
    borderCurve: 'continuous',
    padding: espaco.md,
    gap: espaco.md,
  };
}

// Roda as duas versoes em fatias e confere se acharam os mesmos pares. A barra
// de progresso cobre as duas: metade para cada uma.
async function conferirResultados(consultas, opcoes) {
  const { aoProgredir } = opcoes;

  const ingenuo = await detectarConflitosIngenuoEmFatias(consultas, {
    ...opcoes,
    aoProgredir: (valor) => aoProgredir?.(valor / 2),
  });
  const agrupado = await detectarConflitosAgrupadoEmFatias(consultas, {
    ...opcoes,
    aoProgredir: (valor) => aoProgredir?.(0.5 + valor / 2),
  });

  return {
    conflitos: agrupado.conflitos,
    comparacoes: ingenuo.comparacoes + agrupado.comparacoes,
    duracaoMs: ingenuo.duracaoMs + agrupado.duracaoMs,
    conferencia: {
      iguais: mesmosConflitos(ingenuo.conflitos, agrupado.conflitos),
      ingenuo: ingenuo.conflitos.length,
      agrupado: agrupado.conflitos.length,
    },
  };
}

// Quatro jeitos de fazer a mesma verificacao. A tela usa o ultimo; os outros
// existem para medir (bloco de medicao, so em desenvolvimento).
const MODOS = {
  'ingenuo-bloqueando': {
    rotulo: 'Todas × todas, bloqueando',
    bloqueia: true,
    detectar: detectarConflitosIngenuo,
  },
  'ingenuo-fatias': {
    rotulo: 'Todas × todas, em fatias',
    bloqueia: false,
    detectar: detectarConflitosIngenuoEmFatias,
  },
  'agrupado-bloqueando': {
    rotulo: 'Agrupada, bloqueando',
    bloqueia: true,
    detectar: detectarConflitosAgrupado,
  },
  'agrupado-fatias': {
    rotulo: 'Agrupada, em fatias',
    bloqueia: false,
    detectar: detectarConflitosAgrupadoEmFatias,
  },
  conferir: {
    rotulo: 'Conferir se as duas acham os mesmos pares',
    bloqueia: false,
    detectar: conferirResultados,
  },
};

const MODO_DA_TELA = 'agrupado-fatias';

// Tempo para a tela pintar o "verificando" antes de um modo que a congela.
const TEMPO_PARA_PINTAR_MS = 50;

// A tarefa pesada. Buscar da API e espera: await nao trava a tela. Conferir e
// calculo: roda em fatias.
async function verificar(
  { sinal, aoProgredir },
  modo = MODO_DA_TELA,
  tamanhoDaFatia,
) {
  const [consultas, medicos] = await Promise.all([
    buscarConsultas(),
    buscarMedicos(),
  ]);
  const { rotulo, bloqueia, detectar } = MODOS[modo];

  // Um modo que bloqueia congela a tela: espera um instante para o aviso de
  // "verificando" ser pintado antes de travar.
  if (bloqueia) {
    await new Promise((resolve) => setTimeout(resolve, TEMPO_PARA_PINTAR_MS));
  }

  const deteccao = await detectar(consultas, {
    tamanhoDaFatia,
    aoProgredir,
    sinal,
  });

  return {
    modo,
    rotulo,
    tamanhoDaFatia: bloqueia ? null : tamanhoDaFatia,
    total: consultas.length,
    medicos: Object.fromEntries(medicos.map((m) => [String(m.id), m.nome])),
    ...deteccao,
  };
}

// Barra que se move de verdade: cada fatia concluida avanca o valor (0 a 1).
// Sem animacao de proposito: ela so mostra o que realmente aconteceu.
function Progresso({ valor }) {
  const { cores } = useTema();
  const porcento = Math.round(valor * 100);

  return (
    <View style={{ gap: espaco.xs }}>
      <View
        accessibilityRole="progressbar"
        accessibilityValue={{ min: 0, max: 100, now: porcento }}
        style={{
          height: 10,
          borderRadius: raio.capsula,
          backgroundColor: cores.linha,
          overflow: 'hidden',
        }}
      >
        <View
          style={{
            height: 10,
            width: `${porcento}%`,
            backgroundColor: cores.acao,
          }}
        />
      </View>
      <Texto variante="pequeno" cor="apoio" tabular>
        {`Verificando… ${porcento}%`}
      </Texto>
    </View>
  );
}

const MAX_NA_LISTA = 20;

// Um item por par: o dia, os dois horarios e as duas consultas envolvidas.
function ListaDeConflitos({ conflitos, medicos }) {
  const mostrados = conflitos.slice(0, MAX_NA_LISTA);
  const restantes = conflitos.length - mostrados.length;

  return (
    <View>
      {mostrados.map(([a, b], indice) => (
        <ItemDeLista
          key={`${a.id}-${b.id}`}
          titulo={`${formatarDiaEMes(dataDaConsulta(a))} · ${a.hora} e ${b.hora}`}
          subtitulo={`${medicos[String(a.medicoId)] ?? 'Profissional'} · consultas #${a.id} e #${b.id}`}
          divisor={indice < mostrados.length - 1}
          tabular
        />
      ))}
      {restantes > 0 ? (
        <Texto variante="pequeno" cor="apoio" style={{ paddingTop: espaco.xs }}>
          {`e mais ${formatarNumero(restantes)}`}
        </Texto>
      ) : null}
    </View>
  );
}

function Resumo({ resultado }) {
  const achou = resultado.conflitos.length > 0;
  const { total, comparacoes, duracaoMs } = resultado;

  return (
    <View style={{ gap: espaco.xs }}>
      <Selo
        texto={rotuloDeConflitos(resultado.conflitos.length)}
        tom={achou ? 'atencao' : 'papel'}
        icone={achou ? 'alert-triangle' : 'check'}
      />
      <Texto variante="pequeno" cor="apoio" tabular>
        {`${formatarNumero(total)} consultas · ${formatarNumero(comparacoes)} comparações · ${duracaoMs} ms`}
      </Texto>
      {achou ? (
        <ListaDeConflitos
          conflitos={resultado.conflitos}
          medicos={resultado.medicos}
        />
      ) : null}
    </View>
  );
}

const FATIAS = [
  { valor: 100, rotulo: '100' },
  { valor: 500, rotulo: '500' },
  { valor: 5000, rotulo: '5000' },
];

function descreverMedida(medida) {
  if (medida.conferencia) {
    const { iguais, ingenuo, agrupado } = medida.conferencia;

    return `Conferência · todas × todas ${ingenuo} e agrupada ${agrupado} conflitos · ${iguais ? 'mesmos pares' : 'PARES DIFERENTES'}`;
  }
  const fatia = medida.tamanhoDaFatia
    ? ` · fatia ${medida.tamanhoDaFatia}`
    : '';

  return `${medida.rotulo}${fatia} · ${formatarNumero(medida.total)} consultas · ${formatarNumero(medida.comparacoes)} comparações · ${medida.duracaoMs} ms · ${medida.conflitos.length} conflitos`;
}

// So aparece em desenvolvimento (__DEV__): roda cada modo, com o tamanho de
// fatia escolhido, e lista as ultimas medidas para o README. Nos modos que
// bloqueiam, a barra pula de 0% a 100% e a tela nao responde: e o que o
// exercicio manda observar.
function Medicao({ rodando, resultado, iniciar }) {
  const { cores } = useTema();
  const [fatia, setFatia] = useState(500);
  const [medidas, setMedidas] = useState([]);

  useEffect(() => {
    if (resultado) {
      setMedidas((anteriores) => [resultado, ...anteriores].slice(0, 8));
    }
  }, [resultado]);

  return (
    <View style={estiloDoCartao(cores)}>
      <View style={{ gap: 4 }}>
        <Texto variante="secao" accessibilityRole="header">
          Medição
        </Texto>
        <Texto variante="legenda" cor="apoio">
          Só aparece em desenvolvimento. Olhe a barra e toque em outros
          elementos durante o cálculo, não só o cronômetro.
        </Texto>
      </View>

      <Segmentado
        rotuloDoGrupo="Tamanho da fatia"
        opcoes={FATIAS}
        valor={fatia}
        aoMudar={setFatia}
      />

      {Object.entries(MODOS).map(([modo, { rotulo }]) => (
        <Botao
          key={modo}
          titulo={rotulo}
          variante="contorno"
          compacto
          desativado={rodando}
          onPress={() => iniciar(modo, fatia)}
        />
      ))}

      {medidas.map((medida, indice) => (
        <Texto key={indice} variante="pequeno" cor="tinta2" tabular>
          {descreverMedida(medida)}
        </Texto>
      ))}
    </View>
  );
}

export default function SincronizarAgendaScreen({ navigation }) {
  const { cores } = useTema();
  const insets = useSafeAreaInsets();
  const { aoRolar, rolou } = useRolagem(50);
  const {
    rodando,
    progresso,
    resultado,
    erro,
    cancelado,
    iniciar,
    cancelar,
  } = useTarefaPesada(verificar);

  // Sessao expirada no meio da busca: volta para o login, como as outras telas.
  useEffect(() => {
    if (erro instanceof SessaoExpirada) {
      navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
    }
  }, [erro, navigation]);

  return (
    <View style={{ flex: 1, backgroundColor: cores.papel }}>
      <ComVidro
        conteudo={
          <Animated.ScrollView
            onScroll={aoRolar}
            scrollEventThrottle={16}
            contentContainerStyle={{
              paddingTop: insets.top + espaco.xs + toque.minimo + espaco.lg,
              paddingHorizontal: margemTela + 2,
              paddingBottom: insets.bottom + espaco.xl,
              gap: espaco.lg,
            }}
          >
            <View style={{ gap: 4 }}>
              <Texto variante="tituloGrande" accessibilityRole="header">
                Verificar agenda
              </Texto>
              <Texto variante="rotulo" cor="apoio">
                Procura horários sobrepostos na agenda de cada profissional.
              </Texto>
            </View>

            <View style={estiloDoCartao(cores)}>
              <Texto cor="tinta2">
                Busca todas as consultas da clínica e confere profissional por
                profissional. A tela continua respondendo enquanto confere.
              </Texto>
              <Botao
                titulo="Verificar agenda"
                icone="refresh-cw"
                carregando={rodando}
                onPress={() => iniciar()}
              />
              {rodando ? (
                <>
                  <Progresso valor={progresso} />
                  <Botao
                    titulo="Cancelar"
                    variante="contorno"
                    onPress={cancelar}
                  />
                </>
              ) : null}
              {cancelado ? (
                <Texto variante="rotulo" cor="apoio">
                  Verificação cancelada. Nada foi alterado.
                </Texto>
              ) : null}
              {erro ? (
                <EstadoErro
                  texto={textoDoErro(erro)}
                  aoTentar={() => iniciar()}
                />
              ) : null}
              {resultado ? <Resumo resultado={resultado} /> : null}
            </View>

            {__DEV__ ? (
              <Medicao
                rodando={rodando}
                resultado={resultado}
                iniciar={iniciar}
              />
            ) : null}
          </Animated.ScrollView>
        }
      >
        <Cabecalho
          flutuante
          titulo="Verificar agenda"
          rolou={rolou}
          aoVoltar={() => navigation.goBack()}
        />
      </ComVidro>
    </View>
  );
}
