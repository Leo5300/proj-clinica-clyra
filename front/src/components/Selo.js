// Selo de status em capsula. texto; tom: 'salvia' (agendada, ok) | 'neutro' | 'alerta' | 'atencao' | 'lavanda'; icone (Feather); style.
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
    case 'lavanda':
      return [cores.lavandaSuave, cores.sobreLavandaSuave];
    default:
      return [cores.salviaSuave, cores.sobreSalviaSuave];
  }
}

export default function Selo({ texto, tom = 'salvia', icone, style }) {
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
