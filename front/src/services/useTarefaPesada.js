// src/services/useTarefaPesada.js
//
// Embrulha uma tarefa pesada para a tela: roda, informa o progresso, deixa
// cancelar e guarda o resultado ou o erro.
//
// tarefa({ sinal, aoProgredir }) devolve uma Promise. Quem cancela a tarefa
// faz o laco lancar TrabalhoCancelado, que o hook trata como "cancelado", e
// nao como erro.

import { useCallback, useRef, useState } from 'react';
import { TrabalhoCancelado, criarSinalDeCancelamento } from './processamento';

const PARADO = {
  rodando: false,
  progresso: 0,
  resultado: null,
  erro: null,
  cancelado: false,
};

export function useTarefaPesada(tarefa) {
  const [estado, setEstado] = useState(PARADO);
  const sinalAtual = useRef(null);

  const iniciar = useCallback(async () => {
    // Uma execucao nova cancela a anterior, se ainda estiver rodando.
    sinalAtual.current?.cancelar();

    const sinal = criarSinalDeCancelamento();
    sinalAtual.current = sinal;

    setEstado({ ...PARADO, rodando: true });

    try {
      const resultado = await tarefa({
        sinal,
        aoProgredir: (progresso) =>
          setEstado((atual) => ({ ...atual, progresso })),
      });

      setEstado({ ...PARADO, progresso: 1, resultado });
    } catch (erro) {
      if (erro instanceof TrabalhoCancelado) {
        setEstado({ ...PARADO, cancelado: true });
      } else {
        setEstado({ ...PARADO, erro });
      }
    }
  }, [tarefa]);

  const cancelar = useCallback(() => {
    sinalAtual.current?.cancelar();
  }, []);

  return { ...estado, iniciar, cancelar };
}
