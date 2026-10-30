// Etiqueta escrita da area (Psicologia ou Psiquiatria): a cor nunca aparece sozinha, o nome vai junto. area; ponto (mostra o ponto da cor antes do nome); style. Sem area, nao aparece.
import React from 'react';
import { View } from 'react-native';
import Texto from './Texto';
import { useTema, raio, estiloDeEtiqueta } from '../theme';

export default function EtiquetaArea({ area, ponto = false, style }) {
  const { cores } = useTema();
  if (!area) return null;

  const visual = estiloDeEtiqueta(area, cores);

  return (
    <View
      style={[
        {
          alignSelf: 'flex-start',
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          paddingVertical: 3,
          paddingHorizontal: 9,
          borderRadius: raio.capsula,
          backgroundColor: visual.fundo,
        },
        style,
      ]}
    >
      {ponto ? (
        <View
          style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: visual.ponto }}
        />
      ) : null}
      <Texto variante="pequeno" cor={visual.texto} maxFontSizeMultiplier={1.3}>
        {area}
      </Texto>
    </View>
  );
}
