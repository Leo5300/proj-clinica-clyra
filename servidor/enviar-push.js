// enviar-push.js - envia um push pelo Expo Push Service (Aula 9)
//
// Node puro, sem dependencia nenhuma. Este script faz o papel do
// SERVIDOR DA CLINICA: e ele que decide quando avisar o paciente.
//
// Uso:
//   node enviar-push.js ExponentPushToken[xxxxxxxx] "Titulo" "Corpo"
//
// Sem argumentos, ele usa um texto de exemplo de lembrete de consulta.
//
// O que este script mostra, e que e o conceito central da aula: o app NAO
// participa da decisao. Ele so forneceu um endereco (o token) e ficou
// esperando. Quem manda e o servidor - aqui, o seu terminal.

const https = require('https');

// O quarto argumento e o id de uma consulta de verdade, para o toque
// abrir a consulta certa. Sem ele, cai no 42 do exemplo da aula.
const [, , tokenArg, tituloArg, corpoArg, consultaArg] = process.argv;

const token = tokenArg;
const titulo = tituloArg || 'Lembrete de consulta';
const corpo = corpoArg || 'Você tem uma consulta hoje às 14:00.';

if (!token || !token.startsWith('ExponentPushToken')) {
  console.error('Informe o token do dispositivo.');
  console.error('Uso: node enviar-push.js ExponentPushToken[xxxx] "Titulo" "Corpo"');
  console.error('');
  console.error('O token aparece na tela do app de demonstracao.');
  process.exit(1);
}

// Formato da mensagem definido pelo Expo Push Service.
// 'data' e o que volta para o app quando o usuario toca na notificacao -
// mesmo papel que tinha na Aula 8.
const mensagem = {
  to: token,
  title: titulo,
  body: corpo,
  sound: 'default',
  data: { consultaId: consultaArg || '42', tela: 'DetalheConsulta' },
  // channelId precisa bater com o canal criado no app (Android).
  channelId: 'lembretes-consulta',
};

const corpoJson = JSON.stringify(mensagem);

const requisicao = https.request(
  {
    hostname: 'exp.host',
    path: '/--/api/v2/push/send',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Accept-Encoding': 'identity',
      'Content-Length': Buffer.byteLength(corpoJson),
    },
  },
  (resposta) => {
    let dados = '';
    resposta.on('data', (pedaco) => { dados += pedaco; });
    resposta.on('end', () => {
      console.log('HTTP', resposta.statusCode);
      console.log(dados);

      // ATENCAO - dois pontos que confundem:
      //
      // 1. O HTTP e 200 mesmo quando a mensagem foi RECUSADA. O que vale e
      //    o campo "status" DENTRO do corpo, e nao o codigo HTTP. E a mesma
      //    licao da Aula 5: 200 OK nao quer dizer "deu certo".
      //
      // 2. "status": "ok" significa apenas que o Expo ACEITOU a mensagem
      //    para entrega. NAO significa que ela chegou ao aparelho - a
      //    confirmacao vem depois, no recibo (getReceipts).
      //
      // Erros aparecem nos DOIS lugares: os que o Expo ja sabe na hora
      // (token com formato invalido, token desconhecido) voltam aqui
      // mesmo; os que so aparecem na entrega (aparelho que desinstalou o
      // app depois do envio) so aparecem no recibo.
      try {
        const json = JSON.parse(dados);
        const resultado = json?.data;

        if (resultado?.status === 'error') {
          console.log('');
          console.log('RECUSADA na hora do envio.');
          console.log('Erro:', resultado.details?.error);
          console.log('Repare que o HTTP foi 200 assim mesmo.');
          if (resultado.details?.error === 'DeviceNotRegistered') {
            console.log('');
            console.log('DeviceNotRegistered = este token nao vale (nunca valeu, ou');
            console.log('morreu). O servidor da clinica deve apaga-lo do banco.');
          }
        } else if (resultado?.id) {
          console.log('');
          console.log('Mensagem aceita para entrega. Id do recibo:', resultado.id);
          console.log('Aceita NAO e o mesmo que entregue - veja o slide sobre recibos.');
          console.log('Para conferir a entrega:');
          console.log('  node consultar-recibo.js ' + resultado.id);
        }
      } catch (e) {
        // resposta nao veio em JSON: o proprio texto acima ja foi impresso
      }
    });
  }
);

requisicao.on('error', (e) => {
  console.error('Falha ao falar com o Expo Push Service:', e.message);
});

requisicao.write(corpoJson);
requisicao.end();
