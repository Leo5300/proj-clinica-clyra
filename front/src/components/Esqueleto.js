// Bloco de carregamento no formato do conteudo. largura; altura; raio; sobreDestaque (no plano lavanda do topo); style. Lavanda, pulsando devagar; com "reduzir movimento" fica parado.
import React from 'react';
import Animated from 'react-native-reanimated';
import { useTema, duracao } from '../theme';

// Pulso lento: so a opacidade respira, em 1,2 s. Nunca brilho diagonal,
// que custaria um desenho por quadro.
const RESPIRAR = {
  '0%': { opacity: 1 },
  '50%': { opacity: 0.55 },
  '100%': { opacity: 1 },
};

export default function Esqueleto({
  largura = '100%',
  altura = 16,
  raio = 8,
  sobreDestaque = false,
  style,
}) {
  const { cores, movimentoReduzido } = useTema();

  return (
    <Animated.View
      accessible={false}
      style={[
        {
          width: largura,
          height: altura,
          borderRadius: raio,
          borderCurve: 'continuous',
          backgroundColor: sobreDestaque ? cores.esqueletoDestaque : cores.esqueleto,
        },
        !movimentoReduzido && {
          animationName: RESPIRAR,
          animationDuration: duracao.esqueleto,
          animationIterationCount: 'infinite',
          animationTimingFunction: 'ease-in-out',
        },
        style,
      ]}
    />
  );
}
