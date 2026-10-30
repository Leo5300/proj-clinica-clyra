// Estado vazio: diz o que falta e o proximo passo. titulo; texto; acao { titulo, onPress }; ilustracao (formas geometricas, centralizado); style.
import React from 'react';
import { View } from 'react-native';
import Texto from './Texto';
import Botao from './Botao';
import IlustracaoVazio from './IlustracaoVazio';
import { espaco } from '../theme';

export default function EstadoVazio({ titulo, texto, acao, ilustracao = false, style }) {
  if (ilustracao) {
    return (
      <View
        style={[
          { alignItems: 'center', gap: espaco.xs, paddingVertical: espaco.xl },
          style,
        ]}
      >
        <IlustracaoVazio style={{ marginBottom: espaco.lg }} />
        {titulo ? (
          <Texto variante="titulo" style={{ textAlign: 'center' }} accessibilityRole="header">
            {titulo}
          </Texto>
        ) : null}
        {texto ? (
          <Texto variante="rotulo" cor="tinta2" style={{ textAlign: 'center', maxWidth: 300 }}>
            {texto}
          </Texto>
        ) : null}
        {acao ? (
          <Botao
            titulo={acao.titulo}
            onPress={acao.onPress}
            style={{ marginTop: espaco.md, alignSelf: 'stretch' }}
          />
        ) : null}
      </View>
    );
  }

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
