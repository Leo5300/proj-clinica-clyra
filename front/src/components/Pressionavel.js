// Area tocavel com retorno de escala. escala: 'toque' (0,97 em 120 ms, padrao) | 'vidro' (1,04 em 160 ms) | 'nenhuma'; aceita as props do Pressable.
import React, { useState } from 'react';
import { Pressable } from 'react-native';
import Animated from 'react-native-reanimated';
import {
  useTema,
  duracao,
  curvaCss,
  escalaToque,
  escalaVidroToque,
} from '../theme';

const PressableAnimado = Animated.createAnimatedComponent(Pressable);

// O retorno aparece no toque (pressIn), nao quando o dedo sai: e essa a
// demora que a pessoa sente. Com "reduzir movimento", troca escala por
// opacidade -- o toque continua visivel, sem nada se mexer.
export default function Pressionavel({
  escala = 'toque',
  style,
  onPressIn,
  onPressOut,
  children,
  ...props
}) {
  const { movimentoReduzido } = useTema();
  const [pressionado, setPressionado] = useState(false);

  const vidro = escala === 'vidro';
  const alvo = vidro ? escalaVidroToque : escalaToque;
  const tempo = vidro ? duracao.vidroToque : duracao.toque;

  let retorno = null;
  if (escala !== 'nenhuma') {
    retorno = movimentoReduzido
      ? { opacity: pressionado ? 0.7 : 1 }
      : { transform: [{ scale: pressionado ? alvo : 1 }] };
  }

  return (
    <PressableAnimado
      pressRetentionOffset={16}
      onPressIn={(evento) => {
        setPressionado(true);
        onPressIn?.(evento);
      }}
      onPressOut={(evento) => {
        setPressionado(false);
        onPressOut?.(evento);
      }}
      style={[
        {
          transitionProperty: movimentoReduzido ? 'opacity' : 'transform',
          transitionDuration: tempo,
          transitionTimingFunction: curvaCss.saida,
        },
        retorno,
        style,
      ]}
      {...props}
    >
      {children}
    </PressableAnimado>
  );
}
