// Entrada das linhas na primeira carga de uma lista: as 6 primeiras sobem 8 px, uma apos a outra (220 ms cada, 40 ms de intervalo). Uma vez por sessao para cada chave; ao voltar, as linhas ja aparecem no lugar. Com "reduzir movimento", so um fade curto.
//
// const entrada = useEntradaDeLista('consultas', !carregando);
// <Animated.View entering={entrada(indice)}>...</Animated.View>
import { useEffect, useRef } from 'react';
import { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useTema, duracao, curva } from '../theme';
import { jaAconteceu, marcarComoFeito } from '../services/primeiraVez';

const LINHAS_ANIMADAS = 6;

export function useEntradaDeLista(chave, pronto) {
  const { movimentoReduzido } = useTema();
  const animar = useRef(!jaAconteceu(chave));

  // A entrada vale so para as linhas montadas junto com os primeiros
  // dados: depois disso, nada mais desta lista anima ao aparecer.
  useEffect(() => {
    if (pronto && animar.current) {
      marcarComoFeito(chave);
      animar.current = false;
    }
  }, [pronto, chave]);

  return (indice) => {
    if (!pronto || !animar.current || indice >= LINHAS_ANIMADAS) return undefined;
    if (movimentoReduzido) return FadeIn.duration(duracao.reduzido);

    return FadeInDown.delay(indice * duracao.intervaloLista)
      .duration(duracao.entradaLista)
      .easing(curva.saida)
      .withInitialValues({ translateY: 8 });
  };
}
