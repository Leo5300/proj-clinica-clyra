// src/components/MapaDaClinica.js
//
// Mapa da clinica dentro do app (Aula 12). Mostra ONDE a clinica fica; o que
// importa de verdade (nome, endereco, telefone) continua escrito na tela, em
// texto: um mapa sozinho nao serve a quem usa leitor de tela, esta sem rede
// ou nao consegue manipular o mapa.

import React, {
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
} from 'react';
import { StyleSheet } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { useTema } from '../theme';

// Cor do marcador da pessoa, diferente da lavanda da clinica.
const COR_DA_PESSOA = '#2F80ED';

// Folga para os marcadores nao ficarem colados na borda do mapa.
const MARGEM = { top: 60, right: 60, bottom: 60, left: 60 };

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

// "ref" e uma prop comum no React 19: a tela usa mapaRef.current.enquadrar().
export default function MapaDaClinica({ clinica, posicao, ref, style }) {
  const { cores } = useTema();
  const mapa = useRef(null);

  // Objeto novo a cada render faz o Marker achar que a posicao mudou. Com um
  // marcador tanto faz; com 200 pesa (o mesmo raciocinio do objeto novo a cada
  // render da Aula 10). Por isso ja nasce memorizado.
  const coordenadaDaClinica = useMemo(
    () => ({ latitude: clinica.latitude, longitude: clinica.longitude }),
    [clinica.latitude, clinica.longitude],
  );

  // So desenhada na tela, nunca guardada: a posicao da pessoa e dado sensivel.
  const latitude = posicao?.latitude;
  const longitude = posicao?.longitude;
  const coordenadaDaPessoa = useMemo(
    () => (latitude === undefined ? null : { latitude, longitude }),
    [latitude, longitude],
  );

  // Ajusta o zoom para caberem a clinica e a pessoa, o que nenhum delta
  // fixo faria: a distancia entre os dois muda a cada pessoa.
  const enquadrar = useCallback(() => {
    if (!coordenadaDaPessoa) return;

    mapa.current?.fitToCoordinates([coordenadaDaClinica, coordenadaDaPessoa], {
      edgePadding: MARGEM,
      animated: true,
    });
  }, [coordenadaDaClinica, coordenadaDaPessoa]);

  // Quando a posicao chega, mostra os dois juntos.
  useEffect(() => {
    enquadrar();
  }, [enquadrar]);

  // Volta o mapa para a clinica com uma animacao de 600 ms, mesmo depois de
  // a pessoa ter arrastado para longe.
  const verClinica = useCallback(() => {
    mapa.current?.animateToRegion(regiaoEm(clinica), 600);
  }, [clinica]);

  useImperativeHandle(ref, () => ({ enquadrar, verClinica }), [
    enquadrar,
    verClinica,
  ]);

  return (
    <MapView
      ref={mapa}
      style={[estilos.mapa, style]}
      // initialRegion, e nao region: com region o mapa volta para ca a cada
      // render e a pessoa nao consegue arrastar nem dar zoom.
      initialRegion={regiaoEm(clinica)}
    >
      {/* title e description formam o balao que abre ao tocar no marcador. */}
      <Marker
        coordinate={coordenadaDaClinica}
        title={clinica.nome}
        description={clinica.endereco}
        pinColor={cores.lavanda}
      />

      {coordenadaDaPessoa ? (
        <Marker
          coordinate={coordenadaDaPessoa}
          title="Você está aqui"
          pinColor={COR_DA_PESSOA}
        />
      ) : null}
    </MapView>
  );
}

const estilos = StyleSheet.create({
  mapa: {
    width: '100%',
  },
});
