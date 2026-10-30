// Numeral que rola como odometro ate o valor, so na primeira vez da sessao (420 ms, saida forte, sem vibracao). chave (o que conta como "primeira vez"); valor; tamanho; cor; style. Depois de rolar, ou com "reduzir movimento", e o Numeral comum.
//
// Cada algarismo e uma coluna 0..algarismo que sobe por translateY dentro
// de uma janela recortada da altura da linha. A altura vem da medida do
// proprio texto, para acompanhar o tamanho de fonte do aparelho.
import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import Numeral, { medidasDoNumeral } from './Numeral';
import { useTema, numerosTabulares, duracao, curva } from '../theme';
import { jaAconteceu, marcarComoFeito } from '../services/primeiraVez';

function Algarismo({ algarismo, progresso, altura, estilo }) {
  const coluna = Array.from({ length: algarismo + 1 }, (_, i) => i);

  const estiloDaColuna = useAnimatedStyle(() => ({
    transform: [{ translateY: -progresso.get() * algarismo * altura }],
  }));

  return (
    <View style={{ height: altura, overflow: 'hidden' }}>
      <Text style={[estilo, { opacity: 0 }]} maxFontSizeMultiplier={1.15}>
        {algarismo}
      </Text>
      <Animated.View style={[{ position: 'absolute', top: 0, left: 0, right: 0 }, estiloDaColuna]}>
        {coluna.map((n) => (
          <Text key={n} style={[estilo, { height: altura }]} maxFontSizeMultiplier={1.15}>
            {n}
          </Text>
        ))}
      </Animated.View>
    </View>
  );
}

export default function NumeralRolante({ chave, valor, tamanho = 'medio', cor = 'tinta', style }) {
  const { cores, movimentoReduzido } = useTema();
  const [rolando, setRolando] = useState(() => !movimentoReduzido && !jaAconteceu(chave));
  const [altura, setAltura] = useState(0);
  const progresso = useSharedValue(0);

  useEffect(() => {
    if (!rolando || altura === 0) return;
    marcarComoFeito(chave);
    progresso.set(
      withTiming(1, { duration: duracao.odometro, easing: curva.saida }, (terminou) => {
        if (terminou) scheduleOnRN(setRolando, false);
      }),
    );
  }, [rolando, altura]);

  if (!rolando) {
    return <Numeral valor={valor} tamanho={tamanho} cor={cor} style={style} />;
  }

  const estilo = [
    medidasDoNumeral(tamanho),
    numerosTabulares,
    { color: cores[cor] ?? cor },
  ];
  const algarismos = String(valor).split('');

  return (
    <View
      accessible
      accessibilityLabel={String(valor)}
      style={[{ flexDirection: 'row' }, style]}
    >
      {altura === 0 ? (
        // Mede a linha antes de rolar; invisivel por um quadro.
        <Text
          style={[estilo, { opacity: 0 }]}
          maxFontSizeMultiplier={1.15}
          onLayout={(e) => setAltura(e.nativeEvent.layout.height)}
        >
          {valor}
        </Text>
      ) : (
        algarismos.map((a, i) =>
          /\d/.test(a) ? (
            <Algarismo
              key={i}
              algarismo={Number(a)}
              progresso={progresso}
              altura={altura}
              estilo={estilo}
            />
          ) : (
            <Text key={i} style={estilo} maxFontSizeMultiplier={1.15}>
              {a}
            </Text>
          ),
        )
      )}
    </View>
  );
}
