// src/services/conflitos.js
//
// Verificacao de conflitos na agenda: duas consultas do mesmo profissional
// cujos horarios se sobrepoem. A regra e a mesma que o servidor aplica ao
// gravar (servidor/regras.js): ele impede o conflito na hora de agendar; aqui
// o app confere a agenda inteira de uma vez.

import { DURACAO_CONSULTA_MIN } from './datas';

function minutosDe(hora) {
  const [h, m] = String(hora).split(':').map(Number);
  return h * 60 + m;
}

// Mesmo profissional, mesmo dia e intervalos que se cruzam. Cada consulta
// ocupa [hora, hora + 30 min): 10:00 e 10:30 nao conflitam; 10:00 e 10:15, sim.
export function conflita(a, b) {
  if (String(a.medicoId) !== String(b.medicoId) || a.data !== b.data) {
    return false;
  }

  const inicioA = minutosDe(a.hora);
  const inicioB = minutosDe(b.hora);

  return (
    inicioA < inicioB + DURACAO_CONSULTA_MIN &&
    inicioB < inicioA + DURACAO_CONSULTA_MIN
  );
}

// Todas contra todas: n * (n - 1) / 2 comparacoes. Com 2.500 consultas sao
// quase 3,1 milhoes. E o jeito "natural" de escrever, e serve de referencia
// para medir o quanto o algoritmo melhor ganha.
export function detectarConflitosIngenuo(consultas) {
  const inicio = Date.now();
  const conflitos = [];
  let comparacoes = 0;

  for (let i = 0; i < consultas.length; i++) {
    for (let j = i + 1; j < consultas.length; j++) {
      comparacoes++;

      if (conflita(consultas[i], consultas[j])) {
        conflitos.push([consultas[i], consultas[j]]);
      }
    }
  }

  return { conflitos, comparacoes, duracaoMs: Date.now() - inicio };
}

// Identifica um par sem depender da ordem: (a, b) e (b, a) sao o mesmo conflito.
export function chaveDoConflito([a, b]) {
  return [String(a.id), String(b.id)].sort().join('|');
}

// Duas listas sao iguais quando tem exatamente os mesmos pares, em qualquer
// ordem. Rapido e errado nao serve.
export function mesmosConflitos(listaA, listaB) {
  if (listaA.length !== listaB.length) {
    return false;
  }

  const chavesB = new Set(listaB.map(chaveDoConflito));

  return listaA.every((par) => chavesB.has(chaveDoConflito(par)));
}
