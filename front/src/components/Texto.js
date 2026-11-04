// Texto do app. variante = degrau da rampa (corpo, titulo, legenda...); cor = token da paleta (tinta, apoio, link...); tabular = numeros de largura fixa.
import React from 'react';
import { Text } from 'react-native';
import { useTema, estilosDeTexto, numerosTabulares } from '../theme';

export default function Texto({
  variante = 'corpo',
  cor = 'tinta',
  tabular = false,
  style,
  ...props
}) {
  const { cores } = useTema();

  return (
    <Text
      style={[
        estilosDeTexto[variante] ?? estilosDeTexto.corpo,
        { color: cores[cor] ?? cor },
        tabular && numerosTabulares,
        style,
      ]}
      {...props}
    />
  );
}
