// auth-api.js - API unica da clinica (mock didatico)
//
// Servidor HTTP escrito so com modulos nativos do Node ('http' e 'crypto')
// e o fetch global do Node 18+: nao precisa instalar nada.
//
// Rode com:
//   node servidor/auth-api.js
//
// O app fala SO com esta API, na porta 3001. O json-server (porta 3000)
// virou armazenamento interno: roda em 127.0.0.1 e quem conversa com ele
// e este arquivo. O json-server nao sabe autenticar nem aplicar regra
// nenhuma; se o app falasse direto com ele, qualquer regra daqui poderia
// ser pulada.
//
// As rotas que existem estao na tabela ROTAS, no fim do arquivo. Rota fora
// dela responde 404: a API nega por padrao.
//
// ATENCAO - este servidor e didatico, NAO e um modelo de producao:
//   - o token e um texto aleatorio guardado em memoria, nao um JWT assinado;
//   - o servidor fala HTTP, nao HTTPS.

const http = require('http');
const crypto = require('crypto');

const PORTA = 3001;

// Armazenamento interno. 127.0.0.1: so o proprio computador alcanca.
const URL_DADOS = 'http://127.0.0.1:3000';

// Colecao onde fica o cadastro de cada perfil. Recepcao nao tem cadastro.
const COLECAO_DO_VINCULO = {
  medico: 'medicos',
  paciente: 'pacientes',
};

// Sessoes validas, em memoria: token -> { usuarioId }.
// Reiniciar o servidor encerra todas as sessoes.
const SESSOES = new Map();

// Erro com status HTTP: as acoes lancam e o servidor responde
// { erro, codigo } com o status certo.
class ErroHttp extends Error {
  constructor(status, mensagem, codigo) {
    super(mensagem);
    this.status = status;
    this.codigo = codigo;
  }
}

const ok = (corpo) => ({ status: 200, corpo });
const criado = (corpo) => ({ status: 201, corpo });

