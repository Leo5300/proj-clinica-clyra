// sms.js - envio de SMS pela clinica (Aula 13)
//
// A API (auth-api.js) usa este arquivo para falar com o gateway de SMS. O
// app nunca fala com o gateway: ele pede a API, que confere quem pediu, le
// o telefone no cadastro do paciente e so entao manda ao gateway. Quem tem
// a chave do gateway tem a conta, e a chave fica so neste computador.
//
// As regras de numero e de segmentos sao as mesmas do app
// (front/src/services/sms.js). Se mudar uma, mude a outra.

// Onde o gateway escuta: o simulado (npm run gateway) e o do Twilio
// (npm run gateway:twilio) usam o mesmo endereco.
const URL_DO_GATEWAY = process.env.SMS_GATEWAY_URL || 'http://127.0.0.1:3002';

// Gateway que nao responde em 10 s e tratado como fora do ar: a recepcao
// nao pode ficar esperando.
const LIMITE_DE_TEMPO_MS = 10000;

const TIPOS = ['lembrete', 'confirmacao', 'remarcacao', 'cancelamento'];

// ---------------------------------------------------------------- NUMERO

// "(31) 91111-1111" -> "+5531911111111". Devolve null quando o numero nao
// e um celular brasileiro: telefone fixo nao recebe SMS, e numero mal
// formatado e a causa numero 1 de SMS que some sem erro.
function normalizarNumero(numero) {
  const texto = String(numero ?? '').trim();

  if (!texto) return null;

  let digitos = texto.replace(/\D/g, '');

  if (texto.startsWith('+')) {
    // Numero de fora do Brasil: so confere o formato E.164.
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

module.exports = {
  URL_DO_GATEWAY,
  LIMITE_DE_TEMPO_MS,
  TIPOS,
  normalizarNumero,
};
