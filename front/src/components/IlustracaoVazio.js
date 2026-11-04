// Ilustracao dos estados vazios: formas geometricas simples, sem personagem. largura (padrao 170); style. Decorativa: o leitor de tela pula.
//
// Circulo lavanda, quadrado de cantos arredondados em tinta, um arco fino
// e um ponto manteiga.
import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { useTema } from '../theme';

const LARGURA = 170;
const ALTURA = 124;

export default function IlustracaoVazio({ largura = LARGURA, style }) {
  const { cores } = useTema();
  const altura = Math.round((largura * ALTURA) / LARGURA);

  return (
    <View
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      style={[{ width: largura, height: altura }, style]}
    >
      <Svg width={largura} height={altura} viewBox={`0 0 ${LARGURA} ${ALTURA}`}>
        <Circle cx={62} cy={66} r={44} fill={cores.lavanda} />
        <Rect x={84} y={40} width={64} height={64} rx={16} fill={cores.tinta} />
        <Path
          d="M14 116 A 64 64 0 0 1 124 82"
          stroke={cores.tinta}
          strokeWidth={3}
          strokeLinecap="round"
          fill="none"
        />
        <Circle cx={152} cy={22} r={10} fill={cores.manteiga} />
      </Svg>
    </View>
  );
}
