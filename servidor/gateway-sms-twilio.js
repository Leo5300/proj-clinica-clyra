// gateway-sms-twilio.js - gateway de SMS REAL, usando o Twilio (Aula 13)
//
// Mesmo contrato do gateway-sms.js (o simulado): mesma porta, mesmas rotas,
// mesmo formato de resposta. Por isso a API da clinica e o app NAO mudam
// uma linha. A diferenca esta aqui dentro: em vez de so imprimir no
// terminal, este servidor chama a API REST do Twilio, e o SMS chega de
// verdade.
//
// Antes de rodar:
//   1. Copie servidor/.env.exemplo para servidor/.env e preencha com os
//      dados do Console do Twilio (Account SID, Auth Token e numero).
//   2. Pare o gateway simulado e rode, na pasta front:
//        npm run gateway:twilio
//      (o mesmo que, na raiz: node --env-file=servidor/.env servidor/gateway-sms-twilio.js)
//
// Node puro: a API do Twilio e HTTP comum, entao o fetch nativo do Node
// basta. Nenhum pacote a instalar. O --env-file exige Node 20.6 ou mais novo.
//
// Assim como o simulado, escuta so em 127.0.0.1: quem fala com ele e a API
// da clinica, nunca o app.
//
// Endpoints (iguais aos do simulado):
//   POST /mensagens  { para, texto }  -> 202 { id, status: 'enfileirada' }
//   GET  /mensagens                   -> 200 { mensagens, totalMensagens, custoTotal }
//   GET  /mensagens/:id               -> 200 { id, status, ... }

const http = require('http');

const PORTA = Number(process.env.PORTA || 3002);

// ------------------------------------------------------------ CREDENCIAIS
// Ficam SO no servidor, lidas do arquivo .env - nunca no app (Aula 5).
const ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const NUMERO_TWILIO = process.env.TWILIO_NUMERO;

// Opcional, so para conta TRIAL: ela nao aceita texto livre, apenas os
// modelos prontos do Twilio (ex.: sms_appointment_reminders).
const MODELO_TRIAL = process.env.TWILIO_MODELO_TRIAL;

if (!ACCOUNT_SID || !AUTH_TOKEN || !NUMERO_TWILIO) {
  console.error('Faltam credenciais do Twilio.');
  console.error('Copie servidor/.env.exemplo para servidor/.env e preencha.');
  process.exit(1);
}

// Endereco da API de mensagens da SUA conta.
const URL_TWILIO =
  `https://api.twilio.com/2010-04-01/Accounts/${ACCOUNT_SID}/Messages`;

// Autenticacao HTTP Basic: o texto "SID:TOKEN" codificado em base64.
const AUTORIZACAO =
  'Basic ' + Buffer.from(`${ACCOUNT_SID}:${AUTH_TOKEN}`).toString('base64');

// Custo ESTIMADO em reais, so para o contador do app. Tabela do Twilio
// (nov/2026): US$ 0,0599 por segmento para o Brasil. O valor cobrado de
// verdade o Twilio informa depois, em dolar, e fica em precoTwilio.
const CUSTO_POR_MENSAGEM = Number(process.env.CUSTO_ESTIMADO_BRL || 0.35);

// "Banco" de mensagens em memoria - o id agora e o SID do Twilio (SM...).
const MENSAGENS = [];

function json(res, status, corpo) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(corpo));
}

function lerCorpo(req) {
  return new Promise((resolve) => {
    let dados = '';
    req.on('data', (p) => { dados += p; });
    req.on('end', () => {
      try { resolve(JSON.parse(dados || '{}')); } catch (e) { resolve(null); }
    });
  });
}

function segmentos(texto) {
  return Math.max(1, Math.ceil(texto.length / 160));
}

function limparNumero(numero) {
  return String(numero || '').replace(/\s|-|\(|\)/g, '');
}

function validarNumero(numero) {
  // E.164: + seguido de 10 a 15 digitos. O Twilio exige esse formato.
  return /^\+\d{10,15}$/.test(limparNumero(numero));
}

// O Twilio tem mais status que o app conhece. Aqui eles sao traduzidos
// para os mesmos nomes do gateway simulado.
function traduzirStatus(statusTwilio) {
  switch (statusTwilio) {
    case 'accepted':
    case 'queued':
    case 'sending':
      return 'enfileirada';
    case 'sent':
      return 'enviada'; // a operadora aceitou, mas ainda nao confirmou
    case 'delivered':
      return 'entregue';
    case 'undelivered':
    case 'failed':
      return 'falhou';
    default:
      return statusTwilio;
  }
}

// ------------------------------------------------------- CHAMADAS AO TWILIO
async function twilioEnviar(para, texto) {
  const resposta = await fetch(`${URL_TWILIO}.json`, {
    method: 'POST',
    headers: {
      Authorization: AUTORIZACAO,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    // A API do Twilio recebe FORMULARIO, nao JSON - e os nomes comecam
    // com letra maiuscula: To, From, Body.
    body: new URLSearchParams({ To: para, From: NUMERO_TWILIO, Body: texto }),
  });

  const dados = await resposta.json();
  if (!resposta.ok) {
    // Ex.: 21211 numero invalido, 21608 numero nao verificado (trial)
    const erro = new Error(dados.message || `HTTP ${resposta.status}`);
    erro.codigo = dados.code;
    throw erro;
  }
  return dados; // { sid: 'SM...', status: 'queued', num_segments, ... }
}

async function twilioConsultar(sid) {
  const resposta = await fetch(`${URL_TWILIO}/${sid}.json`, {
    headers: { Authorization: AUTORIZACAO },
  });
  if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);
  return resposta.json();
}

