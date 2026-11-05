// consultar-recibo.js - confere se o push foi realmente entregue (Aula 9)
//
// Uso:  node consultar-recibo.js <id-do-recibo>
//
// O id vem da resposta do enviar-push.js.
//
// Por que este script existe: "aceita para entrega" e "entregue" sao
// coisas diferentes. O recibo e onde aparecem os erros que importam - em
// especial DeviceNotRegistered, que significa que aquele token morreu
// (app desinstalado, permissao revogada) e precisa sair do banco.

const https = require('https');

const [, , id] = process.argv;

if (!id) {
  console.error('Uso: node consultar-recibo.js <id-do-recibo>');
  process.exit(1);
}

const corpoJson = JSON.stringify({ ids: [id] });

const requisicao = https.request(
  {
    hostname: 'exp.host',
    path: '/--/api/v2/push/getReceipts',
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
      console.log('');
      console.log('Recibo vazio ({}) = ainda nao processado. Espere alguns');
      console.log('segundos e consulte de novo.');
      console.log('');
      console.log('status "error" com DeviceNotRegistered = o token morreu.');
      console.log('O servidor da clinica precisa apaga-lo do banco.');
    });
  }
);

requisicao.on('error', (e) => {
  console.error('Falha:', e.message);
});

requisicao.write(corpoJson);
requisicao.end();
