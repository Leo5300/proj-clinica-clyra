// Confirmacao de que deu certo: o check se desenha em 320 ms junto com a vibracao de sucesso. titulo; texto; style. Sem confete.
import React, { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';
import Texto from './Texto';
import { useTema, espaco, duracao, curva } from '../theme';
import { vibrarSucesso } from '../services/haptica';

const TAMANHO = 64;

export default function SeloSucesso({ titulo, texto, style }) {
  const { cores, movimentoReduzido } = useTema();

  // Uma "cortina" da cor do circulo sai de cima do check, da esquerda para
  // a direita: parece que o traco esta sendo desenhado. So transform.
  const cortina = useSharedValue(0);

  useEffect(() => {
    vibrarSucesso();
    cortina.set(
      movimentoReduzido
        ? TAMANHO
        : withDelay(80, withTiming(TAMANHO, { duration: duracao.sucesso, easing: curva.saida })),
    );
  }, []);

  const estiloCortina = useAnimatedStyle(() => ({
    transform: [{ translateX: cortina.get() }],
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
          backgroundColor: cores.salviaSuave,
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        <Feather name="check" size={32} color={cores.sobreSalviaSuave} />
        <Animated.View
          style={[
            {
              position: 'absolute',
              top: 0,
              bottom: 0,
              left: 0,
              width: TAMANHO,
              backgroundColor: cores.salviaSuave,
            },
            estiloCortina,
          ]}
        />
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
