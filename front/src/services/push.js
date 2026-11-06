// src/services/push.js
//
// Irmao do lembretes.js. O lembretes.js cuida do aviso que o APARELHO
// agenda sozinho (notificacao local). Este cuida do aviso que vem de
// FORA: quem decide avisar e o servidor da clinica, e o app so fornece um
// endereco (o token) e fica esperando.
//
// Nenhuma tela importa expo-notifications direto. As telas falam a
// linguagem do dominio: manter o registro do aparelho, saber se os avisos
// da clinica estao ativos.
//
// Token que nao chega ao servidor nao serve para nada: funciona no teste
// pelo terminal e nunca em producao, porque a clinica nao tem para onde
// mandar. Por isso o registro na API faz parte de obter o token.

import { Platform } from 'react-native';
import { isRunningInExpoGo } from 'expo';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import {
  prepararCanal,
  notificacoesPermitidas,
  garantirPermissao,
} from './lembretes';
import { registrarDispositivo as registrarDispositivoNaApi } from './api';
import { estaLogado } from './sessao';

// Push indisponivel por um motivo conhecido. A tela precisa distinguir
// isto de uma falha de rede: "este aparelho nao recebe" pede outra
// explicacao do que "nao deu agora".
//   emulador      -> emulador nunca recebe push
//   expo-go       -> o Expo Go nao recebe push do SDK 53 em diante
//   sem-projeto   -> falta o projectId do EAS no app.json
//   sem-permissao -> notificacoes desligadas no aparelho
export class PushIndisponivel extends Error {
  constructor(motivo) {
    super(`Push indisponivel: ${motivo}`);
    this.name = 'PushIndisponivel';
    this.motivo = motivo;
  }
}

// O projectId e criado pelo "eas init" e identifica o projeto no servico
// de push do Expo. Sem ele, o pedido do token falha com uma mensagem que
// nao sugere a causa.
function projectIdDoApp() {
  return (
    Constants?.expoConfig?.extra?.eas?.projectId ??
    Constants?.easConfig?.projectId ??
    null
  );
}

// O que impede o push neste ambiente, antes de pedir qualquer coisa.
// A ordem importa: ela decide qual explicacao a pessoa ve.
function motivoDoAmbiente() {
  if (!Device.isDevice) return 'emulador';
  if (isRunningInExpoGo()) return 'expo-go';
  if (!projectIdDoApp()) return 'sem-projeto';
  return null;
}

// Devolve o token deste app neste aparelho, ou lanca PushIndisponivel.
//
// Por padrao NAO pede permissao: quem pede e uma acao com a pessoa
// olhando (agendar, ativar no Perfil), nunca a abertura do app. Mesmo
// combinado do lembretes.js.
export async function obterTokenPush({ pedirPermissao = false } = {}) {
  const motivo = motivoDoAmbiente();
  if (motivo) throw new PushIndisponivel(motivo);

  // Canal e permissao sao os mesmos da Aula 8. O canal precisa ter o
  // mesmo nome que o servidor manda no channelId; se nao bater, o aviso
  // chega sem som e sem aparecer na tela, sem erro nenhum.
  await prepararCanal();

  const permitido = pedirPermissao
    ? await garantirPermissao()
    : await notificacoesPermitidas();

  if (!permitido) throw new PushIndisponivel('sem-permissao');

  // Carregado SO aqui, depois de saber que nao e Expo Go. As funcoes de
  // token do expo-notifications lancam erro no Expo Go do Android, e o
  // arquivo delas roda codigo assim que e importado. Um import no topo
  // deste arquivo poria isso no caminho da abertura do app inteiro.
  const {
    getExpoPushTokenAsync,
  } = require('expo-notifications/build/getExpoPushTokenAsync');

  const resposta = await getExpoPushTokenAsync({ projectId: projectIdDoApp() });
  return resposta.data;
}

// Resultado do ultimo registro nesta abertura do app: 'ok', um dos
// motivos de PushIndisponivel, ou 'falhou' (rede, servidor).
// null = ainda nao tentou.
let ultimoRegistro = null;

// Obtem o token e o vincula ao usuario logado, na API. O header
// Authorization vai sozinho pelo api.js: e assim que o servidor sabe QUEM
// avisar. O token identifica o aparelho, nao a pessoa; quem faz o vinculo
// e o servidor.
export async function registrarDispositivo(opcoes) {
  const token = await obterTokenPush(opcoes);
  await registrarDispositivoNaApi({ token, plataforma: Platform.OS });
  ultimoRegistro = 'ok';
  return token;
}

// Chamada na abertura do app e no login. Push e um extra: falhar aqui
// nunca pode impedir o uso do app. Por isso engole o erro e so guarda o
// motivo, para o Perfil explicar.
//
// Sem sessao nao registra: o servidor responderia 401 e o app mostraria
// "sessao expirada" a quem nem entrou ainda.
export async function manterRegistroAtualizado(opcoes) {
  try {
    if (!(await estaLogado())) return;
    await registrarDispositivo(opcoes);
  } catch (e) {
    ultimoRegistro = e instanceof PushIndisponivel ? e.motivo : 'falhou';
  }
}

// Estado para a tela, sem pedir nada:
//   { estado: 'ativo' | 'sem-permissao' | 'indisponivel', motivo }
export async function consultarEstadoDoPush() {
  const motivo = motivoDoAmbiente();
  if (motivo) return { estado: 'indisponivel', motivo };

  if (!(await notificacoesPermitidas())) {
    return { estado: 'sem-permissao', motivo: 'sem-permissao' };
  }

  if (ultimoRegistro && ultimoRegistro !== 'ok') {
    return { estado: 'indisponivel', motivo: ultimoRegistro };
  }

  return { estado: 'ativo', motivo: null };
}
