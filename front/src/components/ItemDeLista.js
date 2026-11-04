// Linha de lista com divisor (historico, ajustes, cadastros). titulo; subtitulo; detalhe (terceira linha, cor de link); esquerda/direita (nos); seta; onPress; divisor (padrao true); tabular; style.
import React from 'react';
import { View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import Pressionavel from './Pressionavel';
import Texto from './Texto';
import { useTema, espaco, toque } from '../theme';

export default function ItemDeLista({
  titulo,
  subtitulo,
  detalhe,
  esquerda,
  direita,
  seta = false,
  onPress,
  divisor = true,
  tabular = false,
  corDoTitulo = 'tinta',
  accessibilityLabel,
  style,
}) {
  const { cores } = useTema();

  const conteudo = (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: espaco.sm,
          minHeight: toque.minimo + 12,
          paddingVertical: 14,
          borderBottomWidth: divisor ? 1 : 0,
          borderBottomColor: cores.linha,
        },
        style,
      ]}
    >
      {esquerda}
      <View style={{ flex: 1, gap: 2 }}>
        <Texto variante="corpoForte" cor={corDoTitulo} tabular={tabular}>
          {titulo}
        </Texto>
        {subtitulo ? (
          <Texto variante="legenda" cor="apoio">
            {subtitulo}
          </Texto>
        ) : null}
        {detalhe ? (
          <Texto variante="legendaForte" cor="link" tabular>
            {detalhe}
          </Texto>
        ) : null}
      </View>
      {direita}
      {seta ? <Feather name="chevron-right" size={20} color={cores.apoio} /> : null}
    </View>
  );

  if (!onPress) return conteudo;

  return (
    <Pressionavel
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      {conteudo}
    </Pressionavel>
  );
}
