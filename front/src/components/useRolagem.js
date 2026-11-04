// Rolagem no thread de UI. Devolve { rolagem (valor compartilhado), aoRolar (para Animated.ScrollView/FlatList), rolou (true depois do limite) }.
import { useState } from 'react';
import {
  useAnimatedReaction,
  useAnimatedScrollHandler,
  useSharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

// O React so fica sabendo quando a rolagem cruza o limite -- nunca a cada
// quadro. E o que permite trocar o vidro do topo sem travar a lista.
export function useRolagem(limite = 40) {
  const rolagem = useSharedValue(0);
  const [rolou, setRolou] = useState(false);

  const aoRolar = useAnimatedScrollHandler((evento) => {
    rolagem.set(evento.contentOffset.y);
  });

  useAnimatedReaction(
    () => rolagem.get() > limite,
    (passou, antes) => {
      if (passou !== antes) scheduleOnRN(setRolou, passou);
    },
  );

  return { rolagem, aoRolar, rolou };
}
