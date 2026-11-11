import React from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { buscarConsultas } from '../services/api';
import { detectarConflitosAgrupadoEmFatias } from '../services/conflitos';
import { useTarefaPesada } from '../services/useTarefaPesada';
import {
  Botao,
  Cabecalho,
  ComVidro,
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

// A tarefa pesada. Buscar da API e espera: await nao trava a tela. Conferir e
// calculo: roda em fatias.
async function verificar({ aoProgredir }) {
  const consultas = await buscarConsultas();
  const deteccao = await detectarConflitosAgrupadoEmFatias(consultas, {
    aoProgredir,
  });

  return { total: consultas.length, ...deteccao };
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
    </View>
  );
}

export default function SincronizarAgendaScreen({ navigation }) {
  const { cores } = useTema();
  const insets = useSafeAreaInsets();
  const { aoRolar, rolou } = useRolagem(50);
  const {
    rodando,
    resultado,
    iniciar,
  } = useTarefaPesada(verificar);

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
              {resultado ? <Resumo resultado={resultado} /> : null}
            </View>
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
