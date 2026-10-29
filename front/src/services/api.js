// src/services/api.js
//
// Unico lugar do app que chama fetch. Ele monta o header Authorization
// sozinho e trata o 401 uma vez so, para as telas voltarem a falar o idioma
// do dominio: buscarMedicos(), criarPaciente(dados).
//
// DECISAO DA SQUAD:
// O app fala com UMA API so (auth-api.js, porta 3001). O json-server virou
// armazenamento interno dela e nao e mais chamado pelo app: e a API que
// confere quem esta logado e o que cada perfil pode ver.
//
// O servidor e usado apenas no ambiente academico de desenvolvimento.
// HTTP e usado no mock local porque ele roda no ambiente de
// desenvolvimento. A API real da clinica devera utilizar HTTPS por lidar
// com dados sensiveis.
//

import { obterToken, limparSessao } from './sessao';

// EXPO_PUBLIC_API_HOST vem de front/.env.local (não commitado) -- cada dev
// configura o próprio IP ali. Sem esse arquivo, cai no fallback 'localhost',
// que só funciona em web/emulador, não em aparelho físico.
const HOST = process.env.EXPO_PUBLIC_API_HOST ?? 'localhost';
const API_URL = `http://${HOST}:3001`;

// Em dispositivo fisico (Expo Go), localhost e o proprio aparelho.
// Use o IPv4 da maquina que roda os servidores, na mesma rede Wi-Fi.

class SessaoExpirada extends Error {
  constructor() {
    super('Sessão expirada.');
    this.name = 'SessaoExpirada';
  }
}

// Qualquer resposta de erro da API. "mensagem" e o texto que o servidor
// escreveu para a pessoa (campo "erro" do corpo); a tela mostra ele
// quando existe, em vez de um texto generico.
class ErroDaApi extends Error {
  constructor(status, caminho, corpo) {
    super(`Erro ${status} na requisicao ${caminho}`);
    this.name = 'ErroDaApi';
    this.status = status;
    this.mensagem = corpo?.erro ?? null;
  }
}

// 403: o servidor sabe quem e, mas o perfil nao pode. Nao e motivo para
// deslogar -- a tela explica e segue.
class SemPermissao extends ErroDaApi {
  constructor(caminho, corpo) {
    super(403, caminho, corpo);
    this.name = 'SemPermissao';
    this.codigo = corpo?.codigo ?? null;
  }
}

// O corpo do erro pode nem ser JSON (proxy, servidor fora do ar).
async function lerCorpoDoErro(resposta) {
  try {
    return await resposta.json();
  } catch (e) {
    return null;
  }
}

