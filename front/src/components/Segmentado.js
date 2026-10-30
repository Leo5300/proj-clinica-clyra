// Grupo de opcoes exclusivas. opcoes [{ valor, rotulo }]; valor; aoMudar(valor); variante: 'suave' (trilho claro, selecionado em tinta; padrao) | 'vidro' (capsula de vidro, para filtro fixo); rotuloDoGrupo; style.
import React from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';
import Pressionavel from './Pressionavel';
import Vidro from './Vidro';
import { useTema, estilosDeTexto, raio, toque, duracao, curvaCss } from '../theme';
import { vibrarSelecao } from '../services/haptica';

const transicaoDeCor = {
  transitionProperty: ['backgroundColor', 'color'],
  transitionDuration: duracao.selecao,
  transitionTimingFunction: curvaCss.saida,
};

export default function Segmentado({
  opcoes,
  valor,
  aoMudar,
  variante = 'suave',
  rotuloDoGrupo,
  style,
}) {
  const { cores } = useTema();
  const deVidro = variante === 'vidro';

  const botoes = opcoes.map((opcao) => {
    const selecionada = opcao.valor === valor;

    let fundo = 'transparent';
    let texto = deVidro ? cores.tinta : cores.tinta2;
    if (selecionada) {
      fundo = cores.selFundo;
      texto = cores.selTexto;
    }

    return (
      <Pressionavel
        key={String(opcao.valor)}
        onPress={() => {
          if (selecionada) return;
          vibrarSelecao();
          aoMudar(opcao.valor);
        }}
        accessibilityRole="button"
        accessibilityState={{ selected: selecionada }}
        style={{ flex: 1 }}
      >
        <Animated.View
          style={[
            {
              minHeight: deVidro ? 42 : toque.minimo,
              borderRadius: raio.capsula,
              borderCurve: 'continuous',
              alignItems: 'center',
              justifyContent: 'center',
              paddingHorizontal: 8,
              backgroundColor: fundo,
            },
            transicaoDeCor,
          ]}
        >
          <Animated.Text
            numberOfLines={2}
            style={[
              selecionada ? estilosDeTexto.rotuloForte : estilosDeTexto.rotulo,
              { color: texto, textAlign: 'center' },
              transicaoDeCor,
            ]}
          >
            {opcao.rotulo}
          </Animated.Text>
        </Animated.View>
      </Pressionavel>
    );
  });

  const linha = { flexDirection: 'row', gap: 4, padding: 4 };

  if (deVidro) {
    return (
      <Vidro style={style}>
        <View accessibilityLabel={rotuloDoGrupo} style={linha}>
          {botoes}
        </View>
      </Vidro>
    );
  }

  return (
    <View
      accessibilityLabel={rotuloDoGrupo}
      style={[
        linha,
        {
          borderRadius: raio.capsula,
          borderCurve: 'continuous',
          backgroundColor: cores.superficie,
          borderWidth: 1,
          borderColor: cores.linha,
        },
        style,
      ]}
    >
      {botoes}
    </View>
  );
}
