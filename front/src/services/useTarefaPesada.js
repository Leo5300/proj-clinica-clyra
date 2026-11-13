// src/services/useTarefaPesada.js
//
// Embrulha uma tarefa pesada para a tela: roda, informa o progresso, deixa
// cancelar e guarda o resultado ou o erro. Sair da tela cancela o trabalho em
// curso, e nada atualiza o estado depois que a tela morreu.
//
// tarefa({ sinal, aoProgredir }, ...argumentos) devolve uma Promise; os
// argumentos vem de iniciar(...argumentos). Quem cancela a tarefa
// faz o laco lancar TrabalhoCancelado, que o hook trata como "cancelado", e
// nao como erro.

import { useCallback, useEffect, useRef, useState } from 'react';
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
  const montado = useRef(true);
  const tarefaAtual = useRef(tarefa);

  // Guarda a tarefa mais recente: quem chama pode passar uma funcao nova a cada
  // render sem que "iniciar" mude de identidade.
  useEffect(() => {
    tarefaAtual.current = tarefa;
  });

  useEffect(() => {
    montado.current = true;

    return () => {
      montado.current = false;
      sinalAtual.current?.cancelar();
    };
  }, []);

  const iniciar = useCallback(async (...argumentos) => {
    // Uma execucao nova cancela a anterior, se ainda estiver rodando.
    sinalAtual.current?.cancelar();

    const sinal = criarSinalDeCancelamento();
    sinalAtual.current = sinal;

    // So atualiza se a tela ainda existe e esta e a execucao mais recente.
    const valeAindaAtualizar = () =>
      montado.current && sinalAtual.current === sinal;

    setEstado({ ...PARADO, rodando: true });

    try {
      const resultado = await tarefaAtual.current(
        {
          sinal,
          aoProgredir: (progresso) => {
            if (valeAindaAtualizar()) {
              setEstado((atual) => ({ ...atual, progresso }));
            }
          },
        },
        ...argumentos,
      );

      if (valeAindaAtualizar()) {
        setEstado({ ...PARADO, progresso: 1, resultado });
      }
    } catch (erro) {
      if (!valeAindaAtualizar()) {
        return;
      }

      if (erro instanceof TrabalhoCancelado) {
        setEstado({ ...PARADO, cancelado: true });
      } else {
        setEstado({ ...PARADO, erro });
      }
    }
  }, []);

  const cancelar = useCallback(() => {
    sinalAtual.current?.cancelar();
  }, []);

  return { ...estado, iniciar, cancelar };
}
