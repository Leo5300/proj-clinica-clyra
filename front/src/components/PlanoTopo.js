// Plano colorido do topo das telas, com a marca d'agua e o grao. fundo (cor do plano); corTexto (cor do texto do plano: tinge a marca); marca (padrao true); arredondado (cantos de baixo, padrao true); style (espacamento do conteudo); children.
//
// A marca do CLYRA aparece grande, cortada no canto inferior direito, a 9%
// na cor do texto. O grao e um PNG pequeno em mosaico, a 6%: nada de ruido
// gerado em tempo de execucao. Os dois sao decorativos e nao recebem toque.
import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { raio } from '../theme';

const marca = require('../../assets/imgs/marca-clyra.png');
const grao = require('../../assets/imgs/grao.png');

// Proporcao do arquivo da marca (256 x 268).
const PROPORCAO = 256 / 268;
const ALTURA_DA_MARCA = 250;

export default function PlanoTopo({
  fundo,
  corTexto,
  marca: comMarca = true,
  arredondado = true,
  style,
  children,
}) {
  return (
    <View
      style={[
        {
          backgroundColor: fundo,
          overflow: 'hidden',
        },
        arredondado && {
          borderBottomLeftRadius: raio.destaque,
          borderBottomRightRadius: raio.destaque,
          borderCurve: 'continuous',
        },
        style,
      ]}
    >
      <Image
        source={grao}
        resizeMode="repeat"
        accessible={false}
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { width: undefined, height: undefined, opacity: 0.06 }]}
      />
      {comMarca ? (
        <Image
          source={marca}
          accessible={false}
          pointerEvents="none"
          resizeMode="contain"
          style={{
            position: 'absolute',
            right: -ALTURA_DA_MARCA * 0.3,
            bottom: -ALTURA_DA_MARCA * 0.28,
            width: ALTURA_DA_MARCA * PROPORCAO,
            height: ALTURA_DA_MARCA,
            tintColor: corTexto,
            opacity: 0.09,
          }}
        />
      ) : null}
      {children}
    </View>
  );
}
