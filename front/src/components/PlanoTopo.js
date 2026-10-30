// Plano colorido do topo das telas, com a marca d'agua e o grao. fundo (cor do plano); corTexto (cor do texto do plano: tinge a marca); marca (padrao true); arredondado (cantos de baixo, padrao true); style (espacamento do conteudo); estiloAnimado (useAnimatedStyle, para a cor trocar com interpolateColor); children.
//
// A marca do CLYRA aparece grande, cortada no canto inferior direito, a 9%
// na cor do texto. O grao e um PNG pequeno em mosaico, a 6%: nada de ruido
// gerado em tempo de execucao. Os dois sao decorativos e nao recebem toque.
// No iOS, a cor do plano continua acima da tela: ao puxar a lista para
// baixo, o efeito de borracha mostra o plano, e nao o papel.
import React from 'react';
import { Image, Platform, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { raio } from '../theme';

const marca = require('../../assets/imgs/marca-clyra.png');
const grao = require('../../assets/imgs/grao.png');

// Proporcao do arquivo da marca (256 x 268).
const PROPORCAO = 256 / 268;
const ALTURA_DA_MARCA = 250;
// Quanto o plano continua acima da tela, so visivel no efeito de borracha.
const ACIMA = 1000;

export default function PlanoTopo({
  fundo,
  corTexto,
  marca: comMarca = true,
  arredondado = true,
  style,
  estiloAnimado,
  children,
}) {
  const cantos = arredondado
    ? {
        borderBottomLeftRadius: raio.destaque,
        borderBottomRightRadius: raio.destaque,
        borderCurve: 'continuous',
      }
    : null;

  return (
    <Animated.View style={[{ backgroundColor: fundo }, cantos, style, estiloAnimado]}>
      {Platform.OS === 'ios' ? (
        <Animated.View
          pointerEvents="none"
          style={[
            { position: 'absolute', left: 0, right: 0, top: -ACIMA, height: ACIMA, backgroundColor: fundo },
            estiloAnimado,
          ]}
        />
      ) : null}
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, cantos, { overflow: 'hidden' }]}>
        <Image
          source={grao}
          resizeMode="repeat"
          accessible={false}
          style={[StyleSheet.absoluteFill, { width: undefined, height: undefined, opacity: 0.06 }]}
        />
        {comMarca ? (
          <Image
            source={marca}
            accessible={false}
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
      </View>
      {children}
    </Animated.View>
  );
}