// Pergunta ao Twilio o status atual e atualiza a copia local.
async function atualizar(mensagem) {
  if (mensagem.status === 'entregue' || mensagem.status === 'falhou') {
    return mensagem; // status final: nao muda mais
  }
  try {
    const dados = await twilioConsultar(mensagem.id);
    const anterior = mensagem.status;
    mensagem.status = traduzirStatus(dados.status);
    mensagem.statusTwilio = dados.status;
    if (dados.price) mensagem.precoTwilio = `${dados.price} ${dados.price_unit}`;
    if (dados.error_code) {
      mensagem.erroTwilio = `${dados.error_code}: ${dados.error_message}`;
    }
    if (mensagem.status === 'entregue' && !mensagem.entregueEm) {
      mensagem.entregueEm = new Date(dados.date_updated).toISOString();
    }
    if (mensagem.status !== anterior) {
      console.log(`  [${mensagem.id}] status -> ${mensagem.status}`
                  + ` (Twilio: ${dados.status})`);
    }
  } catch (e) {
    console.log(`  [${mensagem.id}] falha ao consultar o Twilio: ${e.message}`);
  }
  return mensagem;
}

const servidor = http.createServer(async (req, res) => {
  console.log(`${req.method} ${req.url}`);

  // ------------------------------------------------------------- ENVIAR
  if (req.method === 'POST' && req.url === '/mensagens') {
    const corpo = await lerCorpo(req);

    if (!corpo || !corpo.para || !corpo.texto) {
      return json(res, 400, { erro: 'Informe "para" e "texto".' });
    }

    if (!validarNumero(corpo.para)) {
      return json(res, 400, {
        erro: 'Número inválido. Use o formato internacional: +5516999998888.',
      });
    }

    const para = limparNumero(corpo.para);
    // Conta trial: troca o texto pelo modelo do Twilio (ver .env.exemplo).
    const texto = MODELO_TRIAL || corpo.texto;

    let dados;
    try {
      dados = await twilioEnviar(para, texto);
    } catch (e) {
      console.log(`  Twilio recusou: ${e.message} (codigo ${e.codigo})`);
      // 502 Bad Gateway: o NOSSO servidor esta bem; quem recusou foi o Twilio.
      return json(res, 502, {
        erro: `Twilio recusou: ${e.message}`,
        codigo: e.codigo,
      });
    }

    const partes = Number(dados.num_segments) || segmentos(texto);
    const mensagem = {
      id: dados.sid,
      para,
      texto,
      caracteres: texto.length,
      segmentos: partes,
      custo: Number((partes * CUSTO_POR_MENSAGEM).toFixed(2)),
      status: traduzirStatus(dados.status),
      statusTwilio: dados.status,
      criadaEm: new Date().toISOString(),
    };
    MENSAGENS.unshift(mensagem);

    console.log('  ---------------------------------------------');
    console.log('  SMS ENVIADO AO TWILIO (este e de verdade)');
    console.log('  sid:', mensagem.id);
    console.log('  para:', mensagem.para);
    console.log('  texto:', mensagem.texto);
    console.log(`  ${partes} segmento(s) - estimativa R$ ${mensagem.custo}`);
    console.log('  ---------------------------------------------');

    // Confere a entrega depois, so para o terminal mostrar a evolucao.
    setTimeout(() => atualizar(mensagem), 5000);

    // O Twilio responde 201, mas a mensagem so foi ACEITA. Mantemos o 202
    // do simulado: aceita nao e entregue.
    return json(res, 202, { id: mensagem.id, status: mensagem.status });
  }

  // ----------------------------------------------------------- CONSULTAR
  if (req.method === 'GET' && req.url === '/mensagens') {
    await Promise.all(MENSAGENS.map(atualizar));
    const total = MENSAGENS.reduce((s, m) => s + m.custo, 0);
    return json(res, 200, {
      mensagens: MENSAGENS,
      totalMensagens: MENSAGENS.length,
      custoTotal: Number(total.toFixed(2)),
    });
  }

  if (req.method === 'GET' && req.url.startsWith('/mensagens/')) {
    const id = req.url.split('/')[2];
    const mensagem = MENSAGENS.find((m) => m.id === id);
    if (!mensagem) return json(res, 404, { erro: 'Mensagem não encontrada.' });
    return json(res, 200, await atualizar(mensagem));
  }

  json(res, 404, { erro: 'Rota não encontrada.' });
});

servidor.listen(PORTA, '127.0.0.1', () => {
  console.log(`Gateway de SMS (TWILIO) em http://127.0.0.1:${PORTA}`);
  console.log(`Remetente: ${NUMERO_TWILIO}`);
  if (MODELO_TRIAL) {
    console.log(`Modo TRIAL: todo SMS sai com o modelo "${MODELO_TRIAL}".`);
  }
  console.log('Atencao: cada SMS enviado daqui e cobrado pelo Twilio.');
});
