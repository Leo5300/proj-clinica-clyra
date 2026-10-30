// Fundo de toda tela: papel do tema e area segura. bordas (padrao ['top']; telas com vidro flutuante usam []); style; children.
import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTema } from '../theme';

export default function Tela({ bordas = ['top'], style, children }) {
  const { cores } = useTema();

  return (
    <SafeAreaView
      edges={bordas}
      style={[{ flex: 1, backgroundColor: cores.papel }, style]}
    >
      {children}
    </SafeAreaView>
  );
}
