// src/components/MapaDaClinica.js
//
// Mapa da clinica dentro do app (Aula 12). Mostra ONDE a clinica fica; o que
// importa de verdade (nome, endereco, telefone) continua escrito na tela, em
// texto: um mapa sozinho nao serve a quem usa leitor de tela, esta sem rede
// ou nao consegue manipular o mapa.

import React from 'react';
import { StyleSheet } from 'react-native';
import MapView from 'react-native-maps';

// "Delta" e o tamanho da janela do mapa, em graus: e um zoom ao contrario.
// Quanto MENOR, mais perto. 0.05 mostra um bairro, 0.01 algumas quadras e
// 0.002 uma rua.
export const DELTA_PADRAO = 0.01;

function regiaoEm(ponto, delta = DELTA_PADRAO) {
  return {
    latitude: ponto.latitude,
    longitude: ponto.longitude,
    latitudeDelta: delta,
    longitudeDelta: delta,
  };
}

export default function MapaDaClinica({ clinica, style }) {
  return (
    <MapView
      style={[estilos.mapa, style]}
      // initialRegion, e nao region: com region o mapa volta para ca a cada
      // render e a pessoa nao consegue arrastar nem dar zoom.
      initialRegion={regiaoEm(clinica)}
    />
  );
}

const estilos = StyleSheet.create({
  mapa: {
    width: '100%',
  },
});
