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

// ------------------------------------------------------------- SEGMENTOS

// Alfabeto padrao do SMS (GSM 7-bit). Texto so com estes caracteres cabe
// 160 por mensagem. Qualquer outro (a maioria dos acentos do portugues,
// emoji) troca a codificacao para UCS-2, e o limite cai para 70.
const GSM_BASICO =
  '@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !"#¤%&\'()*+,-./0123456789:;<=>?' +
  '¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà';

// Estes tambem sao GSM, mas ocupam dois espacos cada.
const GSM_EXTENSAO = '^{}\\[~]|€\f';

function codificacao(texto) {
  for (const letra of String(texto)) {
    if (!GSM_BASICO.includes(letra) && !GSM_EXTENSAO.includes(letra)) {
      return 'UCS-2';
    }
  }

  return 'GSM-7';
}

// Quantas mensagens o texto vira. Uma mensagem leva 160 (GSM) ou 70
// (UCS-2); texto maior e dividido em partes de 153 ou 67, porque cada parte
// guarda um cabecalho para o celular remontar o texto.
function contarSegmentos(texto) {
  const conteudo = String(texto ?? '');

  if (codificacao(conteudo) === 'GSM-7') {
    let unidades = 0;

    for (const letra of conteudo) {
      unidades += GSM_EXTENSAO.includes(letra) ? 2 : 1;
    }

    return unidades <= 160 ? 1 : Math.ceil(unidades / 153);
  }

  // UCS-2 conta em unidades de 16 bits: um emoji ocupa duas.
  return conteudo.length <= 70 ? 1 : Math.ceil(conteudo.length / 67);
}

// ------------------------------------------------------- CONTEUDO SEGURO

// SMS nao e criptografado, passa pela operadora e aparece na tela
// bloqueada. Numa clinica de psicologia e psiquiatria, a especialidade ja
// e dado de saude (LGPD). Estes termos nunca vao num SMS.
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

function termosDeSaude(texto) {
  const comparavel = String(texto ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

  return TERMOS_DE_SAUDE.filter((termo) => comparavel.includes(termo));
}

// --------------------------------------------------------------- GATEWAY

// Codigos do Twilio que mais aparecem na conta trial, explicados para quem
// esta na recepcao. O gateway do Twilio devolve o codigo junto do erro.
const CODIGOS_DO_TWILIO = {
  20003: 'as credenciais do Twilio no servidor/.env estão erradas',
  21211: 'o número do paciente é inválido',
  21408: 'o envio para o Brasil não está liberado na conta do Twilio',
  21608: 'na conta de teste do Twilio, o número do paciente precisa estar verificado',
  21614: 'o número do paciente não é celular',
};

// Falha do gateway, ja com o status HTTP que a API deve devolver ao app.
class ErroDoGateway extends Error {
  constructor(status, mensagem) {
    super(mensagem);
    this.status = status;
  }
}

async function chamarGateway(caminho, opcoes = {}) {
  const controle = new AbortController();
  const relogio = setTimeout(() => controle.abort(), LIMITE_DE_TEMPO_MS);

  let resposta;

  try {
    resposta = await fetch(`${URL_DO_GATEWAY}${caminho}`, {
      ...opcoes,
      signal: controle.signal,
    });
  } catch (e) {
    // Recusou a conexao ou passou do limite: para quem usa o app, as duas
    // coisas significam "o SMS nao saiu".
    throw new ErroDoGateway(
      503,
      'O serviço de SMS está fora do ar. Tente de novo em instantes ou avise o paciente por telefone.',
    );
  } finally {
    clearTimeout(relogio);
  }

  let corpo;

  try {
    corpo = await resposta.json();
  } catch (e) {
    corpo = null;
  }

  if (resposta.status === 404) {
    throw new ErroDoGateway(404, 'Mensagem não encontrada no serviço de SMS.');
  }

  if (!resposta.ok) {
    // 400 do gateway: o pedido estava errado (numero, texto). 502: o
    // gateway recusou do lado dele (ex.: o Twilio). Os dois chegam ao app
    // com o motivo escrito pelo gateway.
    const explicacao = CODIGOS_DO_TWILIO[corpo?.codigo];

    throw new ErroDoGateway(
      resposta.status === 400 ? 400 : 502,
      explicacao
        ? `O serviço de SMS recusou a mensagem: ${explicacao} (código ${corpo.codigo}).`
        : corpo?.erro ?? `O serviço de SMS recusou a mensagem (HTTP ${resposta.status}).`,
    );
  }

  return corpo;
}

// Entrega ao gateway. Volta { id, status } com status 'enfileirada':
// aceita nao e entregue.
function enviarAoGateway(para, texto) {
  return chamarGateway('/mensagens', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ para, texto }),
  });
}

function consultarNoGateway(id) {
  return chamarGateway(`/mensagens/${encodeURIComponent(id)}`);
}

module.exports = {
  URL_DO_GATEWAY,
  LIMITE_DE_TEMPO_MS,
  TIPOS,
  normalizarNumero,
  codificacao,
  contarSegmentos,
  termosDeSaude,
  ErroDoGateway,
  enviarAoGateway,
  consultarNoGateway,
};
