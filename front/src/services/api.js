// src/services/api.js
//
// Unico lugar do app que chama fetch. Ele monta o header Authorization
// sozinho e trata o 401 uma vez so, para as telas voltarem a falar o idioma
// do dominio: get('/medicos'), post('/pacientes', dados).
//
// DECISAO DA SQUAD (Aula 4, Passo 4, item 18) -- dois servidores no ar:
//   AUTH_URL (3001) -> auth-api.js, o unico que autentica. Tem /login,
//                      /medicos e /perfil, e exige Bearer token.
//   API_URL  (3000) -> json-server, onde vive o CRUD completo das quatro
//                      colecoes. Nao sabe autenticar: ignora o header.
// Enquanto o back-end real nao substitui os dois, o CRUD continua na 3000 e
// so a autenticacao usa a 3001. O token viaja nas duas -- na 3000 ele e
// inofensivo. Isso esta registrado no README.
//
// HTTP e nao HTTPS porque os dois mocks rodam na propria maquina e o trafego
// nao sai dela. A API real da clinica exigira https:// -- no app muda so a
// letra na URL; o resto (certificado, dominio, renovacao) e fora do app.

import { obterToken, limparToken } from './sessao';

const AUTH_URL = 'http://10.110.12.54:3001';
const API_URL = 'http://10.110.12.54:3000';

// Em dispositivo fisico (Expo Go), 'localhost' e o proprio aparelho: troque
// pelo IPv4 da maquina que roda os servidores, na mesma rede Wi-Fi.

// Erro proprio para a tela distinguir "a sessao acabou" de "deu ruim".
class SessaoExpirada extends Error {
  constructor() {
    super('Sessão expirada.');
    this.name = 'SessaoExpirada';
  }
}

// base: 'api' (json-server, padrao) ou 'auth' (auth-api). As telas usam o
// apelido -- nenhuma delas conhece URL.
const BASES = { api: API_URL, auth: AUTH_URL };

async function requisicao(caminho, opcoes = {}) {
  const { base = 'api', corpo, metodo = 'GET' } = opcoes;
  const raiz = BASES[base];

  const token = await obterToken();
  const headers = {};

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  // Content-Type so quando ha corpo: um GET nao precisa dele.
  if (corpo !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  const resposta = await fetch(`${raiz}${caminho}`, {
    method: metodo,
    headers,
    body: corpo !== undefined ? JSON.stringify(corpo) : undefined,
  });

  // 401 fora da tela de login significa uma coisa so: a sessao acabou.
  // Limpa o cofre e avisa a tela, em vez de repetir a requisicao.
  if (resposta.status === 401) {
    await limparToken();
    throw new SessaoExpirada();
  }

  if (!resposta.ok) {
    throw new Error(`Erro ${resposta.status} na requisicao ${caminho}`);
  }

  // 204 (tipico de DELETE) nao tem corpo para converter.
  if (resposta.status === 204) {
    return null;
  }

  return resposta.json();
}

const get = (caminho, opcoes) => requisicao(caminho, { ...opcoes, metodo: 'GET' });
const post = (caminho, corpo, opcoes) => requisicao(caminho, { ...opcoes, metodo: 'POST', corpo });
const put = (caminho, corpo, opcoes) => requisicao(caminho, { ...opcoes, metodo: 'PUT', corpo });
const remover = (caminho, opcoes) => requisicao(caminho, { ...opcoes, metodo: 'DELETE' });

// =====================================================================
// LOGIN
// =====================================================================
// Nao passa por requisicao(): ainda nao ha token, e o 401 aqui tem outro
// sentido -- credencial invalida, nao sessao expirada.
async function autenticar(email, senha) {
  const resposta = await fetch(`${AUTH_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, senha }),
  });

  if (resposta.status === 401) {
    // Mensagem generica de proposito: dizer qual dos dois errou entrega ao
    // atacante quais e-mails existem no sistema.
    const erro = new Error('E-mail ou senha inválidos.');
    erro.credencialInvalida = true;
    throw erro;
  }

  if (!resposta.ok) {
    throw new Error(`Erro ${resposta.status} ao autenticar`);
  }

  return resposta.json(); // { token, usuario: { id, nome, perfil } }
}

// =====================================================================
// MEDICOS -- rota protegida de verdade, na API de autenticacao (3001)
// =====================================================================
const buscarMedicos = () => get('/medicos', { base: 'auth' });

// Escrita de medico ainda vive no json-server: a auth-api so tem GET.
const criarMedico = (medico) => post('/medicos', medico);
const atualizarMedico = (id, medico) => put(`/medicos/${id}`, medico);
const excluirMedico = (id) => remover(`/medicos/${id}`);

// =====================================================================
// PACIENTES -- json-server (3000), sem autenticacao por enquanto
// =====================================================================
const buscarPacientes = () => get('/pacientes');
const criarPaciente = (paciente) => post('/pacientes', paciente);
const atualizarPaciente = (id, paciente) => put(`/pacientes/${id}`, paciente);
const excluirPaciente = (id) => remover(`/pacientes/${id}`);

// =====================================================================
// HORARIOS -- json-server (3000), sem autenticacao por enquanto
// =====================================================================
const buscarHorarios = () => get('/horarios');
const criarHorario = (horario) => post('/horarios', horario);
const atualizarHorario = (id, horario) => put(`/horarios/${id}`, horario);
const excluirHorario = (id) => remover(`/horarios/${id}`);

// =====================================================================
// ESPECIALIDADES -- json-server (3000), sem autenticacao por enquanto
// =====================================================================
const buscarEspecialidades = () => get('/especialidades');
const criarEspecialidade = (especialidade) => post('/especialidades', especialidade);
const atualizarEspecialidade = (id, especialidade) => put(`/especialidades/${id}`, especialidade);
const excluirEspecialidade = (id) => remover(`/especialidades/${id}`);

export {
  // atalhos do cliente HTTP -- e o que as telas novas devem usar
  get,
  post,
  put,
  remover,
  SessaoExpirada,

  // autenticacao
  autenticar,

  // funcoes de dominio (mantidas para nao quebrar as telas das outras
  // branches; cada modulo migra para os atalhos na propria branch)
  buscarMedicos,
  criarMedico,
  atualizarMedico,
  excluirMedico,
  buscarPacientes,
  criarPaciente,
  atualizarPaciente,
  excluirPaciente,
  buscarHorarios,
  criarHorario,
  atualizarHorario,
  excluirHorario,
  buscarEspecialidades,
  criarEspecialidade,
  atualizarEspecialidade,
  excluirEspecialidade,
};
