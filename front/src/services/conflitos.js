// src/services/conflitos.js
//
// Verificacao de conflitos na agenda: duas consultas do mesmo profissional
// cujos horarios se sobrepoem. A regra e a mesma que o servidor aplica ao
// gravar (servidor/regras.js): ele impede o conflito na hora de agendar; aqui
// o app confere a agenda inteira de uma vez.

import { DURACAO_CONSULTA_MIN } from './datas';
import { processarEmFatias } from './processamento';

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

// Data e hora gravadas como AAAA-MM-DD e HH:MM ordenam certo como texto.
function compararPorHorario(a, b) {
  if (a.data !== b.data) {
    return a.data < b.data ? -1 : 1;
  }

  if (a.hora === b.hora) {
    return 0;
  }

  return a.hora < b.hora ? -1 : 1;
}

// Agrupa as consultas por profissional e ordena cada agenda por horario.
export function agruparPorMedico(consultas) {
  const grupos = new Map();

  for (const consulta of consultas) {
    const chave = String(consulta.medicoId);
    const agenda = grupos.get(chave);

    if (agenda) {
      agenda.push(consulta);
    } else {
      grupos.set(chave, [consulta]);
    }
  }

  for (const agenda of grupos.values()) {
    agenda.sort(compararPorHorario);
  }

  return grupos;
}

// Todas as agendas, uma depois da outra: cada profissional ocupa um trecho
// seguido da lista, ordenado por horario.
function agendaAgrupada(consultas) {
  const agenda = [];

  for (const agendaDoMedico of agruparPorMedico(consultas).values()) {
    for (const consulta of agendaDoMedico) {
      agenda.push(consulta);
    }
  }

  return agenda;
}

// Compara a consulta i com as seguintes da agenda ordenada e para na primeira
// que nao conflita: a partir dela, nenhuma mais conflita. Acrescenta os pares
// em "conflitos" e devolve quantas comparacoes fez.
function compararComAsSeguintes(agenda, i, conflitos) {
  let comparacoes = 0;

  for (let j = i + 1; j < agenda.length; j++) {
    comparacoes++;

    if (!conflita(agenda[i], agenda[j])) {
      break;
    }

    conflitos.push([agenda[i], agenda[j]]);
  }

  return comparacoes;
}

// Agrupa por profissional, ordena por horario e olha so as vizinhas. No caso
// comum, cada consulta e comparada so com a seguinte: cerca de n comparacoes
// em vez de n * (n - 1) / 2.
export function detectarConflitosAgrupado(consultas) {
  const inicio = Date.now();
  const agenda = agendaAgrupada(consultas);
  const conflitos = [];
  let comparacoes = 0;

  for (let i = 0; i < agenda.length; i++) {
    comparacoes += compararComAsSeguintes(agenda, i, conflitos);
  }

  return { conflitos, comparacoes, duracaoMs: Date.now() - inicio };
}

// A mesma versao ingenua, em fatias: o laco de fora cede a vez a cada
// "tamanhoDaFatia" consultas. Mesmo trabalho, mesmo resultado; a tela respira.
export async function detectarConflitosIngenuoEmFatias(consultas, opcoes = {}) {
  const inicio = Date.now();
  const conflitos = [];
  let comparacoes = 0;

  await processarEmFatias(
    consultas,
    (consulta, i) => {
      for (let j = i + 1; j < consultas.length; j++) {
        comparacoes++;

        if (conflita(consulta, consultas[j])) {
          conflitos.push([consulta, consultas[j]]);
        }
      }
    },
    opcoes,
  );

  return { conflitos, comparacoes, duracaoMs: Date.now() - inicio };
}

// A versao que a tela usa: algoritmo melhor e, alem disso, sem monopolizar a
// thread. opcoes: { tamanhoDaFatia, aoProgredir, sinal }.
export async function detectarConflitosAgrupadoEmFatias(consultas, opcoes = {}) {
  const inicio = Date.now();
  const agenda = agendaAgrupada(consultas);
  const conflitos = [];
  let comparacoes = 0;

  await processarEmFatias(
    agenda,
    (consulta, i) => {
      comparacoes += compararComAsSeguintes(agenda, i, conflitos);
    },
    opcoes,
  );

  return { conflitos, comparacoes, duracaoMs: Date.now() - inicio };
}
