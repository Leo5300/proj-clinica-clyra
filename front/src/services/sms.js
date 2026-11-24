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
