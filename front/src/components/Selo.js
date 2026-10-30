// Selo de status em capsula. texto; tom: 'lavanda' (agendada, ok: confirmacao e lavanda suave, nunca verde) | 'neutro' | 'alerta' | 'atencao'; icone (Feather); style.
import React from 'react';
import { View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import Texto from './Texto';
import { useTema, raio } from '../theme';

function coresDoTom(tom, cores) {
  switch (tom) {
    case 'neutro':
      return [cores.neutroSuave, cores.sobreNeutro];
    case 'alerta':
      return [cores.alertaSuave, cores.alerta];
    case 'atencao':
      return [cores.atencaoSuave, cores.atencao];
    default:
      return [cores.lavandaSuave, cores.sobreLavandaSuave];
  }
}

export default function Selo({ texto, tom = 'lavanda', icone, style }) {
  const { cores } = useTema();
  const [fundo, cor] = coresDoTom(tom, cores);

  return (
    <View
      style={[
        {
          alignSelf: 'flex-start',
          flexDirection: 'row',
          alignItems: 'center',
          gap: 4,
          paddingVertical: 4,
          paddingHorizontal: 10,
          borderRadius: raio.capsula,
          backgroundColor: fundo,
        },
        style,
      ]}
    >
      {icone ? <Feather name={icone} size={12} color={cor} /> : null}
      <Texto variante="pequeno" cor={cor}>
        {texto}
      </Texto>
    </View>
  );
}
