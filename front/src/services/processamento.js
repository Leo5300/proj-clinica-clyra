// src/services/processamento.js
//
// Ferramentas para trabalho pesado que roda na thread de JavaScript sem
// congelar a tela: cancelar, ceder a vez e fatiar. Nenhuma depende de React
// nem de tela, entao o mesmo codigo serve a verificacao da agenda de hoje e
// a sincronizacao em segundo plano da Aula 11.
//
// Lembrete da aula: o JavaScript do app tem UMA thread. async/await organiza
// espera, nao distribui trabalho: um laco pesado dentro de uma funcao async
// trava a tela do mesmo jeito.

// Lancada quando alguem cancela o trabalho. Quem chama separa "cancelado" de
// "deu erro" por ela.
export class TrabalhoCancelado extends Error {
  constructor() {
    super('Trabalho cancelado.');
    this.name = 'TrabalhoCancelado';
  }
}

// Mesmo espirito do AbortController da Aula 5, mas para CPU em vez de rede.
// Nao existe "matar" um laco: ele precisa olhar a flag de tempos em tempos.
export function criarSinalDeCancelamento() {
  const sinal = {
    cancelado: false,
    cancelar() {
      sinal.cancelado = true;
    },
    // Chame dentro do laco: lanca TrabalhoCancelado se alguem cancelou.
    conferir() {
      if (sinal.cancelado) {
        throw new TrabalhoCancelado();
      }
    },
  };

  return sinal;
}

// Devolve a vez ao event loop. Tem de ser setTimeout (macrotarefa): uma
// microtarefa, como Promise.resolve(), roda antes de a tela repintar e a
// barra de progresso nunca se moveria.
export function cederAVez() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

// Quantos itens processar antes de ceder a vez. Fatia pequena demais desperdica
// tempo cedendo; grande demais volta a travar a tela entre uma cessao e outra.
// O valor foi escolhido medindo no aparelho (veja o README).
export const TAMANHO_DA_FATIA_PADRAO = 500;

// Percorre os itens chamando processarItem(item, indice). A cada fatia avisa o
// progresso (de 0 a 1) e cede a vez. O tempo total nao cai: o que muda e que a
// tela respira entre as fatias. Nao e paralelismo, e boa educacao com o
// event loop.
export async function processarEmFatias(itens, processarItem, opcoes = {}) {
  const { tamanhoDaFatia, aoProgredir, sinal } = opcoes;
  const tamanho =
    Number.isFinite(tamanhoDaFatia) && tamanhoDaFatia >= 1
      ? Math.floor(tamanhoDaFatia)
      : TAMANHO_DA_FATIA_PADRAO;

  let inicio = 0;

  while (inicio < itens.length) {
    sinal?.conferir();

    const fim = Math.min(inicio + tamanho, itens.length);

    for (let i = inicio; i < fim; i++) {
      processarItem(itens[i], i);
    }

    inicio = fim;
    aoProgredir?.(inicio / itens.length);
    await cederAVez();
  }
}
