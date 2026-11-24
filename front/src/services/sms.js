// src/services/sms.js
//
// SMS ao paciente (Aula 13). Dois caminhos, de proposito separados, porque
// a escolha entre eles e uma decisao de projeto:
//
//   PELO APARELHO (expo-sms): abre o app de mensagens de quem esta com o
//   celular na mao, com o texto pronto. Sai do numero dessa pessoa, e e ela
//   quem toca em enviar. Nao custa nada a clinica, mas o app nao fica
//   sabendo se a mensagem saiu.
//
//   PELO SERVIDOR (gateway): o app pede a API da clinica, e ela manda ao
//   gateway (simulado ou Twilio). Sai do numero da clinica, chega com o app
//   do paciente fechado, e cada mensagem e cobrada. O app NUNCA fala com o
//   gateway: a chave dele mora so no servidor.
//
// Regras do texto: sem acento (acento derruba o limite de 160 para 70
// caracteres) e sem dado de saude (SMS aparece na tela bloqueada).

import { CLINICA } from './localizacao';

// Rotulo de cada tipo de aviso, para a tela.
export const TIPOS_DE_AVISO = {
  lembrete: 'Lembrete',
  confirmacao: 'Confirmação',
  remarcacao: 'Remarcação',
  cancelamento: 'Cancelamento',
};

// "2026-11-25" -> "25/11"
export function dataDoSms(dataIso) {
  const [, mes, dia] = String(dataIso).split('-');
  return `${dia}/${mes}`;
}

// Modelos sem acento e sem dado clinico: nada de profissional,
// especialidade, area, motivo, remedio ou exame. So o necessario para a
// pessoa agir. Cada um cabe em uma mensagem de 160 caracteres.
export const MODELOS = {
  lembrete: (dia, hora) =>
    `Clyra: lembrete da sua consulta em ${dia} as ${hora}. Para remarcar, ligue ${CLINICA.telefone}.`,
  confirmacao: (dia, hora) =>
    `Clyra: sua consulta foi agendada para ${dia} as ${hora}. Duvidas: ${CLINICA.telefone}.`,
  remarcacao: (dia, hora) =>
    `Clyra: sua consulta foi remarcada para ${dia} as ${hora}. Duvidas: ${CLINICA.telefone}.`,
  cancelamento: (dia, hora) =>
    `Clyra: sua consulta de ${dia} as ${hora} foi cancelada. Para marcar outro horario, ligue ${CLINICA.telefone}.`,
};

// Texto inicial do aviso de uma consulta ({ data, hora }).
export function textoPadrao(tipo, consulta) {
  return MODELOS[tipo](dataDoSms(consulta.data), consulta.hora);
}

// ---------------------------------------------------------------- SEGMENTOS

// Alfabeto padrao do SMS (GSM 7-bit): ate 160 caracteres por mensagem.
// Qualquer outro caractere (a maioria dos acentos do portugues, emoji)
// muda a codificacao para UCS-2, e o limite cai para 70.
const GSM_BASICO =
  '@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !"#¤%&\'()*+,-./0123456789:;<=>?' +
  '¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà';

// Tambem sao GSM, mas ocupam dois espacos cada.
const GSM_EXTENSAO = '^{}\\[~]|€\f';

export function codificacao(texto) {
  for (const letra of String(texto)) {
    if (!GSM_BASICO.includes(letra) && !GSM_EXTENSAO.includes(letra)) {
      return 'UCS-2';
    }
  }

  return 'GSM-7';
}

// Quanto o texto ocupa, nas unidades da codificacao dele.
function unidades(texto) {
  if (codificacao(texto) === 'UCS-2') return texto.length;

  let total = 0;

  for (const letra of texto) {
    total += GSM_EXTENSAO.includes(letra) ? 2 : 1;
  }

  return total;
}

// Uma mensagem leva 160 (GSM) ou 70 (UCS-2). Texto maior vira partes de
// 153 ou 67, porque cada parte guarda um cabecalho para o celular remontar
// o texto. 160 caracteres = 1 mensagem; 161 = 2. E a conta chega dobrada.
export function contarSegmentos(texto) {
  const conteudo = String(texto ?? '');
  const gsm = codificacao(conteudo) === 'GSM-7';
  const usado = unidades(conteudo);

  if (usado <= (gsm ? 160 : 70)) return 1;

  return Math.ceil(usado / (gsm ? 153 : 67));
}

// Tudo o que a tela mostra embaixo do texto, ja pronto.
export function avaliarTexto(texto) {
  const conteudo = String(texto ?? '');
  const segmentos = contarSegmentos(conteudo);
  const gsm = codificacao(conteudo) === 'GSM-7';

  return {
    caracteres: conteudo.length,
    segmentos,
    codificacao: gsm ? 'GSM-7' : 'UCS-2',
    limitePorMensagem: gsm ? 160 : 70,
    alerta:
      segmentos > 1
        ? `Este texto será cobrado como ${segmentos} mensagens.`
        : null,
    avisoDeAcento: gsm
      ? null
      : 'O texto tem acento ou símbolo fora do padrão do SMS: cada mensagem cabe 70 caracteres, não 160.',
  };
}
