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

const MOTIVO_INDISPONIVEL =
  'Este aparelho ou esta versão do app não permite tarefas em segundo plano (o Expo Go, por exemplo, tem limites aqui).';

const MOTIVO_RESTRITO =
  'O sistema restringiu tarefas em segundo plano para este app (economia de bateria ou ajustes do aparelho).';

// O que a tela precisa saber: posso oferecer a opcao? Ela ja esta ligada?
// Nunca lanca: qualquer falha ao perguntar vira "indisponivel".
export async function estadoDaTarefa() {
  const indisponivel = { disponivel: false, registrada: false };

  if (!TaskManager || !BackgroundTask) {
    return { ...indisponivel, motivo: MOTIVO_INDISPONIVEL };
  }

  try {
    if (!(await TaskManager.isAvailableAsync())) {
      return { ...indisponivel, motivo: MOTIVO_INDISPONIVEL };
    }

    const status = await BackgroundTask.getStatusAsync();

    if (status !== BackgroundTask.BackgroundTaskStatus.Available) {
      return { ...indisponivel, motivo: MOTIVO_RESTRITO };
    }

    const registrada = await TaskManager.isTaskRegisteredAsync(NOME_DA_TAREFA);

    return { disponivel: true, registrada, motivo: null };
  } catch (e) {
    return { ...indisponivel, motivo: MOTIVO_INDISPONIVEL };
  }
}

// Liga a tarefa periodica. Registrar duas vezes nao faz mal, mas perguntar
// antes evita trabalho e deixa o estado devolvido sempre verdadeiro.
export async function registrarTarefa() {
  const estado = await estadoDaTarefa();

  if (!estado.disponivel || estado.registrada) {
    return estado;
  }

  await BackgroundTask.registerTaskAsync(NOME_DA_TAREFA, {
    minimumInterval: INTERVALO_MINIMO_MIN,
  });

  return estadoDaTarefa();
}

// Desliga: o sistema deixa de acordar o app para isso.
export async function cancelarTarefa() {
  const estado = await estadoDaTarefa();

  if (!estado.disponivel || !estado.registrada) {
    return estado;
  }

  await BackgroundTask.unregisterTaskAsync(NOME_DA_TAREFA);

  return estadoDaTarefa();
}
