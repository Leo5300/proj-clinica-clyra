// Cartao escuro para a informacao que importa (lembretes, regra das 24 horas, CVV). titulo; texto; direita (no ao lado do titulo); children (abaixo do texto); accessibilityRole; style.
//
// Tinta com texto claro: da ritmo entre os planos claros. No tema escuro o
// plano clareia um pouco e ganha borda, para nao sumir no papel.
import React from 'react';
import { View } from 'react-native';
import Texto from './Texto';
import { useTema, espaco } from '../theme';

export const RAIO_DO_CARTAO_TINTA = 20;

export default function CartaoTinta({
  titulo,
  texto,
  direita,
  children,
  accessibilityRole,
  style,
}) {
  const { cores, escuro } = useTema();

  return (
    <View
      accessibilityRole={accessibilityRole}
      style={[
        {
          backgroundColor: cores.planoTinta,
          borderRadius: RAIO_DO_CARTAO_TINTA,
          borderCurve: 'continuous',
          borderWidth: escuro ? 1 : 0,
          borderColor: cores.linhaForte,
          paddingVertical: espaco.md,
          paddingHorizontal: espaco.md + 2,
          gap: espaco.sm,
        },
        style,
      ]}
    >
      {titulo || texto || direita ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: espaco.sm }}>
          <View style={{ flex: 1, gap: 2 }}>
            {titulo ? (
              <Texto variante="corpoForte" cor={cores.sobrePlanoTinta}>
                {titulo}
              </Texto>
            ) : null}
            {texto ? (
              <Texto variante="legenda" cor={cores.sobrePlanoTinta2}>
                {texto}
              </Texto>
            ) : null}
          </View>
          {direita}
        </View>
      ) : null}
      {children}
    </View>
  );
}
