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

import { isRunningInExpoGo } from 'expo';
import * as Device from 'expo-device';
import Constants from 'expo-constants';

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
