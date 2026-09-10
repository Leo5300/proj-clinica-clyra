// auth-api.js - API mock de autenticacao da clinica (Aula 4)
//
// Servidor HTTP escrito so com o modulo 'http' do Node: nao precisa instalar
// nada. Ele existe porque o json-server sozinho nao sabe autenticar - ele
// entrega qualquer recurso para qualquer um que peca.
//
// Rode com:   node auth-api.js
// Ele sobe em http://0.0.0.0:3001 (porta 3001 para nao brigar com o
// json-server da Aula 3, que usa a 3000).
//
// Endpoints:
//   POST /login      { email, senha }  -> 200 { token, usuario } | 401
//   GET  /medicos    (Authorization: Bearer <token>) -> 200 [...] | 401
//   GET  /perfil     (Authorization: Bearer <token>) -> 200 {...} | 401
//
// ATENCAO - este servidor e didatico, NAO e um modelo de producao:
//   - as senhas estao em texto puro no codigo (o certo e guardar um hash,
//     com bcrypt/argon2);
//   - o "token" e um texto aleatorio guardado em memoria, nao um JWT assinado;
//   - o servidor fala HTTP, nao HTTPS.
// Cada um desses tres pontos e discutido no Momento 1.

const http = require('http');
const crypto = require('crypto');

const PORTA = 3001;

// "Banco" de usuarios da clinica. Em producao: hash da senha, nunca o texto.
const USUARIOS = [
  { id: 1, email: 'recepcao@clinica.com', senha: 'clinica123', nome: 'Recepção', perfil: 'recepcao' },
  { id: 2, email: 'joao@clinica.com',     senha: 'medico123',  nome: 'Dr. João de Oliveira', perfil: 'medico' },
];

const MEDICOS = [
  { id: 1, nome: 'João de Oliveira', especialidade: 'Cardiologista', crm: '12345/MG' },
  { id: 2, nome: 'Antônio de Oliveira', especialidade: 'Pediatra', crm: '23456/MG' },
  { id: 3, nome: 'Maria da Silva', especialidade: 'Dermatologista', crm: '34567/SP' },
  { id: 4, nome: 'Beatriz Souza', especialidade: 'Ginecologista', crm: '45678/RJ' },
];

// Tokens validos, em memoria: token -> id do usuario.
// Reiniciar o servidor invalida todas as sessoes (isso e proposital: os
// alunos veem o app cair para a tela de login quando o token deixa de valer).
const SESSOES = new Map();

function json(res, status, corpo) {
  const texto = JSON.stringify(corpo);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  });
  res.end(texto);
}

function lerCorpo(req) {
  return new Promise((resolve) => {
    let dados = '';
    req.on('data', (pedaco) => { dados += pedaco; });
    req.on('end', () => {
      // Este log existe de proposito: em HTTP puro, tudo o que o app envia
      // chega legivel deste lado - e a qualquer um no caminho.
      console.log('  corpo recebido (texto puro):', dados);
      try { resolve(JSON.parse(dados || '{}')); } catch (e) { resolve(null); }
    });
  });
}

function usuarioDoToken(req) {
  const cabecalho = req.headers['authorization'] || '';
  const token = cabecalho.startsWith('Bearer ') ? cabecalho.slice(7) : null;
  if (!token) return null;
  const id = SESSOES.get(token);
  if (!id) return null;
  return USUARIOS.find((u) => u.id === id) || null;
}

const servidor = http.createServer(async (req, res) => {
  console.log(`${req.method} ${req.url}`);

  if (req.method === 'OPTIONS') return json(res, 204, {});

  // ---------------------------------------------------------------- LOGIN
  if (req.method === 'POST' && req.url === '/login') {
    const corpo = await lerCorpo(req);
    if (!corpo || !corpo.email || !corpo.senha) {
      return json(res, 400, { erro: 'Informe e-mail e senha.' });
    }
    const usuario = USUARIOS.find(
      (u) => u.email === corpo.email && u.senha === corpo.senha
    );
    if (!usuario) {
      // 401: "eu nao sei quem voce e". Repare que a mensagem NAO diz se o
      // que errou foi o e-mail ou a senha - dizer isso entrega ao atacante
      // quais e-mails existem no sistema.
      return json(res, 401, { erro: 'E-mail ou senha inválidos.' });
    }
    const token = crypto.randomBytes(24).toString('hex');
    SESSOES.set(token, usuario.id);
    return json(res, 200, {
      token,
      usuario: { id: usuario.id, nome: usuario.nome, perfil: usuario.perfil },
    });
  }

  // ------------------------------------------------------- ROTAS PROTEGIDAS
  if (req.method === 'GET' && (req.url === '/medicos' || req.url === '/perfil')) {
    const usuario = usuarioDoToken(req);
    if (!usuario) {
      return json(res, 401, { erro: 'Token ausente ou inválido.' });
    }
    if (req.url === '/perfil') {
      return json(res, 200, { id: usuario.id, nome: usuario.nome, perfil: usuario.perfil });
    }
    return json(res, 200, MEDICOS);
  }

  json(res, 404, { erro: 'Rota não encontrada.' });
});

servidor.listen(PORTA, '0.0.0.0', () => {
  console.log(`API de autenticação da clínica em http://localhost:${PORTA}`);
  console.log('Usuários de teste:');
  USUARIOS.forEach((u) => console.log(`  ${u.email} / ${u.senha}`));
});
