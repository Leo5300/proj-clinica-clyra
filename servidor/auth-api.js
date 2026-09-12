// auth-api.js - API mock de autenticacao da clinica (Aula 4)
//
// Servidor HTTP escrito so com o modulo 'http' do Node: nao precisa instalar
// nada. Ele existe porque o json-server sozinho nao sabe autenticar.
//
// Rode com:
//   node auth-api.js
//
// Porta 3001 para nao brigar com o json-server da Aula 3, que usa a 3000.
//
// Endpoints:
//
//   POST   /login
//   GET    /medicos
//   POST   /medicos
//   PUT    /medicos/:id
//   DELETE /medicos/:id
//   GET    /perfil
//
// As rotas de medicos e perfil exigem:
//   Authorization: Bearer <token>
//
// ATENCAO - este servidor e didatico, NAO e um modelo de producao:
//   - as senhas estao em texto puro no codigo;
//   - o token e um texto aleatorio guardado em memoria, nao um JWT assinado;
//   - o servidor fala HTTP, nao HTTPS.
//
// Cada um desses pontos e discutido na Aula 4.

const http = require('http');
const crypto = require('crypto');

const PORTA = 3001;

// "Banco" de usuarios da clinica.
// Em producao: hash da senha, nunca o texto.
const USUARIOS = [
  {
    id: 1,
    email: 'recepcao@clinica.com',
    senha: 'clinica123',
    nome: 'Recepção',
    perfil: 'recepcao',
  },
  {
    id: 2,
    email: 'joao@clinica.com',
    senha: 'medico123',
    nome: 'Dr. João de Oliveira',
    perfil: 'medico',
  },
];

// "Banco" de medicos da API de autenticacao.
// O mesmo array e usado no GET, POST, PUT e DELETE.
//
// Como este e um mock em memoria, reiniciar o servidor restaura
// os registros para este estado inicial.
const MEDICOS = [
  {
    id: 1,
    nome: 'João de Oliveira',
    especialidade: 'Cardiologista',
    crm: '12345/MG',
  },
  {
    id: 2,
    nome: 'Antônio de Oliveira',
    especialidade: 'Pediatra',
    crm: '23456/MG',
  },
  {
    id: 3,
    nome: 'Maria da Silva',
    especialidade: 'Dermatologista',
    crm: '34567/SP',
  },
  {
    id: 4,
    nome: 'Beatriz Souza',
    especialidade: 'Ginecologista',
    crm: '45678/RJ',
  },
];

// Tokens validos, em memoria: token -> id do usuario.
//
// Reiniciar o servidor invalida todas as sessoes.
const SESSOES = new Map();

function json(res, status, corpo) {
  const texto = JSON.stringify(corpo);

  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  });

  res.end(texto);
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

function usuarioDoToken(req) {
  const cabecalho = req.headers['authorization'] || '';

  const token = cabecalho.startsWith('Bearer ')
    ? cabecalho.slice(7)
    : null;

  if (!token) {
    return null;
  }

  const id = SESSOES.get(token);

  if (!id) {
    return null;
  }

  return USUARIOS.find((u) => u.id === id) || null;
}

function proximoId() {
  if (MEDICOS.length === 0) {
    return 1;
  }

  return Math.max(...MEDICOS.map((medico) => Number(medico.id))) + 1;
}

