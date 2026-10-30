// src/theme/movimento.js
//
// Duracoes e curvas compartilhadas, para os movimentos do app parecerem
// da mesma familia. Toque: 120 ms e escala 0,97. Selecao: so a cor muda.
// Folha: curva de folha do iOS, sem quique. Abas nunca animam.

import { Easing, cubicBezier } from 'react-native-reanimated';

export const duracao = {
  toque: 120,
  vidroToque: 160,
  selecao: 180,
  camada: 200,
  lista: 200,
  folha: 300,
  sucesso: 320,
  esqueleto: 1200,
};

// Mesmas curvas nos dois formatos do Reanimated: Easing para withTiming e
// cubicBezier para as transicoes declaradas no estilo (o texto
// "cubic-bezier(...)" do CSS nao e aceito ali).
export const curva = {
  saida: Easing.bezier(0.23, 1, 0.32, 1),
  folha: Easing.bezier(0.32, 0.72, 0, 1),
};

export const curvaCss = {
  saida: cubicBezier(0.23, 1, 0.32, 1),
  folha: cubicBezier(0.32, 0.72, 0, 1),
};

export const escalaToque = 0.97;
export const escalaVidroToque = 1.04;
