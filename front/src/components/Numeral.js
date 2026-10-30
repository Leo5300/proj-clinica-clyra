// Numero grande como marca: data, horario e contagens. valor; tamanho: 'grande' | 'medio' | 'pequeno' | numero em pt; cor (token da paleta ou cor); style.
//
// Bricolage Grotesque 800, tracking negativo (-0,06 em) e entrelinha menor
// que o corpo, com algarismos de largura fixa. Tudo aqui, para nenhuma
// tela montar o numeral na mao.
import React from 'react';
import { Text } from 'react-native';
import { useTema, fontes, numerosTabulares } from '../theme';

const TAMANHOS = {
  grande: 96,
  medio: 56,
  pequeno: 32,
};

export function medidasDoNumeral(tamanho) {
  const corpo = typeof tamanho === 'number' ? tamanho : TAMANHOS[tamanho] ?? TAMANHOS.medio;
  return {
    fontFamily: fontes.numeral,
    fontSize: corpo,
    // Menor que o corpo, mas sem cortar o topo do algarismo no Android.
    lineHeight: Math.round(corpo * 0.94),
    letterSpacing: -corpo * 0.06,
  };
}

export default function Numeral({
  valor,
  tamanho = 'medio',
  cor = 'tinta',
  style,
  ...props
}) {
  const { cores } = useTema();

  return (
    <Text
      maxFontSizeMultiplier={1.15}
      style={[
        medidasDoNumeral(tamanho),
        numerosTabulares,
        { color: cores[cor] ?? cor },
        style,
      ]}
      {...props}
    >
      {valor}
    </Text>
  );
}