const servidor = http.createServer(async (req, res) => {
  console.log(`${req.method} ${req.url}`);

  if (req.method === 'OPTIONS') {
    return json(res, 204, {});
  }

  // =====================================================================
  // LOGIN
  // =====================================================================

  if (req.method === 'POST' && req.url === '/login') {
    const corpo = await lerCorpo(req);

    if (!corpo || !corpo.email || !corpo.senha) {
      return json(res, 400, {
        erro: 'Informe e-mail e senha.',
      });
    }

    const usuario = USUARIOS.find(
      (u) =>
        u.email === corpo.email &&
        u.senha === corpo.senha,
    );

    if (!usuario) {
      // Mensagem generica para nao revelar se o email existe.
      return json(res, 401, {
        erro: 'E-mail ou senha inválidos.',
      });
    }

    const token = crypto.randomBytes(24).toString('hex');

    SESSOES.set(token, usuario.id);

    return json(res, 200, {
      token,
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        perfil: usuario.perfil,
      },
    });
  }

  // =====================================================================
  // ROTAS PROTEGIDAS
  // =====================================================================

  if (
    req.url === '/medicos' ||
    req.url === '/perfil' ||
    req.url.startsWith('/medicos/')
  ) {
    const usuario = usuarioDoToken(req);

    if (!usuario) {
      return json(res, 401, {
        erro: 'Token ausente ou inválido.',
      });
    }
  }

  // =====================================================================
  // PERFIL
  // =====================================================================

  if (req.method === 'GET' && req.url === '/perfil') {
    const usuario = usuarioDoToken(req);

    return json(res, 200, {
      id: usuario.id,
      nome: usuario.nome,
      perfil: usuario.perfil,
    });
  }

  // =====================================================================
  // MEDICOS - LISTAGEM
  // =====================================================================

  if (req.method === 'GET' && req.url === '/medicos') {
    return json(res, 200, MEDICOS);
  }

  // =====================================================================
  // MEDICOS - CADASTRO
  // =====================================================================

  if (req.method === 'POST' && req.url === '/medicos') {
    const corpo = await lerCorpo(req);

    if (
      !corpo ||
      !corpo.nome ||
      !corpo.especialidade ||
      !corpo.crm
    ) {
      return json(res, 400, {
        erro: 'Informe nome, especialidade e CRM.',
      });
    }

    const novoMedico = {
      id: proximoId(),
      nome: corpo.nome,
      especialidade: corpo.especialidade,
      crm: corpo.crm,
    };

    MEDICOS.push(novoMedico);

    return json(res, 201, novoMedico);
  }

  // =====================================================================
  // MEDICOS - EDICAO
  // =====================================================================

  if (
    req.method === 'PUT' &&
    req.url.startsWith('/medicos/')
  ) {
    const id = Number(req.url.split('/')[2]);
    const indice = MEDICOS.findIndex(
      (medico) => Number(medico.id) === id,
    );

    if (indice === -1) {
      return json(res, 404, {
        erro: 'Médico não encontrado.',
      });
    }

    const corpo = await lerCorpo(req);

    if (
      !corpo ||
      !corpo.nome ||
      !corpo.especialidade ||
      !corpo.crm
    ) {
      return json(res, 400, {
        erro: 'Informe nome, especialidade e CRM.',
      });
    }

    const medicoAtualizado = {
      id: MEDICOS[indice].id,
      nome: corpo.nome,
      especialidade: corpo.especialidade,
      crm: corpo.crm,
    };

    MEDICOS[indice] = medicoAtualizado;

    return json(res, 200, medicoAtualizado);
  }

  // =====================================================================
  // MEDICOS - EXCLUSAO
  // =====================================================================

  if (
    req.method === 'DELETE' &&
    req.url.startsWith('/medicos/')
  ) {
    const id = Number(req.url.split('/')[2]);
    const indice = MEDICOS.findIndex(
      (medico) => Number(medico.id) === id,
    );

    if (indice === -1) {
      return json(res, 404, {
        erro: 'Médico não encontrado.',
      });
    }

    const removido = MEDICOS.splice(indice, 1)[0];

    return json(res, 200, removido);
  }

  // =====================================================================
  // ROTA INEXISTENTE
  // =====================================================================

  return json(res, 404, {
    erro: 'Rota não encontrada.',
  });
});

servidor.listen(PORTA, '0.0.0.0', () => {
  console.log(
    `API de autenticação da clínica em http://localhost:${PORTA}`,
  );

  console.log('Usuários de teste:');

  USUARIOS.forEach((u) => {
    console.log(`  ${u.email} / ${u.senha}`);
  });
});