function json(res, status, corpo) {
  const texto = JSON.stringify(corpo);

  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
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

// =====================================================================
// ARMAZENAMENTO (json-server)
// =====================================================================

async function dados(metodo, caminho, corpo) {
  const resposta = await fetch(`${URL_DADOS}${caminho}`, {
    method: metodo,
    headers:
      corpo === undefined ? {} : { 'Content-Type': 'application/json' },
    body: corpo === undefined ? undefined : JSON.stringify(corpo),
  });

  // 404 do json-server = registro inexistente. Quem chama decide o que
  // isso significa para o usuario.
  if (resposta.status === 404) {
    return null;
  }

  if (!resposta.ok) {
    throw new Error(`json-server respondeu ${resposta.status}`);
  }

  return resposta.json();
}

const caminhoDoRegistro = (colecao, id) =>
  `/${colecao}/${encodeURIComponent(id)}`;

async function listar(colecao) {
  return (await dados('GET', `/${colecao}`)) ?? [];
}

async function obter(colecao, id) {
  // Id vazio nunca existe: evita pedir "/pacientes/undefined".
  if (id === undefined || id === null || id === '') {
    return null;
  }

  return dados('GET', caminhoDoRegistro(colecao, id));
}

const inserir = (colecao, registro) =>
  dados('POST', `/${colecao}`, registro);

const substituir = (colecao, id, registro) =>
  dados('PUT', caminhoDoRegistro(colecao, id), registro);

const apagar = (colecao, id) =>
  dados('DELETE', caminhoDoRegistro(colecao, id));

// O json-server grava id como texto, mas ha ids antigos em numero
// (medicoId dos horarios): toda comparacao passa por String.
const mesmoId = (a, b) => String(a) === String(b);

// O id vem da URL ou do armazenamento, nunca do corpo.
function semId(corpo) {
  const { id, ...campos } = corpo;
  return campos;
}

function texto(valor) {
  return typeof valor === 'string' && valor.trim() !== '';
}

const normalizarEmail = (email) =>
  String(email ?? '').trim().toLowerCase();

// =====================================================================
// USUARIOS E SESSOES
// =====================================================================

// timingSafeEqual leva o mesmo tempo acertando ou errando: o tempo da
// resposta nao entrega quantos caracteres batem.
function senhaConfere(usuario, senha) {
  if (!usuario.salt || !usuario.senhaHash || typeof senha !== 'string') {
    return false;
  }

  const calculado = crypto.scryptSync(senha, usuario.salt, 64);
  const guardado = Buffer.from(usuario.senhaHash, 'hex');

  return (
    calculado.length === guardado.length &&
    crypto.timingSafeEqual(calculado, guardado)
  );
}

async function usuarioPorEmail(email) {
  const procurado = normalizarEmail(email);
  const usuarios = await listar('usuarios');

  return (
    usuarios.find((u) => normalizarEmail(u.email) === procurado) || null
  );
}

// O que o app recebe sobre quem esta logado. Nunca salt nem senhaHash.
async function montarMe(usuario) {
  const colecao = COLECAO_DO_VINCULO[usuario.perfil];
  const vinculado = colecao
    ? await obter(colecao, usuario.vinculoId)
    : null;

  return {
    id: usuario.id,
    nome: colecao ? vinculado?.nome ?? '' : 'Recepção',
    email: usuario.email,
    perfil: usuario.perfil,
    vinculoId: usuario.vinculoId ?? null,
    trocarSenha: usuario.trocarSenha === true,
    fotoUri: vinculado?.fotoUri ?? null,
  };
}

async function abrirSessao(usuario) {
  const token = crypto.randomBytes(24).toString('hex');

  SESSOES.set(token, { usuarioId: usuario.id });

  return { token, usuario: await montarMe(usuario) };
}

// Recarrega o usuario a cada requisicao: desativar a conta ou trocar o
// perfil vale na hora, sem esperar a sessao expirar.
async function usuarioDaRequisicao(req) {
  const cabecalho = req.headers['authorization'] || '';
  const token = cabecalho.startsWith('Bearer ')
    ? cabecalho.slice(7)
    : null;
  const sessao = token ? SESSOES.get(token) : null;

  if (!sessao) {
    return null;
  }

  const usuario = await obter('usuarios', sessao.usuarioId);

  if (!usuario || usuario.ativo === false) {
    SESSOES.delete(token);
    return null;
  }

  return usuario;
}

// =====================================================================
// AUTENTICACAO E CONTA
// =====================================================================

async function login({ corpo }) {
  if (!texto(corpo.email) || !texto(corpo.senha)) {
    throw new ErroHttp(400, 'Informe e-mail e senha.');
  }

  const usuario = await usuarioPorEmail(corpo.email);

  if (
    !usuario ||
    usuario.ativo === false ||
    !senhaConfere(usuario, corpo.senha)
  ) {
    // Mesma mensagem nos tres casos, para nao revelar se o e-mail existe.
    throw new ErroHttp(401, 'E-mail ou senha inválidos.');
  }

  return ok(await abrirSessao(usuario));
}

async function obterMe({ usuario }) {
  return ok(await montarMe(usuario));
}

// =====================================================================
// PACIENTES
// =====================================================================

async function pacienteExistente(id) {
  const paciente = await obter('pacientes', id);

  if (!paciente) {
    throw new ErroHttp(404, 'Paciente não encontrado.');
  }

  return paciente;
}

async function listarPacientes() {
  return ok(await listar('pacientes'));
}

async function obterPaciente({ params }) {
  return ok(await pacienteExistente(params.id));
}

async function criarPaciente({ corpo }) {
  return criado(await inserir('pacientes', semId(corpo)));
}

async function atualizarPaciente({ params, corpo }) {
  const atual = await pacienteExistente(params.id);

  return ok(await substituir('pacientes', atual.id, semId(corpo)));
}

async function excluirPaciente({ params }) {
  const paciente = await obter('pacientes', params.id);

  if (!paciente) {
    throw new ErroHttp(404, 'Paciente não encontrado.');
  }

  await apagar('pacientes', paciente.id);

  return ok(paciente);
}

// =====================================================================
// MEDICOS
// =====================================================================

async function listarMedicos() {
  return ok(await listar('medicos'));
}

async function obterMedico({ params }) {
  const medico = await obter('medicos', params.id);

  if (!medico) {
    throw new ErroHttp(404, 'Médico não encontrado.');
  }

  return ok(medico);
}

async function criarMedico({ corpo }) {
  const campos = semId(corpo);

  if (
    !texto(campos.nome) ||
    !texto(campos.especialidade) ||
    !texto(campos.crm)
  ) {
    throw new ErroHttp(400, 'Informe nome, especialidade e CRM.');
  }

  return criado(await inserir('medicos', campos));
}

async function atualizarMedico({ params, corpo }) {
  const atual = await obter('medicos', params.id);

  if (!atual) {
    throw new ErroHttp(404, 'Médico não encontrado.');
  }

  const campos = semId(corpo);

  if (
    !texto(campos.nome) ||
    !texto(campos.especialidade) ||
    !texto(campos.crm)
  ) {
    throw new ErroHttp(400, 'Informe nome, especialidade e CRM.');
  }

  return ok(await substituir('medicos', atual.id, campos));
}

async function excluirMedico({ params }) {
  const medico = await obter('medicos', params.id);

  if (!medico) {
    throw new ErroHttp(404, 'Médico não encontrado.');
  }

  await apagar('medicos', medico.id);

  return ok(medico);
}

// =====================================================================
// ESPECIALIDADES
// =====================================================================

async function especialidadeExistente(id) {
  const especialidade = await obter('especialidades', id);

  if (!especialidade) {
    throw new ErroHttp(404, 'Especialidade não encontrada.');
  }

  return especialidade;
}

async function listarEspecialidades() {
  return ok(await listar('especialidades'));
}

async function criarEspecialidade({ corpo }) {
  return criado(await inserir('especialidades', semId(corpo)));
}

async function atualizarEspecialidade({ params, corpo }) {
  const atual = await especialidadeExistente(params.id);

  return ok(await substituir('especialidades', atual.id, semId(corpo)));
}

async function excluirEspecialidade({ params }) {
  const atual = await especialidadeExistente(params.id);

  await apagar('especialidades', atual.id);

  return ok(atual);
}

// =====================================================================
// HORARIOS DE ATENDIMENTO
// =====================================================================

async function horarioExistente(id) {
  const horario = await obter('horarios', id);

  if (!horario) {
    throw new ErroHttp(404, 'Horário não encontrado.');
  }

  return horario;
}

async function listarHorarios() {
  return ok(await listar('horarios'));
}

async function criarHorario({ corpo }) {
  return criado(await inserir('horarios', semId(corpo)));
}

async function atualizarHorario({ params, corpo }) {
  const atual = await horarioExistente(params.id);

  return ok(await substituir('horarios', atual.id, semId(corpo)));
}

async function excluirHorario({ params }) {
  const atual = await horarioExistente(params.id);

  await apagar('horarios', atual.id);

  return ok(atual);
}

// =====================================================================
// CONSULTAS
// =====================================================================

async function consultaExistente(id) {
  const consulta = await obter('consultas', id);

  if (!consulta) {
    throw new ErroHttp(404, 'Consulta não encontrada.');
  }

  return consulta;
}

async function listarConsultas() {
  return ok(await listar('consultas'));
}

async function obterConsulta({ params }) {
  return ok(await consultaExistente(params.id));
}

async function criarConsulta({ corpo }) {
  return criado(await inserir('consultas', semId(corpo)));
}

async function remarcarConsulta({ params, corpo }) {
  const atual = await consultaExistente(params.id);

  return ok(await substituir('consultas', atual.id, semId(corpo)));
}

async function cancelarConsulta({ params }) {
  const atual = await consultaExistente(params.id);

  await apagar('consultas', atual.id);

  return ok(atual);
}

// =====================================================================
// SINAIS VITAIS
// =====================================================================

async function listarSinaisVitais({ query }) {
  const pacienteId = query.get('pacienteId');
  const consultaId = query.get('consultaId');
  const sinais = await listar('sinaisVitais');

  return ok(
    sinais.filter(
      (s) =>
        (!pacienteId || mesmoId(s.pacienteId, pacienteId)) &&
        (!consultaId || mesmoId(s.consultaId, consultaId)),
    ),
  );
}

async function registrarSinaisVitais({ corpo }) {
  return criado(await inserir('sinaisVitais', semId(corpo)));
}

// =====================================================================
// ROTAS
// =====================================================================
//
// Unica lista do que existe.
//   publica: true                    -> nao exige login

const ROTAS = [
  { metodo: 'POST', caminho: '/login', publica: true, acao: login },

  { metodo: 'GET', caminho: '/me', acao: obterMe },

  { metodo: 'GET', caminho: '/pacientes', acao: listarPacientes },
  { metodo: 'GET', caminho: '/pacientes/:id', acao: obterPaciente },
  { metodo: 'POST', caminho: '/pacientes', acao: criarPaciente },
  { metodo: 'PUT', caminho: '/pacientes/:id', acao: atualizarPaciente },
  { metodo: 'DELETE', caminho: '/pacientes/:id', acao: excluirPaciente },

  { metodo: 'GET', caminho: '/medicos', acao: listarMedicos },
  { metodo: 'GET', caminho: '/medicos/:id', acao: obterMedico },
  { metodo: 'POST', caminho: '/medicos', acao: criarMedico },
  { metodo: 'PUT', caminho: '/medicos/:id', acao: atualizarMedico },
  { metodo: 'DELETE', caminho: '/medicos/:id', acao: excluirMedico },

  { metodo: 'GET', caminho: '/especialidades', acao: listarEspecialidades },
  { metodo: 'POST', caminho: '/especialidades', acao: criarEspecialidade },
  { metodo: 'PUT', caminho: '/especialidades/:id', acao: atualizarEspecialidade },
  { metodo: 'DELETE', caminho: '/especialidades/:id', acao: excluirEspecialidade },

  { metodo: 'GET', caminho: '/horarios', acao: listarHorarios },
  { metodo: 'POST', caminho: '/horarios', acao: criarHorario },
  { metodo: 'PUT', caminho: '/horarios/:id', acao: atualizarHorario },
  { metodo: 'DELETE', caminho: '/horarios/:id', acao: excluirHorario },

  { metodo: 'GET', caminho: '/consultas', acao: listarConsultas },
  { metodo: 'GET', caminho: '/consultas/:id', acao: obterConsulta },
  { metodo: 'POST', caminho: '/consultas', acao: criarConsulta },
  { metodo: 'PUT', caminho: '/consultas/:id', acao: remarcarConsulta },
  { metodo: 'DELETE', caminho: '/consultas/:id', acao: cancelarConsulta },

  { metodo: 'GET', caminho: '/sinaisVitais', acao: listarSinaisVitais },
  { metodo: 'POST', caminho: '/sinaisVitais', acao: registrarSinaisVitais },
];

function decodificar(parte) {
  try {
    return decodeURIComponent(parte);
  } catch (e) {
    return parte;
  }
}

function encontrarRota(metodo, caminho) {
  const partes = caminho.split('/').filter(Boolean);

  for (const rota of ROTAS) {
    const modelo = rota.caminho.split('/').filter(Boolean);

    if (rota.metodo !== metodo || modelo.length !== partes.length) {
      continue;
    }

    const params = {};
    const casou = modelo.every((parte, i) => {
      if (parte.startsWith(':')) {
        params[parte.slice(1)] = decodificar(partes[i]);
        return true;
      }

      return parte === partes[i];
    });

    if (casou) {
      return { rota, params };
    }
  }

  return null;
}

// =====================================================================
// ATENDIMENTO DE CADA REQUISICAO
// =====================================================================

async function atender(req, contexto) {
  const encontrada = encontrarRota(req.method, contexto.url.pathname);

  if (!encontrada) {
    throw new ErroHttp(404, 'Rota não encontrada.');
  }

  const { rota, params } = encontrada;
  contexto.params = params;

  if (!rota.publica) {
    // Quem e voce? (401)
    contexto.usuario = await usuarioDaRequisicao(req);

    if (!contexto.usuario) {
      throw new ErroHttp(401, 'Sessão expirada. Entre novamente.');
    }
  }

  if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    const corpo = await lerCorpo(req);

    if (!corpo || typeof corpo !== 'object' || Array.isArray(corpo)) {
      throw new ErroHttp(400, 'Envie os dados em JSON.');
    }

    contexto.corpo = corpo;
  }

  return rota.acao(contexto);
}

