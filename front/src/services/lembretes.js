// src/services/lembretes.js
//
// Unico ponto do app que conversa com notificacoes. Nenhuma tela importa
// expo-notifications: as telas falam a linguagem do dominio -- agendar o
// lembrete de uma consulta, cancelar o lembrete de uma consulta. Mesmo
// padrao de api.js, sessao.js, localizacao.js e bluetooth.js.
//
// Notificacao LOCAL: quem guarda o compromisso e dispara o aviso e o
// sistema operacional do aparelho. Funciona sem internet e com o app
// fechado. O limite: o aparelho so sabe o que o app sabia na hora de
// agendar. Se a consulta for cancelada por outro aparelho, este lembrete
// continua agendado aqui.

// IMPORTACAO MODULAR (Expo Go, Android, SDK 57):
// "import * as Notifications from 'expo-notifications'" registra, so por
// ser importado, um ouvinte de token de PUSH -- e o Expo Go derruba o app
// com "Push notifications ... was removed from Expo Go". Importar direto
// dos arquivos das funcoes LOCAIS evita isso. Em development build o
// import normal voltaria a funcionar.
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setNotificationHandler } from 'expo-notifications/build/NotificationsHandler';
import {
  addNotificationResponseReceivedListener,
  getLastNotificationResponseAsync,
  clearLastNotificationResponseAsync,
} from 'expo-notifications/build/NotificationsEmitter';
import {
  getPermissionsAsync,
  requestPermissionsAsync,
} from 'expo-notifications/build/NotificationPermissions';
import { setNotificationChannelAsync } from 'expo-notifications/build/setNotificationChannelAsync';
import { scheduleNotificationAsync } from 'expo-notifications/build/scheduleNotificationAsync';
import { getAllScheduledNotificationsAsync } from 'expo-notifications/build/getAllScheduledNotificationsAsync';
import { cancelScheduledNotificationAsync } from 'expo-notifications/build/cancelScheduledNotificationAsync';
import { AndroidImportance } from 'expo-notifications/build/NotificationChannelManager.types';
import { SchedulableTriggerInputTypes } from 'expo-notifications/build/Notifications.types';

const CANAL = 'lembretes-consulta';

// Chave do mapa consultaId -> identificador da notificacao.
// AsyncStorage aqui e escolha consciente: na Aula 4 ele foi proibido para
// o TOKEN, que e segredo. Um identificador de notificacao nao e segredo --
// o armazenamento certo depende do que se guarda.
const CHAVE_MAPA = '@clyra/lembretes-por-consulta';

// Antecedencia do lembrete em relacao a consulta.
export const ANTECEDENCIA_MINUTOS = 60;

// Tela que o toque na notificacao deve abrir.
const TELA_DESTINO = 'DetalheConsulta';

// No Expo Go (Android, SDK 57) criar canal falha no codigo nativo. So
// informamos o canal no gatilho se ele foi criado de verdade -- apontar
// para um canal inexistente pode fazer a notificacao nao aparecer.
let canalCriado = false;

// Toques ja tratados. O mesmo toque pode chegar pelos dois caminhos (o
// ouvinte e a "ultima resposta" da abertura do app); sem esta guarda, o
// app navegaria duas vezes para a mesma consulta.
const toquesTratados = new Set();

