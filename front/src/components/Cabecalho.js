// Cabecalho de tela. titulo; aoVoltar (mostra o voltar); direita (no); flutuante (vidro sobre o conteudo); rolou (com flutuante: o titulo vira capsula de vidro); style.
import React from 'react';
import { View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import Pressionavel from './Pressionavel';
import Vidro, { escalaDoVidro, modoDoVidro } from './Vidro';
import Texto from './Texto';
import { useTema, toque, espaco, areaDeToque, duracao } from '../theme';

// A capsula do titulo troca de camada em 200 ms. No iOS 26 o vidro do
// sistema nao pode ter pai com opacidade animada: ali ela so aparece.
const ENTRA = FadeIn.duration(duracao.camada);
const SAI = FadeOut.duration(duracao.camada);

function BotaoVoltarDeVidro({ aoVoltar }) {
  const { cores } = useTema();

  return (
    <Pressionavel
      onPress={aoVoltar}
      escala={escalaDoVidro}
      accessibilityRole="button"
      accessibilityLabel="Voltar"
    >
      <Vidro interativo style={{ width: toque.minimo, height: toque.minimo }}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Feather name="chevron-left" size={24} color={cores.tinta} />
        </View>
      </Vidro>
    </Pressionavel>
  );
}

export default function Cabecalho({
  titulo,
  aoVoltar,
  direita,
  flutuante = false,
  rolou = false,
  style,
}) {
  const { cores, movimentoReduzido } = useTema();
  const insets = useSafeAreaInsets();

  if (flutuante) {
    const animar = modoDoVidro !== 'liquido';

    return (
      <View
        pointerEvents="box-none"
        style={[
          {
            position: 'absolute',
            top: insets.top + espaco.xs,
            left: espaco.md,
            right: espaco.md,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
          },
          style,
        ]}
      >
        {aoVoltar ? <BotaoVoltarDeVidro aoVoltar={aoVoltar} /> : null}

        {rolou && titulo ? (
          <Animated.View
            entering={animar && !movimentoReduzido ? ENTRA : undefined}
            exiting={animar && !movimentoReduzido ? SAI : undefined}
            style={{ flexShrink: 1 }}
          >
            <Vidro>
              <View
                style={{
                  minHeight: toque.minimo,
                  justifyContent: 'center',
                  paddingHorizontal: espaco.md,
                }}
              >
                <Texto variante="rotuloForte" numberOfLines={1} accessibilityRole="header">
                  {titulo}
                </Texto>
              </View>
            </Vidro>
          </Animated.View>
        ) : null}

        <View style={{ flex: 1 }} />
        {direita}
      </View>
    );
  }

  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: espaco.xs,
          paddingHorizontal: espaco.xs,
          minHeight: toque.minimo + 12,
        },
        style,
      ]}
    >
      {aoVoltar ? (
        <Pressionavel
          onPress={aoVoltar}
          hitSlop={areaDeToque}
          accessibilityRole="button"
          accessibilityLabel="Voltar"
          style={{
            width: toque.minimo,
            height: toque.minimo,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Feather name="chevron-left" size={26} color={cores.tinta} />
        </Pressionavel>
      ) : (
        <View style={{ width: espaco.xs }} />
      )}

      <Texto
        variante="secao"
        numberOfLines={1}
        accessibilityRole="header"
        style={{ flex: 1, textAlign: 'center' }}
      >
        {titulo}
      </Texto>

      <View style={{ minWidth: toque.minimo, alignItems: 'flex-end' }}>{direita}</View>
    </View>
  );
}
