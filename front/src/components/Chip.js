// Opcao selecionavel (dia, area, especialidade). rotulo; detalhe (segunda linha, opcional); selecionado; onPress; style. Na selecao so a cor muda.
import React from 'react';
import Animated from 'react-native-reanimated';
import Pressionavel from './Pressionavel';
import { useTema, estilosDeTexto, numerosTabulares, raio, toque, duracao, curvaCss } from '../theme';
import { vibrarSelecao } from '../services/haptica';

const transicaoDeCor = {
  transitionProperty: ['backgroundColor', 'borderColor', 'color'],
  transitionDuration: duracao.selecao,
  transitionTimingFunction: curvaCss.saida,
};

export default function Chip({
  rotulo,
  detalhe,
  selecionado = false,
  onPress,
  accessibilityLabel,
  style,
}) {
  const { cores, movimentoReduzido } = useTema();
  // Com "reduzir movimento", a cor troca direto.
  const transicao = movimentoReduzido ? null : transicaoDeCor;

  const aoTocar = () => {
    if (!selecionado) vibrarSelecao();
    onPress?.();
  };

  const corTexto = selecionado ? cores.selTexto : cores.tinta;

  return (
    <Pressionavel
      onPress={aoTocar}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ selected: selecionado }}
      style={style}
    >
      <Animated.View
        style={[
          {
            minHeight: toque.minimo,
            minWidth: toque.minimo,
            paddingHorizontal: 14,
            paddingVertical: 6,
            borderRadius: raio.campo,
            borderCurve: 'continuous',
            borderWidth: 1,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: selecionado ? cores.selFundo : cores.superficie,
            borderColor: selecionado ? cores.selFundo : cores.linha,
          },
          transicao,
        ]}
      >
        {detalhe ? (
          <Animated.Text
            style={[
              estilosDeTexto.pequeno,
              { color: selecionado ? cores.selTexto : cores.apoio },
              transicao,
            ]}
          >
            {detalhe}
          </Animated.Text>
        ) : null}
        <Animated.Text
          style={[
            estilosDeTexto.rotuloForte,
            numerosTabulares,
            { color: corTexto },
            transicao,
          ]}
        >
          {rotulo}
        </Animated.Text>
      </Animated.View>
    </Pressionavel>
  );
}