// Chamada UMA vez, no topo do App.js, fora de qualquer componente.
// Sem isto, notificacao que dispara com o app ABERTO nao aparece: o
// sistema entende que o proprio app deveria avisar.
// Do SDK 52 em diante sao shouldShowBanner e shouldShowList. O nome antigo
// (shouldShowAlert) e ignorado em silencio -- a notificacao some sem erro.
export function configurarHandler() {
  setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

// Do Android 8 em diante toda notificacao pertence a um canal. HIGH e o
// que faz o aviso aparecer por cima da tela; abaixo disso ele entra na
// central em silencio. O usuario controla cada canal nos ajustes.
export async function prepararCanal() {
  if (Platform.OS !== 'android') return;

  try {
    await setNotificationChannelAsync(CANAL, {
      name: 'Lembretes de consulta',
      importance: AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      sound: 'default',
    });
    canalCriado = true;
  } catch (e) {
    // Limitacao conhecida do Expo Go. Sem este catch, o erro interromperia
    // a inicializacao. A notificacao cai no canal padrao e aparece assim
    // mesmo; em development build o canal e criado normalmente.
    canalCriado = false;
  }
}

// So consulta, sem pedir. Serve para a tela avisar que as notificacoes
// estao desligadas, sem abrir a caixa de permissao a cada visita.
export async function notificacoesPermitidas() {
  const atual = await getPermissionsAsync();
  return atual.status === 'granted';
}

// Confere primeiro e so pede se ainda nao tiver. Se o usuario ja negou
// para sempre (canAskAgain false), pedir de novo nao mostra caixa nenhuma:
// devolve false sem insistir, e a tela explica.
export async function garantirPermissao() {
  const atual = await getPermissionsAsync();
  if (atual.status === 'granted') return true;
  if (!atual.canAskAgain) return false;

  const pedida = await requestPermissionsAsync();
  return pedida.status === 'granted';
}

async function lerMapa() {
  try {
    const bruto = await AsyncStorage.getItem(CHAVE_MAPA);
    return bruto ? JSON.parse(bruto) : {};
  } catch (e) {
    return {};
  }
}

async function salvarMapa(mapa) {
  await AsyncStorage.setItem(CHAVE_MAPA, JSON.stringify(mapa));
}

// Data e hora da consulta, no fuso do aparelho. Montado campo a campo
// para nao depender de como cada motor JavaScript interpreta texto de
// data sem fuso.
export function dataDaConsulta(consulta) {
  const [ano, mes, dia] = String(consulta.data).split('-').map(Number);
  const [hora, minuto] = String(consulta.hora).split(':').map(Number);
  return new Date(ano, mes - 1, dia, hora, minuto, 0, 0);
}

export function formatarHora(data) {
  const h = String(data.getHours()).padStart(2, '0');
  const m = String(data.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

// Cancela o lembrete de UMA consulta: busca o identificador no mapa,
// cancela no sistema e apaga a entrada. Chamada ao cancelar a consulta e,
// por dentro, antes de todo reagendamento.
export async function cancelarLembrete(consultaId) {
  const chave = String(consultaId);
  const mapa = await lerMapa();
  const identificador = mapa[chave];

  if (identificador) {
    try {
      await cancelScheduledNotificationAsync(identificador);
    } catch (e) {
      // Ja pode ter disparado ou sido removida: nada a cancelar.
    }
    delete mapa[chave];
    await salvarMapa(mapa);
  }
}

// Um lembrete por consulta. Remarcar chama esta mesma funcao com a data
// nova: ela SEMPRE cancela o lembrete anterior antes de criar outro, entao
// o paciente nunca recebe dois avisos com horarios diferentes.
//
// Devolve { identificador, horarioLembrete, motivo }:
//   motivo null            -> lembrete agendado
//   motivo 'passado'       -> o horario do lembrete ja passou
//   motivo 'sem-permissao' -> notificacoes desligadas no aparelho
export async function agendarLembrete(consulta) {
  const consultaId = String(consulta.id);

  await cancelarLembrete(consultaId);

  const horarioConsulta = dataDaConsulta(consulta);
  const horarioLembrete = new Date(
    horarioConsulta.getTime() - ANTECEDENCIA_MINUTOS * 60 * 1000,
  );

  // Agendar para o passado nao da erro e nao dispara nada. Sem esta
  // checagem o app prometeria um aviso que nunca vem -- caso comum numa
  // clinica: consulta daqui a 30 minutos, lembrete de 1 hora antes.
  if (horarioLembrete <= new Date()) {
    return { identificador: null, horarioLembrete, motivo: 'passado' };
  }

  // Sem permissao o agendamento "funciona" e o aviso nunca aparece, sem
  // erro nenhum. Melhor nao agendar e deixar a tela dizer a verdade.
  const permitido = await garantirPermissao();
  if (!permitido) {
    return { identificador: null, horarioLembrete, motivo: 'sem-permissao' };
  }

  const gatilho = {
    type: SchedulableTriggerInputTypes.DATE,
    date: horarioLembrete,
  };
  if (canalCriado) gatilho.channelId = CANAL;

  const identificador = await scheduleNotificationAsync({
    content: {
      // A tela bloqueada e publica. Nada de medico, especialidade ou nome
      // do paciente: "consulta com o psiquiatra X" exposto a quem estiver
      // por perto e vazamento de dado de saude (LGPD). O aviso cumpre a
      // mesma funcao sem revelar nada.
      title: 'Lembrete de consulta',
      body: `Você tem uma consulta às ${formatarHora(horarioConsulta)}.`,
      // Viaja com a notificacao e volta no toque: e o que diz para qual
      // consulta o app deve abrir.
      data: { consultaId, tela: TELA_DESTINO },
    },
    trigger: gatilho,
  });

  // O sistema devolve o identificador; guarda-lo e responsabilidade do
  // app. Sem este vinculo nao ha como cancelar o lembrete certo depois.
  const mapa = await lerMapa();
  mapa[consultaId] = identificador;
  await salvarMapa(mapa);

  return { identificador, horarioLembrete, motivo: null };
}

// O que o sistema tem agendado de verdade. E a prova de que cancelar
// funcionou: depois de cancelar tudo, a lista precisa vir vazia.
export async function listarLembretesAgendados() {
  return getAllScheduledNotificationsAsync();
}

// Transforma o toque em destino de navegacao, ou null se o toque nao for
// de um lembrete de consulta ou ja tiver sido tratado.
function destinoDoToque(resposta) {
  if (!resposta) return null;

  const pedido = resposta.notification?.request;
  const dados = pedido?.content?.data;

  if (!pedido || !dados?.consultaId || dados.tela !== TELA_DESTINO) {
    return null;
  }

  if (toquesTratados.has(pedido.identifier)) return null;
  toquesTratados.add(pedido.identifier);

  return { tela: dados.tela, consultaId: String(dados.consultaId) };
}

// Caminho A -- app aberto ou em segundo plano: o toque chega por este
// ouvinte. Devolve a inscricao; quem chama remove com .remove() no
// retorno do useEffect (ouvinte esquecido e vazamento).
export function ouvirToqueEmLembrete(aoTocar) {
  return addNotificationResponseReceivedListener((resposta) => {
    const destino = destinoDoToque(resposta);
    if (destino) aoTocar(destino);
  });
}

// Caminho B -- app FECHADO: o toque abre o app, e nenhum ouvinte existia
// ainda para pegar o evento. O sistema guarda a "ultima resposta"; ela e
// lida na inicializacao. Depois de lida, e limpa: sem isso, cada recarga
// em desenvolvimento navegaria de novo para a mesma consulta.
export async function obterToqueQueAbriuOApp() {
  try {
    const resposta = await getLastNotificationResponseAsync();
    const destino = destinoDoToque(resposta);
    if (resposta) await clearLastNotificationResponseAsync();
    return destino;
  } catch (e) {
    return null;
  }
}