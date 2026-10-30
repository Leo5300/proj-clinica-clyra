// Campo de texto com rotulo e erro. rotulo; erro (texto abaixo, em alerta); nota (ajuda abaixo); style (do bloco); demais props vao para o TextInput.
import React from 'react';
import { TextInput, View } from 'react-native';
import Texto from './Texto';
import { useTema, estilosDeTexto, espaco, raio, toque } from '../theme';

const Campo = React.forwardRef(function Campo(
  { rotulo, erro, nota, style, editable = true, multiline, ...props },
  ref,
) {
  const { cores } = useTema();

  return (
    <View style={[{ gap: 6 }, style]}>
      {rotulo ? (
        <Texto variante="rotulo" cor="tinta2">
          {rotulo}
        </Texto>
      ) : null}
      <TextInput
        ref={ref}
        placeholderTextColor={cores.desativado}
        editable={editable}
        multiline={multiline}
        accessibilityLabel={rotulo}
        style={[
          estilosDeTexto.corpo,
          {
            color: editable ? cores.tinta : cores.apoio,
            backgroundColor: editable ? cores.superficie : cores.superficie2,
            borderWidth: 1,
            borderColor: erro ? cores.alerta : cores.linha,
            borderRadius: raio.botao,
            borderCurve: 'continuous',
            paddingHorizontal: espaco.md,
            paddingVertical: espaco.sm,
            minHeight: toque.botao + 4,
            textAlignVertical: multiline ? 'top' : 'center',
          },
        ]}
        {...props}
      />
      {erro ? (
        <Texto variante="legenda" cor="alerta">
          {erro}
        </Texto>
      ) : nota ? (
        <Texto variante="legenda" cor="apoio">
          {nota}
        </Texto>
      ) : null}
    </View>
  );
});

export default Campo;
