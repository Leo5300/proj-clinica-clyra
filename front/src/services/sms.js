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

import * as SMS from 'expo-sms';
import { enviarSmsAoPaciente, buscarSms } from './api';
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

// ------------------------------------------------------------------- NUMERO

// "(31) 91111-1111" -> "+5531911111111" (formato internacional, E.164).
// Devolve null quando nao da: numero incompleto ou telefone fixo, que nao
// recebe SMS. Numero mal formatado e a causa numero 1 de SMS que some.
export function normalizarNumero(numero) {
  const texto = String(numero ?? '').trim();

  if (!texto) return null;

  let digitos = texto.replace(/\D/g, '');

  if (texto.startsWith('+')) {
    // Numero de fora do Brasil: so confere o formato.
    if (!digitos.startsWith('55')) {
      return /^\d{10,15}$/.test(digitos) ? `+${digitos}` : null;
    }
  } else {
    // "0 16 99999-8888": o zero de discagem nao faz parte do numero.
    digitos = digitos.replace(/^0+/, '');

    if (digitos.length === 10 || digitos.length === 11) {
      digitos = `55${digitos}`;
    }
  }

  if (!/^55\d{11}$/.test(digitos)) return null;

  const ddd = digitos.slice(2, 4);
  const assinante = digitos.slice(4);

  // DDD vai de 11 a 99 e nunca termina em 0; celular tem 9 digitos e
  // comeca com 9.
  if (ddd[0] === '0' || ddd[1] === '0' || assinante[0] !== '9') return null;

  return `+${digitos}`;
}

// --------------------------------------------------------- CONTEUDO SEGURO

// Termos de saude que nunca vao num SMS (a API recusa os mesmos). Numa
// clinica de psicologia e psiquiatria, a especialidade ja e dado de saude.
const TERMOS_DE_SAUDE = [
  'psicolog',
  'psiquiatr',
  'terapia',
  'terapeut',
  'diagnost',
  'transtorno',
  'medicament',
  'remedio',
  'receita',
  'exame',
  'laudo',
];

export function termosDeSaude(texto) {
  const comparavel = String(texto ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

  return TERMOS_DE_SAUDE.filter((termo) => comparavel.includes(termo));
}

// ------------------------------------------------------- PELO APARELHO

export class SmsIndisponivel extends Error {
  constructor() {
    super('Este aparelho não envia SMS.');
    this.name = 'SmsIndisponivel';
  }
}

// Tablet sem chip, emulador e aparelho so com dados nao enviam SMS. A tela
// confere ANTES de oferecer o botao, como as tres checagens da biometria.
export async function smsDisponivelNoAparelho() {
  try {
    return await SMS.isAvailableAsync();
  } catch (e) {
    return false;
  }
}

// NAO envia nada: abre o app de mensagens com numero e texto prontos, e a
// pessoa decide. Devolve o result do expo-sms ('sent', 'cancelled' ou
// 'unknown') sem interpretar como sucesso: no Android ele quase sempre
// volta 'unknown', porque o sistema nao conta ao app o que a pessoa fez.
export async function pedirEnvioPeloAparelho(numeros, texto) {
  if (!(await smsDisponivelNoAparelho())) {
    throw new SmsIndisponivel();
  }

  const { result } = await SMS.sendSMSAsync(numeros, texto);
  return result;
}

// O que a tela diz depois de voltar do app de mensagens. Nunca "enviado":
// a clinica nao pode registrar que avisou com base nisso.
export function textoDoResultadoDoAparelho(resultado) {
  if (resultado === 'cancelled') {
    return 'Você voltou sem enviar. Nada saiu do seu celular.';
  }

  return 'Confira no seu app de mensagens se a mensagem saiu: o celular não informa isso ao app.';
}

// ------------------------------------------------------- PELO SERVIDOR

// Pede a API da clinica, nunca ao gateway. O numero sai do cadastro do
// paciente, la no servidor. Volta { id, status: 'enfileirada', segmentos }:
// aceita nao e entregue.
export function pedirEnvioPeloServidor(pacienteId, tipo, texto) {
  return enviarSmsAoPaciente(pacienteId, { tipo, texto });
}

// A confirmacao de entrega chega depois, como os recibos do push.
export function conferirEntrega(id) {
  return buscarSms(id);
}

// O que cada status significa para quem esta na recepcao.
export function textoDoStatus(status) {
  switch (status) {
    case 'enfileirada':
      return 'Na fila do serviço de SMS. Ainda não chegou ao celular do paciente.';
    case 'enviada':
      return 'A operadora aceitou. Falta o celular do paciente confirmar.';
    case 'entregue':
      return 'Entregue no celular do paciente.';
    case 'falhou':
      return 'Não foi entregue. Confira o telefone no cadastro ou ligue para o paciente.';
    default:
      return `Situação informada pelo serviço de SMS: ${status}.`;
  }
}
