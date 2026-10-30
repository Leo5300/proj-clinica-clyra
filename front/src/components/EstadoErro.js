// Erro ao buscar dados, em linguagem simples e cor de atencao (nao de alarme). titulo; texto; aoTentar (pode devolver Promise: mostra "Tentando..."); style.
import React, { useState } from 'react';
import { View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import Texto from './Texto';
import Botao from './Botao';
import { useTema, raio, espaco } from '../theme';

export default function EstadoErro({
  titulo = 'Não conseguimos falar com a clínica',
  texto = 'Confira a internet do celular e tente de novo. Nada do que você fez foi perdido.',
  aoTentar,
  style,
}) {
  const { cores } = useTema();
  const [tentando, setTentando] = useState(false);

  const tentar = async () => {
    setTentando(true);
    try {
      await aoTentar?.();
    } finally {
      setTentando(false);
    }
  };

  return (
    <View
      accessibilityRole="alert"
      style={[
        {
          backgroundColor: cores.superficie,
          borderColor: cores.linha,
          borderWidth: 1,
          borderRadius: 20,
          borderCurve: 'continuous',
          padding: 20,
          gap: espaco.sm,
        },
        style,
      ]}
    >
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: raio.campo,
          backgroundColor: cores.atencaoSuave,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Feather name="wifi-off" size={22} color={cores.atencao} />
      </View>
      <Texto variante="tituloMedio">{titulo}</Texto>
      <Texto variante="corpo" cor="tinta2" selectable>
        {texto}
      </Texto>
      {aoTentar ? (
        <Botao
          titulo={tentando ? 'Tentando…' : 'Tentar de novo'}
          carregando={tentando}
          onPress={tentar}
        />
      ) : null}
    </View>
  );
}
