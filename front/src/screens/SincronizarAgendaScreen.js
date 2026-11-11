import React, { useEffect } from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  SemPermissao,
  SessaoExpirada,
  buscarConsultas,
} from '../services/api';
import { detectarConflitosAgrupadoEmFatias } from '../services/conflitos';
import { useTarefaPesada } from '../services/useTarefaPesada';
import {
  Botao,
  Cabecalho,
  ComVidro,
  EstadoErro,
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

// A tarefa pesada. Buscar da API e espera: await nao trava a tela. Conferir e
// calculo: roda em fatias.
async function verificar({ sinal, aoProgredir }) {
  const consultas = await buscarConsultas();
  const deteccao = await detectarConflitosAgrupadoEmFatias(consultas, {
    sinal,
    aoProgredir,
  });

  return { total: consultas.length, ...deteccao };
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
