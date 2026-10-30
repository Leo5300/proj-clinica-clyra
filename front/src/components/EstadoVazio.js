// Estado vazio: diz o que falta e o proximo passo, sem ilustracao generica. titulo; texto; acao { titulo, onPress }; style.
import React from 'react';
import { View } from 'react-native';
import Texto from './Texto';
import Botao from './Botao';
import { espaco } from '../theme';

export default function EstadoVazio({ titulo, texto, acao, style }) {
  return (
    <View style={[{ gap: espaco.xs, paddingVertical: espaco.lg }, style]}>
      {titulo ? <Texto variante="secao">{titulo}</Texto> : null}
      {texto ? (
        <Texto variante="rotulo" cor="tinta2">
          {texto}
        </Texto>
      ) : null}
      {acao ? (
        <Botao
          titulo={acao.titulo}
          onPress={acao.onPress}
          style={{ marginTop: espaco.xs, alignSelf: 'flex-start' }}
        />
      ) : null}
    </View>
  );
}
