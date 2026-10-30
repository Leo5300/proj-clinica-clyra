// src/theme/medidas.js
//
// Espacos (base 4), raios, alvo de toque e sombras. Sombras sao boxShadow
// curtas e baixas; a cor vem da paleta para escurecer no tema escuro.

export const espaco = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
};

// Margem lateral de toda tela.
export const margemTela = 18;

export const raio = {
  campo: 12,
  botao: 14,
  cartao: 16,
  cartaoGrande: 18,
  folha: 28,
  destaque: 30,
  capsula: 999,
};

// Alvo de toque minimo (44) e altura do botao principal (48).
export const toque = {
  minimo: 44,
  botao: 48,
};

// Area extra de toque para icones pequenos chegarem a 44.
export const areaDeToque = { top: 11, bottom: 11, left: 11, right: 11 };

export function sombras(cores) {
  return {
    leve: `0 1px 3px ${cores.sombra}`,
    flutuante: `0 8px 24px ${cores.sombra}`,
    folha: `0 -8px 30px ${cores.sombra}`,
  };
}
