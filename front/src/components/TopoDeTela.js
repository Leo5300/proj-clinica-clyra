// Topo lavanda das telas de formulario (cadastros e sinais vitais): voltar, titulo e subtitulo sobre o plano com marca d'agua e grao. titulo; subtitulo; aoVoltar; style.
import React from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import PlanoTopo from './PlanoTopo';
import Pressionavel from './Pressionavel';
import Texto from './Texto';
import { useTema, espaco, margemTela, toque, areaDeToque } from '../theme';

export default function TopoDeTela({ titulo, subtitulo, aoVoltar, style }) {
  const { cores } = useTema();
  const insets = useSafeAreaInsets();

  return (
    <PlanoTopo
      fundo={cores.destaque}
      corTexto={cores.sobrePlano}
      style={[
        {
          paddingTop: insets.top + espaco.xs,
          paddingHorizontal: margemTela + 2,
          paddingBottom: espaco.lg,
          gap: 4,
        },
        style,
      ]}
    >
      <View style={{ minHeight: toque.minimo, justifyContent: 'center', marginBottom: espaco.xs }}>
        {aoVoltar ? (
          <Pressionavel
            onPress={aoVoltar}
            hitSlop={areaDeToque}
            accessibilityRole="button"
            accessibilityLabel="Voltar"
            style={{
              width: toque.minimo,
              height: toque.minimo,
              marginLeft: -10,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Feather name="chevron-left" size={28} color={cores.sobrePlano} />
          </Pressionavel>
        ) : null}
      </View>
      <Texto variante="tituloGrande" cor="sobrePlano" accessibilityRole="header">
        {titulo}
      </Texto>
      {subtitulo ? (
        <Texto variante="rotulo" cor="sobrePlano2">
          {subtitulo}
        </Texto>
      ) : null}
    </PlanoTopo>
  );
}
