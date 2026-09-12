// src/services/api.js
//
// Unico lugar do app que chama fetch. Ele monta o header Authorization
// sozinho e trata o 401 uma vez so, para as telas voltarem a falar o idioma
// do dominio: get('/medicos'), post('/pacientes', dados).
//
// DECISAO DA SQUAD (Aula 4):
// Durante o desenvolvimento, usamos dois servidores locais.
//
// AUTH_URL (3001) -> auth-api.js:
// autenticacao e modulo de medicos, com rotas protegidas por Bearer.
//
// API_URL (3000) -> json-server:
// mock de pacientes, horarios e especialidades.
//
// Os dois servidores sao usados apenas no ambiente academico de desenvolvimento.
// Na aplicacao real, a comunicacao devera ocorrer por HTTPS.
//
// HTTP e usado nos mocks locais porque eles rodam no ambiente de desenvolvimento.
// A API real da clinica devera utilizar HTTPS por lidar com dados sensiveis.
//

import { obterToken, limparToken } from './sessao';

const AUTH_URL = 'http://10.110.12.54:3001';
const API_URL = 'http://10.110.12.54:3000';

// Em dispositivo fisico (Expo Go), localhost e o proprio aparelho.
// Use o IPv4 da maquina que roda os servidores, na mesma rede Wi-Fi.

class SessaoExpirada extends Error {
  constructor() {
    super('Sessão expirada.');
    this.name = 'SessaoExpirada';
  }
}

// base: 'api' (json-server) ou 'auth' (auth-api)
const BASES = {
  api: API_URL,
  auth: AUTH_URL,
};

async function requisicao(caminho, opcoes = {}) {
  const {
    base = 'api',
    corpo,
    metodo = 'GET',
  } = opcoes;

  const raiz = BASES[base];
  const token = await obterToken();

  const headers = {};

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  // Content-Type so quando existe corpo.
  if (corpo !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  const resposta = await fetch(`${raiz}${caminho}`, {
    method: metodo,
    headers,
    body:
      corpo !== undefined
        ? JSON.stringify(corpo)
        : undefined,
  });

  // 401 fora da tela de login significa sessao expirada.
  if (resposta.status === 401) {
    await limparToken();
    throw new SessaoExpirada();
  }

  if (!resposta.ok) {
    throw new Error(
      `Erro ${resposta.status} na requisicao ${caminho}`,
    );
  }

  // 204 nao possui corpo.
  if (resposta.status === 204) {
    return null;
  }

  return resposta.json();
}

const get = (caminho, opcoes) =>
  requisicao(caminho, {
    ...opcoes,
    metodo: 'GET',
  });

const post = (caminho, corpo, opcoes) =>
  requisicao(caminho, {
    ...opcoes,
    metodo: 'POST',
    corpo,
  });

const put = (caminho, corpo, opcoes) =>
  requisicao(caminho, {
    ...opcoes,
    metodo: 'PUT',
    corpo,
  });

const remover = (caminho, opcoes) =>
  requisicao(caminho, {
    ...opcoes,
    metodo: 'DELETE',
  });

// =====================================================================
// LOGIN
// =====================================================================

async function autenticar(email, senha) {
  // O login nao usa requisicao(), porque ainda nao existe token.
  const resposta = await fetch(`${AUTH_URL}/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email,
      senha,
    }),
  });

  if (resposta.status === 401) {
    // Mensagem generica para nao revelar se o email existe.
    const erro = new Error(
      'E-mail ou senha inválidos.',
    );

    erro.credencialInvalida = true;

    throw erro;
  }

  if (!resposta.ok) {
    throw new Error(
      `Erro ${resposta.status} ao autenticar`,
    );
  }

  return resposta.json();
}

// =====================================================================
// MEDICOS -- auth-api (3001)
// =====================================================================

const buscarMedicos = () =>
  get('/medicos', {
    base: 'auth',
  });

const criarMedico = (medico) =>
  post('/medicos', medico, {
    base: 'auth',
  });

const atualizarMedico = (id, medico) =>
  put(`/medicos/${id}`, medico, {
    base: 'auth',
  });

const excluirMedico = (id) =>
  remover(`/medicos/${id}`, {
    base: 'auth',
  });

// =====================================================================
// PACIENTES -- json-server (3000)
// =====================================================================

const buscarPacientes = () =>
  get('/pacientes');

const criarPaciente = (paciente) =>
  post('/pacientes', paciente);

const atualizarPaciente = (id, paciente) =>
  put(`/pacientes/${id}`, paciente);

const excluirPaciente = (id) =>
  remover(`/pacientes/${id}`);

// =====================================================================
// HORARIOS -- json-server (3000)
// =====================================================================

const buscarHorarios = () =>
  get('/horarios');

const criarHorario = (horario) =>
  post('/horarios', horario);

const atualizarHorario = (id, horario) =>
  put(`/horarios/${id}`, horario);

const excluirHorario = (id) =>
  remover(`/horarios/${id}`);

// =====================================================================
// ESPECIALIDADES -- json-server (3000)
// =====================================================================

const buscarEspecialidades = () =>
  get('/especialidades');

const criarEspecialidade = (especialidade) =>
  post('/especialidades', especialidade);

const atualizarEspecialidade = (
  id,
  especialidade,
) =>
  put(`/especialidades/${id}`, especialidade);

const excluirEspecialidade = (id) =>
  remover(`/especialidades/${id}`);

// =====================================================================
// EXPORTS
// =====================================================================

export {
  // cliente HTTP
  get,
  post,
  put,
  remover,

  // erro de sessao
  SessaoExpirada,

  // autenticacao
  autenticar,

  // medicos
  buscarMedicos,
  criarMedico,
  atualizarMedico,
  excluirMedico,

  // pacientes
  buscarPacientes,
  criarPaciente,
  atualizarPaciente,
  excluirPaciente,

  // horarios
  buscarHorarios,
  criarHorario,
  atualizarHorario,
  excluirHorario,

  // especialidades
  buscarEspecialidades,
  criarEspecialidade,
  atualizarEspecialidade,
  excluirEspecialidade,
};