// src/services/primeiraVez.js
//
// O que so anima uma vez por sessao do app (o numeral que rola, a entrada
// das listas). Fica em memoria de proposito: some quando o app fecha, e
// nada vai para o armazenamento do aparelho.

const vistos = new Set();

export function jaAconteceu(chave) {
  return vistos.has(chave);
}

export function marcarComoFeito(chave) {
  vistos.add(chave);
}
