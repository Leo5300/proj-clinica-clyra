// Confirmacao de que deu certo: o check se desenha em 320 ms junto com a vibracao de sucesso. titulo; texto; style. Sem mola, sem salto, sem confete.
import React, { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  useAnimatedProps,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import Texto from './Texto';
import { useTema, espaco, duracao, curva } from '../theme';
import { vibrarSucesso } from '../services/haptica';

const TAMANHO = 64;
// Comprimento do traco do check (um pouco acima do real, para nao sobrar
// ponta visivel no inicio).
const TRACO = 40;

const CaminhoAnimado = Animated.createAnimatedComponent(Path);

export default function SeloSucesso({ titulo, texto, style }) {
  const { cores, movimentoReduzido } = useTema();

  // O traco "se desenha": o deslocamento do tracejado vai do comprimento
  // inteiro a zero. Com "reduzir movimento", ja aparece desenhado.
  const deslocamento = useSharedValue(movimentoReduzido ? 0 : TRACO);

  useEffect(() => {
    vibrarSucesso();
    if (!movimentoReduzido) {
      deslocamento.set(
        withDelay(80, withTiming(0, { duration: duracao.sucesso, easing: curva.saida })),
      );
    }
  }, []);

  const propsDoTraco = useAnimatedProps(() => ({
    strokeDashoffset: deslocamento.get(),
  }));

  return (
    <View
      accessibilityRole="alert"
      style={[{ alignItems: 'center', gap: espaco.sm }, style]}
    >
      <View
        style={{
          width: TAMANHO,
          height: TAMANHO,
          borderRadius: TAMANHO / 2,
          backgroundColor: cores.lavandaSuave,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Svg width={32} height={32} viewBox="0 0 32 32">
          <CaminhoAnimado
            d="M7 16.5 L13.5 23 L25.5 10"
            stroke={cores.sobreLavandaSuave}
            strokeWidth={3.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            strokeDasharray={TRACO}
            animatedProps={propsDoTraco}
          />
        </Svg>
      </View>
      {titulo ? (
        <Texto variante="tituloMedio" style={{ textAlign: 'center' }}>
          {titulo}
        </Texto>
      ) : null}
      {texto ? (
        <Texto variante="rotulo" cor="tinta2" style={{ textAlign: 'center' }}>
          {texto}
        </Texto>
      ) : null}
    </View>
  );
}