const servidor = http.createServer(async (req, res) => {
  console.log(`${req.method} ${req.url}`);

  if (req.method === 'OPTIONS') {
    return json(res, 204, {});
  }

  const url = new URL(req.url, 'http://localhost');
  const contexto = { url, query: url.searchParams, usuario: null };

  try {
    const { status, corpo } = await atender(req, contexto);
    return json(res, status, corpo);
  } catch (e) {
    if (e instanceof ErroHttp) {
      const corpo = { erro: e.message };

      if (e.codigo) {
        corpo.codigo = e.codigo;
      }

      return json(res, e.status, corpo);
    }

    // Falha inesperada (ex.: json-server fora do ar). O log leva so o
    // motivo tecnico, nada da requisicao.
    console.error('[erro]', e.message);

    return json(res, 500, {
      erro: 'Não foi possível concluir agora. Tente novamente em instantes.',
    });
  }
});

servidor.listen(PORTA, '0.0.0.0', () => {
  // Texto fixo, como no material da Aula 4: logins didaticos de teste.
  console.log(
    'API da clinica em http://localhost:3001 (dados em http://127.0.0.1:3000)',
  );
  console.log('Logins de teste:');
  console.log('  recepcao@clinica.com / clinica123');
  console.log('  joao@clinica.com / medico123');
  console.log('  lucas@exemplo.com / paciente123');
});
