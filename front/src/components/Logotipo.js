// Logotipo CLYRA: a marca "C" e o nome em Montserrat. tamanho: 'pequeno' (topo das telas) | 'grande' (login); assinatura ("PSICOLOGIA E PSIQUIATRIA"); cor (token, padrao 'marca'); style.
import React from 'react';
import { Image, View } from 'react-native';
import Texto from './Texto';
import { fontes } from '../theme';

const marca = require('../../assets/imgs/marca-clyra.png');

// Proporcao do arquivo da marca (256 x 268).
const PROPORCAO = 256 / 268;

const MEDIDAS = {
  pequeno: { marca: 30, nome: 17, entre: 8 },
  grande: { marca: 88, nome: 34, entre: 14 },
};

export default function Logotipo({
  tamanho = 'pequeno',
  assinatura = false,
  cor = 'marca',
  style,
}) {
  const medida = MEDIDAS[tamanho] ?? MEDIDAS.pequeno;
  const grande = tamanho === 'grande';

  const nome = (
    <Texto
      cor={cor}
      maxFontSizeMultiplier={1.2}
      style={{
        fontFamily: fontes.marca,
        fontSize: medida.nome,
        lineHeight: Math.round(medida.nome * 1.25),
        letterSpacing: medida.nome * 0.06,
      }}
    >
      CLYRA
    </Texto>
  );

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={assinatura ? 'CLYRA, psicologia e psiquiatria' : 'CLYRA'}
      style={[
        {
          flexDirection: grande ? 'column' : 'row',
          alignItems: 'center',
          gap: medida.entre,
        },
        style,
      ]}
    >
      <Image
        source={marca}
        style={{ width: medida.marca * PROPORCAO, height: medida.marca }}
        resizeMode="contain"
      />
      <View style={{ alignItems: 'center' }}>
        {nome}
        {assinatura ? (
          <Texto
            cor={cor}
            maxFontSizeMultiplier={1.2}
            style={{
              fontFamily: fontes.assinatura,
              fontSize: 11,
              lineHeight: 14,
              letterSpacing: 0.8,
            }}
          >
            PSICOLOGIA E PSIQUIATRIA
          </Texto>
        ) : null}
      </View>
    </View>
  );
}
