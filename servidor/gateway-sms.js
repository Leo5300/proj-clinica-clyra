// gateway-sms.js - gateway de SMS simulado (Aula 13)
//
// Imita o que um servico como o Twilio ou a Zenvia faz, mas NAO envia SMS
// de verdade: registra no terminal e responde no mesmo formato que esses
// servicos usam. Node puro, sem dependencia nenhuma.
//
// Quem fala com ele e a API da clinica (auth-api.js), nunca o app. Por isso
// ele escuta so no proprio computador (127.0.0.1): um aparelho na rede nao
// consegue mandar SMS na conta da clinica pulando as regras da API.
//
// Rode com (na pasta front):  npm run gateway
// ou, na raiz do repositorio: node servidor/gateway-sms.js
//
// Endpoints:
//   POST /mensagens  { para, texto }  -> 202 { id, status: 'enfileirada' }
//   GET  /mensagens                   -> 200 { mensagens, totalMensagens, custoTotal }
//   GET  /mensagens/:id               -> 200 { id, status, ... }
//
// Repare no 202 (Accepted) e no status 'enfileirada': gateway nenhum
// entrega na hora. A mensagem entra numa fila e a confirmacao vem depois,
// como os recibos do push na Aula 9.

const http = require('http');
const crypto = require('crypto');

const PORTA = Number(process.env.PORTA || 3002);

// "Banco" de mensagens em memoria: reiniciar o gateway apaga o historico.
const MENSAGENS = [];

// Custo ficticio por segmento, so para a conta aparecer na tela.
const CUSTO_POR_MENSAGEM = 0.12;

// Quanto tempo a entrega simulada demora para acontecer.
const ATRASO_DA_ENTREGA_MS = 4000;

function json(res, status, corpo) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(corpo));
}

function lerCorpo(req) {
  return new Promise((resolve) => {
    let dados = '';
    req.on('data', (pedaco) => {
      dados += pedaco;
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(dados || '{}'));
      } catch (e) {
        resolve(null);
      }
    });
  });
}

// Um SMS tem 160 caracteres. Passou disso, o texto vira varias mensagens,
// e cada uma e cobrada. (Conta simplificada, igual a do material da aula;
// a API da clinica e o app fazem a conta completa, com acentos.)
function segmentos(texto) {
  return Math.max(1, Math.ceil(texto.length / 160));
}

// E.164: + seguido de 10 a 15 digitos.
function validarNumero(numero) {
  return /^\+\d{10,15}$/.test(String(numero || ''));
}

const servidor = http.createServer(async (req, res) => {
  console.log(`${req.method} ${req.url}`);

  // ------------------------------------------------------------- ENVIAR
  if (req.method === 'POST' && req.url === '/mensagens') {
    const corpo = await lerCorpo(req);

    if (!corpo || !corpo.para || !corpo.texto) {
      return json(res, 400, { erro: 'Informe "para" e "texto".' });
    }

    // Numero mal formatado e a causa numero 1 de SMS que "sumiu". Gateway
    // serio recusa na hora, em vez de aceitar e perder a mensagem.
    if (!validarNumero(corpo.para)) {
      return json(res, 400, {
        erro: 'Número inválido. Use o formato internacional: +5516999998888.',
      });
    }

    const partes = segmentos(corpo.texto);
    const mensagem = {
      id: crypto.randomBytes(8).toString('hex'),
      para: corpo.para,
      texto: corpo.texto,
      caracteres: corpo.texto.length,
      segmentos: partes,
      custo: Number((partes * CUSTO_POR_MENSAGEM).toFixed(2)),
      status: 'enfileirada',
      criadaEm: new Date().toISOString(),
    };
    MENSAGENS.unshift(mensagem);

    console.log('  ---------------------------------------------');
    console.log('  SMS SIMULADO (nao foi enviado de verdade)');
    console.log('  para:', mensagem.para);
    console.log('  texto:', mensagem.texto);
    console.log(
      `  ${mensagem.caracteres} caracteres = ${partes} segmento(s) = R$ ${mensagem.custo}`,
    );
    console.log('  ---------------------------------------------');

    // A entrega acontece depois, como na vida real.
    setTimeout(() => {
      mensagem.status = 'entregue';
      mensagem.entregueEm = new Date().toISOString();
      console.log(`  [${mensagem.id}] status -> entregue`);
    }, ATRASO_DA_ENTREGA_MS);

    // 202 Accepted: aceita para envio, ainda nao entregue.
    return json(res, 202, { id: mensagem.id, status: mensagem.status });
  }

  // ----------------------------------------------------------- CONSULTAR
  if (req.method === 'GET' && req.url === '/mensagens') {
    const total = MENSAGENS.reduce((soma, m) => soma + m.custo, 0);
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
    return json(res, 200, mensagem);
  }

  json(res, 404, { erro: 'Rota não encontrada.' });
});

servidor.listen(PORTA, '127.0.0.1', () => {
  console.log(`Gateway de SMS (simulado) em http://127.0.0.1:${PORTA}`);
  console.log('Nenhuma mensagem sai daqui de verdade.');
  console.log(`Custo ficticio: R$ ${CUSTO_POR_MENSAGEM} por segmento.`);
});
