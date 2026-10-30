// Grupo de opcoes exclusivas. opcoes [{ valor, rotulo }]; valor; aoMudar(valor); variante: 'suave' (trilho cinza, padrao) | 'vidro' (capsula de vidro, para filtro fixo); rotuloDoGrupo; style.
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
  const { cores, sombras } = useTema();
  const deVidro = variante === 'vidro';

  const botoes = opcoes.map((opcao) => {
    const selecionada = opcao.valor === valor;

    let fundo = 'transparent';
    let texto = deVidro ? cores.tinta : cores.tinta2;
    if (selecionada) {
      fundo = deVidro ? cores.selFundo : cores.superficie;
      texto = deVidro ? cores.selTexto : cores.tinta;
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
              borderRadius: deVidro ? raio.capsula : 11,
              borderCurve: 'continuous',
              alignItems: 'center',
              justifyContent: 'center',
              paddingHorizontal: 8,
              backgroundColor: fundo,
              boxShadow: selecionada && !deVidro ? sombras.leve : undefined,
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
          borderRadius: raio.botao,
          borderCurve: 'continuous',
          backgroundColor: cores.superficie2,
        },
        style,
      ]}
    >
      {botoes}
    </View>
  );
}
