// src/services/tarefaBackground.js
//
// A tarefa que o sistema acorda de tempos em tempos para sincronizar a agenda
// com o app fechado.
//
// REGRA DA AULA 11: defineTask tem de rodar no escopo do modulo, e nao dentro
// de um componente. Quando o sistema acorda o app em segundo plano, nenhum
// componente e montado; so o JavaScript de nivel de modulo roda. Por isso
// este arquivo e importado no TOPO do App.js.
//
// As bibliotecas nativas sao carregadas com tolerancia: no Expo Go do Android
// o TaskManager nao existe, e o app tem de abrir mesmo assim. Sem elas, a
// tarefa simplesmente nao existe e o resto da sincronizacao (botao e volta
// ao app) continua funcionando.

import { precisaSincronizar, sincronizarAgenda } from './sincronizacao';

export const NOME_DA_TAREFA = 'clyra-sincronizar-agenda';

// Menor intervalo que o Android aceita. O sistema trata como MINIMO, nunca
// como promessa: pode demorar mais, e em alguns aparelhos nem rodar.
export const INTERVALO_MINIMO_MIN = 15;

let TaskManager = null;
let BackgroundTask = null;

try {
  TaskManager = require('expo-task-manager');
  BackgroundTask = require('expo-background-task');
} catch (e) {
  // Sem modulo nativo: a tarefa nao existe neste aparelho/versao do app.
}

// O que o sistema executa. Nunca lanca: devolve Success ou Failed.
async function executarTarefa() {
  const { Success, Failed } = BackgroundTask.BackgroundTaskResult;

  try {
    // Se o app acabou de sincronizar (voltou ao primeiro plano), nao repete.
    if (!(await precisaSincronizar(INTERVALO_MINIMO_MIN))) {
      return Success;
    }

    const { registro } = await sincronizarAgenda('background');

    // Sem recepcao logada a sincronizacao e pulada (registro null): nao ha
    // falha, so nada a fazer.
    return registro && !registro.ok ? Failed : Success;
  } catch (e) {
    return Failed;
  }
}

if (TaskManager && BackgroundTask) {
  try {
    TaskManager.defineTask(NOME_DA_TAREFA, executarTarefa);
  } catch (e) {
    // Defini-la duas vezes (recarga do Metro) nao pode derrubar o app.
  }
}