async function requisicao(caminho, opcoes = {}) {
  const {
    corpo,
    metodo = 'GET',
    // Rotas publicas (criar conta) nao levam token.
    publica = false,
  } = opcoes;

  const token = publica ? null : await obterToken();

  const headers = {};

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  // Content-Type so quando existe corpo.
  if (corpo !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  const resposta = await fetch(`${API_URL}${caminho}`, {
    method: metodo,
    headers,
    body:
      corpo !== undefined
        ? JSON.stringify(corpo)
        : undefined,
  });

  // 401 fora da tela de login significa sessao expirada.
  if (resposta.status === 401 && !publica) {
    await limparSessao();
    throw new SessaoExpirada();
  }

  if (resposta.status === 403) {
    throw new SemPermissao(caminho, await lerCorpoDoErro(resposta));
  }

  if (!resposta.ok) {
    throw new ErroDaApi(
      resposta.status,
      caminho,
      await lerCorpoDoErro(resposta),
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

const patch = (caminho, corpo, opcoes) =>
  requisicao(caminho, {
    ...opcoes,
    metodo: 'PATCH',
    corpo,
  });

const remover = (caminho, opcoes) =>
  requisicao(caminho, {
    ...opcoes,
    metodo: 'DELETE',
  });

// Monta "?a=1&b=2" so com os parametros preenchidos.
function parametros(valores) {
  const partes = Object.entries(valores)
    .filter(([, valor]) => valor !== undefined && valor !== null && valor !== '')
    .map(
      ([nome, valor]) =>
        `${encodeURIComponent(nome)}=${encodeURIComponent(valor)}`,
    );

  return partes.length ? `?${partes.join('&')}` : '';
}

// =====================================================================
// LOGIN E CONTA
// =====================================================================

async function autenticar(email, senha) {
  // O login nao usa requisicao(), porque ainda nao existe token.
  const resposta = await fetch(`${API_URL}/login`, {
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
    throw new ErroDaApi(
      resposta.status,
      '/login',
      await lerCorpoDoErro(resposta),
    );
  }

  return resposta.json();
}

// Autocadastro: sempre perfil paciente (o servidor garante).
const registrarPaciente = (dados) =>
  post('/auth/registrar', dados, { publica: true });

const obterMe = () =>
  get('/me');

const atualizarMinhaFoto = (fotoUri) =>
  patch('/me', { fotoUri });

const trocarSenha = (senhaAtual, novaSenha) =>
  put('/me/senha', { senhaAtual, novaSenha });

// =====================================================================
// MEDICOS
// =====================================================================

const buscarMedicos = () =>
  get('/medicos');

const criarMedico = (medico) =>
  post('/medicos', medico);

const atualizarMedico = (id, medico) =>
  put(`/medicos/${id}`, medico);

const excluirMedico = (id) =>
  remover(`/medicos/${id}`);

// Cria o acesso ao app ou gera nova senha temporaria.
const gerarAcessoMedico = (medicoId) =>
  post(`/medicos/${medicoId}/acesso`, {});

// =====================================================================
// PACIENTES
// =====================================================================

const buscarPacientes = () =>
  get('/pacientes');

const buscarPaciente = (id) =>
  get(`/pacientes/${id}`);

const criarPaciente = (paciente) =>
  post('/pacientes', paciente);

const atualizarPaciente = (id, paciente) =>
  put(`/pacientes/${id}`, paciente);

const excluirPaciente = (id) =>
  remover(`/pacientes/${id}`);

// =====================================================================
// HORARIOS
// =====================================================================

const buscarHorarios = () =>
  get('/horarios');

const criarHorario = (horario) =>
  post('/horarios', horario);

const atualizarHorario = (id, horario) =>
  put(`/horarios/${id}`, horario);

const excluirHorario = (id) =>
  remover(`/horarios/${id}`);

// Consultas. O servidor ja devolve so as que o perfil pode ver.
const buscarConsultas = () =>
  get('/consultas');

const buscarConsulta = (id) =>
  get(`/consultas/${id}`);

const criarConsulta = (consulta) =>
  post('/consultas', consulta);

const atualizarConsulta = (id, consulta) =>
  put(`/consultas/${id}`, consulta);

const excluirConsulta = (id) =>
  remover(`/consultas/${id}`);

// Horarios livres de um medico. ignorarConsultaId: na remarcacao, o
// horario da propria consulta aparece como livre.
const buscarDisponibilidade = (medicoId, { dias, ignorarConsultaId } = {}) =>
  get(`/disponibilidade${parametros({ medicoId, dias, ignorarConsultaId })}`);

// =====================================================================
// ESPECIALIDADES
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

// Sinais vitais. Quem pode ver e registrar e decidido pelo servidor.
const registrarSinaisVitais = (registro) =>
  post('/sinaisVitais', registro);

const buscarSinaisVitais = ({ pacienteId, consultaId } = {}) =>
  get(`/sinaisVitais${parametros({ pacienteId, consultaId })}`);

// =====================================================================
// EXPORTS
// =====================================================================

export {
  // cliente HTTP
  get,
  post,
  put,
  patch,
  remover,

  // erros
  SessaoExpirada,
  ErroDaApi,
  SemPermissao,

  // autenticacao e conta
  autenticar,
  registrarPaciente,
  obterMe,
  atualizarMinhaFoto,
  trocarSenha,

  // medicos
  buscarMedicos,
  criarMedico,
  atualizarMedico,
  excluirMedico,
  gerarAcessoMedico,

  // pacientes
  buscarPacientes,
  buscarPaciente,
  criarPaciente,
  atualizarPaciente,
  excluirPaciente,

  // horarios
  buscarHorarios,
  criarHorario,
  atualizarHorario,
  excluirHorario,

  // consultas
  buscarConsultas,
  buscarConsulta,
  criarConsulta,
  atualizarConsulta,
  excluirConsulta,
  buscarDisponibilidade,

  // especialidades
  buscarEspecialidades,
  criarEspecialidade,
  atualizarEspecialidade,
  excluirEspecialidade,

  // sinais vitais
  registrarSinaisVitais,
  buscarSinaisVitais,
};
