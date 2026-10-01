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
const regras = require('./regras');

const PORTA = 3001;

// Armazenamento interno. 127.0.0.1: so o proprio computador alcanca.
const URL_DADOS = 'http://127.0.0.1:3000';

const TODOS = ['recepcao', 'medico', 'paciente'];

// Colecao onde fica o cadastro de cada perfil. Recepcao nao tem cadastro.
const COLECAO_DO_VINCULO = {
  medico: 'medicos',
  paciente: 'pacientes',
};

// Sem 0/O e 1/l/I: a senha temporaria e lida na tela e digitada por outra
// pessoa, e esses caracteres se confundem.
const ALFABETO_SENHA_TEMPORARIA =
  'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';

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

const alterar = (colecao, id, campos) =>
  dados('PATCH', caminhoDoRegistro(colecao, id), campos);

const apagar = (colecao, id) =>
  dados('DELETE', caminhoDoRegistro(colecao, id));

// O json-server grava id como texto, mas ha ids antigos em numero
// (medicoId dos horarios): toda comparacao passa por String.
const mesmoId = (a, b) => String(a) === String(b);

// Id vazio vira null; qualquer outro vira texto, como os do json-server.
function idOuNulo(valor) {
  if (valor === undefined || valor === null || valor === '') {
    return null;
  }

  return String(valor);
}

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

// Salt diferente por usuario: duas pessoas com a mesma senha ficam com
// hashes diferentes.
function hashDaSenha(senha) {
  const salt = crypto.randomBytes(16).toString('hex');
  const senhaHash = crypto.scryptSync(senha, salt, 64).toString('hex');

  return { salt, senhaHash };
}

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

function novoUsuario({ email, senha, perfil, vinculoId, trocarSenha }) {
  return {
    email,
    ...hashDaSenha(senha),
    perfil,
    vinculoId,
    ativo: true,
    trocarSenha,
    criadoEm: new Date().toISOString(),
  };
}

function gerarSenhaTemporaria() {
  let senha = '';

  for (let i = 0; i < 10; i += 1) {
    senha += ALFABETO_SENHA_TEMPORARIA[
      crypto.randomInt(ALFABETO_SENHA_TEMPORARIA.length)
    ];
  }

  return senha;
}

async function usuarioPorEmail(email) {
  const procurado = normalizarEmail(email);
  const usuarios = await listar('usuarios');

  return (
    usuarios.find((u) => normalizarEmail(u.email) === procurado) || null
  );
}

async function usuarioVinculado(perfil, vinculoId) {
  const usuarios = await listar('usuarios');

  return (
    usuarios.find(
      (u) => u.perfil === perfil && mesmoId(u.vinculoId, vinculoId),
    ) || null
  );
}

// Excluir o cadastro nao apaga o usuario: desativa. A sessao aberta cai
// na proxima requisicao, porque o usuario e relido a cada uma.
async function desativarUsuarioVinculado(perfil, vinculoId) {
  const usuario = await usuarioVinculado(perfil, vinculoId);

  if (usuario) {
    await alterar('usuarios', usuario.id, { ativo: false });
  }
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

const MENSAGEM_CONTA_EXISTENTE =
  'Não foi possível criar a conta com esses dados. Se você já tem conta, entre com seu e-mail.';

// Autocadastro: so cria PACIENTE. Medico e recepcao recebem acesso da
// clinica. Qualquer "perfil" vindo no corpo e ignorado.
async function registrarPaciente({ corpo }) {
  const { nome, cpf, dataNascimento, email, senha, aceiteTermos } = corpo;

  if (![nome, cpf, dataNascimento, email, senha].every(texto)) {
    throw new ErroHttp(
      400,
      'Preencha nome, CPF, data de nascimento, e-mail e senha.',
    );
  }

  if (aceiteTermos !== true) {
    throw new ErroHttp(
      400,
      'Para criar a conta, aceite o uso dos seus dados para o atendimento.',
    );
  }

  if (!regras.validarCpf(cpf)) {
    throw new ErroHttp(400, 'CPF inválido. Confira os números digitados.');
  }

  if (!email.includes('@')) {
    throw new ErroHttp(400, 'E-mail inválido.');
  }

  if (senha.length < 8) {
    throw new ErroHttp(400, 'A senha precisa ter pelo menos 8 caracteres.');
  }

  if (!regras.dataDeNascimentoValida(dataNascimento)) {
    throw new ErroHttp(400, 'Data de nascimento inválida.');
  }

  // Resposta igual para "e-mail ja usado" e "CPF ja tem conta": quem
  // tenta nao descobre qual dos dois ja existe.
  if (await usuarioPorEmail(email)) {
    throw new ErroHttp(409, MENSAGEM_CONTA_EXISTENTE);
  }

  const pacientes = await listar('pacientes');
  const existente = pacientes.find((p) => regras.mesmoCpf(p.cpf, cpf));
  let pacienteId;

  if (existente) {
    if (await usuarioVinculado('paciente', existente.id)) {
      throw new ErroHttp(409, MENSAGEM_CONTA_EXISTENTE);
    }

    // CPF certo e nascimento errado pode ser alguem tentando assumir o
    // cadastro de outra pessoa: so a recepcao, com documento, resolve.
    if (existente.dataNascimento !== dataNascimento) {
      throw new ErroHttp(
        409,
        'Não foi possível criar a conta com esses dados. Procure a recepção.',
      );
    }

    // Paciente ja cadastrado pela recepcao: so ganha a conta. O cadastro
    // nao e duplicado nem alterado.
    pacienteId = existente.id;
  } else {
    const paciente = await inserir('pacientes', {
      nome: nome.trim(),
      cpf: regras.formatarCpf(cpf),
      dataNascimento,
      email: email.trim(),
    });

    pacienteId = paciente.id;
  }

  const usuario = await inserir(
    'usuarios',
    novoUsuario({
      email: normalizarEmail(email),
      senha,
      perfil: 'paciente',
      vinculoId: pacienteId,
      trocarSenha: false,
    }),
  );

  return criado(await abrirSessao(usuario));
}

async function obterMe({ usuario }) {
  return ok(await montarMe(usuario));
}

async function trocarSenha({ usuario, corpo }) {
  const { senhaAtual, novaSenha } = corpo;

  if (!senhaConfere(usuario, senhaAtual)) {
    throw new ErroHttp(400, 'Senha atual incorreta.');
  }

  if (typeof novaSenha !== 'string' || novaSenha.length < 8) {
    throw new ErroHttp(
      400,
      'A nova senha precisa ter pelo menos 8 caracteres.',
    );
  }

  if (novaSenha === senhaAtual) {
    throw new ErroHttp(400, 'A nova senha precisa ser diferente da atual.');
  }

  const atualizado = await alterar('usuarios', usuario.id, {
    ...hashDaSenha(novaSenha),
    trocarSenha: false,
  });

  return ok(await montarMe(atualizado));
}

// A foto e do cadastro vinculado (medico ou paciente).
async function atualizarMinhaFoto({ usuario, corpo }) {
  const fotoUri = corpo.fotoUri ?? null;

  if (fotoUri !== null && typeof fotoUri !== 'string') {
    throw new ErroHttp(400, 'Foto inválida.');
  }

  await alterar(COLECAO_DO_VINCULO[usuario.perfil], usuario.vinculoId, {
    fotoUri,
  });

  return ok(await montarMe(usuario));
}

// =====================================================================
// PACIENTES
// =====================================================================

// Principio da necessidade (LGPD): o medico ve so o que usa no
// atendimento. CPF, e-mail e endereco ficam com a recepcao.
function pacienteParaPerfil(paciente, perfil) {
  if (perfil !== 'medico') {
    return paciente;
  }

  const { id, nome, dataNascimento, telefone, fotoUri } = paciente;
  return { id, nome, dataNascimento, telefone, fotoUri };
}

// Pacientes "do medico": quem tem ao menos uma consulta com ele.
async function idsDosPacientesDoMedico(medicoId) {
  const consultas = await listar('consultas');

  return new Set(
    consultas
      .filter((c) => mesmoId(c.medicoId, medicoId))
      .map((c) => String(c.pacienteId)),
  );
}

// Registro de outra pessoa responde 404, igual a inexistente: a API nao
// confirma que ele existe.
async function pacienteVisivel(usuario, id) {
  const naoEncontrado = new ErroHttp(404, 'Paciente não encontrado.');

  if (usuario.perfil === 'paciente' && !mesmoId(usuario.vinculoId, id)) {
    throw naoEncontrado;
  }

  if (usuario.perfil === 'medico') {
    const meus = await idsDosPacientesDoMedico(usuario.vinculoId);

    if (!meus.has(String(id))) {
      throw naoEncontrado;
    }
  }

  const paciente = await obter('pacientes', id);

  if (!paciente) {
    throw naoEncontrado;
  }

  return paciente;
}

async function listarPacientes({ usuario }) {
  const pacientes = await listar('pacientes');

  if (usuario.perfil === 'medico') {
    const meus = await idsDosPacientesDoMedico(usuario.vinculoId);

    return ok(
      pacientes
        .filter((p) => meus.has(String(p.id)))
        .map((p) => pacienteParaPerfil(p, 'medico')),
    );
  }

  return ok(pacientes);
}

async function obterPaciente({ usuario, params }) {
  const paciente = await pacienteVisivel(usuario, params.id);
  return ok(pacienteParaPerfil(paciente, usuario.perfil));
}

async function criarPaciente({ corpo }) {
  return criado(await inserir('pacientes', semId(corpo)));
}

async function atualizarPaciente({ usuario, params, corpo }) {
  const atual = await pacienteVisivel(usuario, params.id);
  let registro = semId(corpo);

  // Identificacao so muda pela recepcao, que confere documento. O que o
  // paciente mandar nesses campos e ignorado.
  if (usuario.perfil === 'paciente') {
    registro = {
      ...registro,
      nome: atual.nome,
      cpf: atual.cpf,
      dataNascimento: atual.dataNascimento,
    };
  }

  return ok(await substituir('pacientes', atual.id, registro));
}

async function excluirPaciente({ params }) {
  const paciente = await obter('pacientes', params.id);

  if (!paciente) {
    throw new ErroHttp(404, 'Paciente não encontrado.');
  }

  const consultas = await listar('consultas');

  if (
    consultas.some(
      (c) => mesmoId(c.pacienteId, paciente.id) && regras.consultaFutura(c),
    )
  ) {
    throw new ErroHttp(
      409,
      'Este paciente tem consulta marcada. Cancele as consultas dele antes de excluir.',
    );
  }

  await apagar('pacientes', paciente.id);
  await desativarUsuarioVinculado('paciente', paciente.id);

  return ok(paciente);
}

// =====================================================================
// MEDICOS
// =====================================================================

// Paciente e medico veem so o necessario para escolher e reconhecer o
// profissional. Contato e endereco ficam com a recepcao.
function medicoParaPerfil(medico, perfil, usuarios) {
  if (perfil === 'recepcao') {
    return {
      ...medico,
      temAcesso: usuarios.some(
        (u) => u.perfil === 'medico' && mesmoId(u.vinculoId, medico.id),
      ),
    };
  }

  const { id, nome, especialidade, crm, fotoUri } = medico;
  return { id, nome, especialidade, crm, fotoUri };
}

// temAcesso e calculado; nao e gravado no cadastro.
function camposDoMedico(corpo) {
  const { temAcesso, ...campos } = semId(corpo);
  return campos;
}

async function listarMedicos({ usuario }) {
  const [medicos, usuarios] = await Promise.all([
    listar('medicos'),
    usuario.perfil === 'recepcao' ? listar('usuarios') : [],
  ]);

  return ok(medicos.map((m) => medicoParaPerfil(m, usuario.perfil, usuarios)));
}

async function obterMedico({ usuario, params }) {
  const medico = await obter('medicos', params.id);

  if (!medico) {
    throw new ErroHttp(404, 'Médico não encontrado.');
  }

  const usuarios =
    usuario.perfil === 'recepcao' ? await listar('usuarios') : [];

  return ok(medicoParaPerfil(medico, usuario.perfil, usuarios));
}

// Cadastro de medico ja nasce com acesso ao app: o medico entra com a
// senha temporaria e cria a dele no primeiro acesso.
async function criarMedico({ corpo }) {
  const campos = camposDoMedico(corpo);

  if (
    !texto(campos.nome) ||
    !texto(campos.especialidade) ||
    !texto(campos.crm) ||
    !texto(campos.email)
  ) {
    throw new ErroHttp(400, 'Informe nome, especialidade, CRM e e-mail.');
  }

  const email = normalizarEmail(campos.email);

  if (await usuarioPorEmail(email)) {
    throw new ErroHttp(409, 'Já existe um acesso com este e-mail.');
  }

  const medico = await inserir('medicos', campos);
  const senhaTemporaria = gerarSenhaTemporaria();

  await inserir(
    'usuarios',
    novoUsuario({
      email,
      senha: senhaTemporaria,
      perfil: 'medico',
      vinculoId: medico.id,
      trocarSenha: true,
    }),
  );

  // Unica vez em que a senha temporaria aparece: so o hash e gravado.
  return criado({
    medico: { ...medico, temAcesso: true },
    acesso: { email, senhaTemporaria },
  });
}

async function atualizarMedico({ params, corpo }) {
  const atual = await obter('medicos', params.id);

  if (!atual) {
    throw new ErroHttp(404, 'Médico não encontrado.');
  }

  const campos = camposDoMedico(corpo);

  if (
    !texto(campos.nome) ||
    !texto(campos.especialidade) ||
    !texto(campos.crm)
  ) {
    throw new ErroHttp(400, 'Informe nome, especialidade e CRM.');
  }

  // O e-mail do cadastro e o login do medico: os dois andam juntos.
  const usuarioDoMedico = await usuarioVinculado('medico', atual.id);

  if (usuarioDoMedico) {
    const novoEmail = normalizarEmail(campos.email);

    if (!novoEmail) {
      throw new ErroHttp(
        400,
        'Este médico tem acesso ao app: informe o e-mail dele.',
      );
    }

    if (novoEmail !== normalizarEmail(usuarioDoMedico.email)) {
      const dono = await usuarioPorEmail(novoEmail);

      if (dono && !mesmoId(dono.id, usuarioDoMedico.id)) {
        throw new ErroHttp(409, 'Já existe um acesso com este e-mail.');
      }

      await alterar('usuarios', usuarioDoMedico.id, { email: novoEmail });
    }
  }

  const medico = await substituir('medicos', atual.id, campos);

  return ok({ ...medico, temAcesso: Boolean(usuarioDoMedico) });
}

async function excluirMedico({ params }) {
  const medico = await obter('medicos', params.id);

  if (!medico) {
    throw new ErroHttp(404, 'Médico não encontrado.');
  }

  const consultas = await listar('consultas');

  if (
    consultas.some(
      (c) => mesmoId(c.medicoId, medico.id) && regras.consultaFutura(c),
    )
  ) {
    throw new ErroHttp(
      409,
      'Este médico tem consulta marcada. Remarque ou cancele as consultas dele antes de excluir.',
    );
  }

  // Horario de quem nao atende mais geraria vaga que ninguem cumpre.
  const horarios = await listar('horarios');

  for (const horario of horarios.filter((h) =>
    mesmoId(h.medicoId, medico.id),
  )) {
    await apagar('horarios', horario.id);
  }

  await apagar('medicos', medico.id);
  await desativarUsuarioVinculado('medico', medico.id);

  return ok(medico);
}

// Cria o acesso de um medico que ainda nao tem, ou gera nova senha
// temporaria para quem esqueceu a dele.
async function gerarAcessoMedico({ params }) {
  const medico = await obter('medicos', params.id);

  if (!medico) {
    throw new ErroHttp(404, 'Médico não encontrado.');
  }

  const senhaTemporaria = gerarSenhaTemporaria();
  const existente = await usuarioVinculado('medico', medico.id);

  if (existente) {
    await alterar('usuarios', existente.id, {
      ...hashDaSenha(senhaTemporaria),
      trocarSenha: true,
    });

    return ok({ acesso: { email: existente.email, senhaTemporaria } });
  }

  if (!texto(medico.email)) {
    throw new ErroHttp(400, 'Cadastre o e-mail do médico antes.');
  }

  const email = normalizarEmail(medico.email);

  if (await usuarioPorEmail(email)) {
    throw new ErroHttp(409, 'Já existe um acesso com este e-mail.');
  }

  await inserir(
    'usuarios',
    novoUsuario({
      email,
      senha: senhaTemporaria,
      perfil: 'medico',
      vinculoId: medico.id,
      trocarSenha: true,
    }),
  );

  return ok({ acesso: { email, senhaTemporaria } });
}

// =====================================================================
// ESPECIALIDADES
// =====================================================================

function dadosDaEspecialidade(corpo) {
  if (!texto(corpo.nome)) {
    throw new ErroHttp(400, 'Informe o nome da especialidade.');
  }

  return { ...semId(corpo), nome: corpo.nome.trim() };
}

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
  return criado(await inserir('especialidades', dadosDaEspecialidade(corpo)));
}

async function atualizarEspecialidade({ params, corpo }) {
  const atual = await especialidadeExistente(params.id);

  return ok(
    await substituir('especialidades', atual.id, dadosDaEspecialidade(corpo)),
  );
}

async function excluirEspecialidade({ params }) {
  const atual = await especialidadeExistente(params.id);

  await apagar('especialidades', atual.id);

  return ok(atual);
}

// =====================================================================
// HORARIOS DE ATENDIMENTO
// =====================================================================

async function horarioVisivel(usuario, id) {
  const horario = await obter('horarios', id);

  if (
    !horario ||
    (usuario.perfil === 'medico' &&
      !mesmoId(horario.medicoId, usuario.vinculoId))
  ) {
    throw new ErroHttp(404, 'Horário não encontrado.');
  }

  return horario;
}

// O medico so mexe na propria agenda: o medicoId que ele mandar e
// trocado pelo dele.
async function dadosDoHorario(usuario, corpo) {
  const registro = semId(corpo);

  if (usuario.perfil === 'medico') {
    registro.medicoId = usuario.vinculoId;
  }

  const erro = regras.validarHorarioDeAtendimento(registro);

  if (erro) {
    throw new ErroHttp(400, erro);
  }

  if (!(await obter('medicos', registro.medicoId))) {
    throw new ErroHttp(400, 'Escolha o médico deste horário.');
  }

  return registro;
}

async function listarHorarios({ usuario }) {
  const horarios = await listar('horarios');

  if (usuario.perfil === 'medico') {
    return ok(
      horarios.filter((h) => mesmoId(h.medicoId, usuario.vinculoId)),
    );
  }

  return ok(horarios);
}

async function criarHorario({ usuario, corpo }) {
  return criado(await inserir('horarios', await dadosDoHorario(usuario, corpo)));
}

async function atualizarHorario({ usuario, params, corpo }) {
  const atual = await horarioVisivel(usuario, params.id);

  return ok(
    await substituir('horarios', atual.id, await dadosDoHorario(usuario, corpo)),
  );
}

async function excluirHorario({ usuario, params }) {
  const atual = await horarioVisivel(usuario, params.id);

  await apagar('horarios', atual.id);

  return ok(atual);
}

// =====================================================================
// CONSULTAS
// =====================================================================

function consultaEhDoUsuario(consulta, usuario) {
  if (usuario.perfil === 'medico') {
    return mesmoId(consulta.medicoId, usuario.vinculoId);
  }

  if (usuario.perfil === 'paciente') {
    return mesmoId(consulta.pacienteId, usuario.vinculoId);
  }

  return true;
}

async function consultaVisivel(usuario, id) {
  const consulta = await obter('consultas', id);

  if (!consulta || !consultaEhDoUsuario(consulta, usuario)) {
    throw new ErroHttp(404, 'Consulta não encontrada.');
  }

  return consulta;
}

// Regra das 24 h, so para o paciente. A recepcao nao tem essa trava.
function exigirAntecedencia(usuario, consulta) {
  if (usuario.perfil === 'paciente' && !regras.podeAlterarSozinho(consulta)) {
    throw new ErroHttp(
      403,
      'Faltam menos de 24 h. Para remarcar ou cancelar, fale com a recepção.',
    );
  }
}

// Monta a consulta a gravar (agendamento e remarcacao) e confere as
// regras. "atual" e a consulta original, na remarcacao.
async function prepararConsulta(usuario, corpo, atual) {
  // O paciente so agenda para si: o pacienteId que ele mandar e ignorado.
  const pacienteId =
    usuario.perfil === 'paciente'
      ? idOuNulo(usuario.vinculoId)
      : idOuNulo(corpo.pacienteId ?? atual?.pacienteId);
  const medicoId = idOuNulo(corpo.medicoId ?? atual?.medicoId);

  if (!(await obter('pacientes', pacienteId))) {
    throw new ErroHttp(400, 'Escolha o paciente da consulta.');
  }

  if (!(await obter('medicos', medicoId))) {
    throw new ErroHttp(400, 'Escolha o médico da consulta.');
  }

  const consulta = { pacienteId, medicoId, data: corpo.data, hora: corpo.hora };

  const [horarios, consultas] = await Promise.all([
    listar('horarios'),
    listar('consultas'),
  ]);
  const outras = consultas.filter((c) => !atual || !mesmoId(c.id, atual.id));

  const problema = regras.verificarAgendamento({
    consulta,
    horariosDoMedico: horarios.filter((h) => mesmoId(h.medicoId, medicoId)),
    outrasDoMedico: outras.filter((c) => mesmoId(c.medicoId, medicoId)),
    outrasDoPaciente: outras.filter((c) => mesmoId(c.pacienteId, pacienteId)),
  });

  if (problema) {
    throw new ErroHttp(problema.status, problema.erro);
  }

  return consulta;
}

async function listarConsultas({ usuario }) {
  const consultas = await listar('consultas');
  return ok(consultas.filter((c) => consultaEhDoUsuario(c, usuario)));
}

async function obterConsulta({ usuario, params }) {
  return ok(await consultaVisivel(usuario, params.id));
}

async function criarConsulta({ usuario, corpo }) {
  const consulta = await prepararConsulta(usuario, corpo, null);

  return criado(
    await inserir('consultas', { ...consulta, criadoPor: usuario.id }),
  );
}

async function remarcarConsulta({ usuario, params, corpo }) {
  const atual = await consultaVisivel(usuario, params.id);

  exigirAntecedencia(usuario, atual);

  const consulta = await prepararConsulta(usuario, corpo, atual);

  return ok(
    await substituir('consultas', atual.id, {
      ...semId(atual),
      ...consulta,
      atualizadoPor: usuario.id,
    }),
  );
}

async function cancelarConsulta({ usuario, params }) {
  const atual = await consultaVisivel(usuario, params.id);

  exigirAntecedencia(usuario, atual);

  await apagar('consultas', atual.id);

  return ok(atual);
}

// Horarios livres de um medico. Nao devolve nada de paciente: so datas e
// horas, entao qualquer perfil pode consultar.
async function consultarDisponibilidade({ query }) {
  if (!query.get('medicoId')) {
    throw new ErroHttp(400, 'Informe o médico.');
  }

  const medico = await obter('medicos', query.get('medicoId'));

  if (!medico) {
    throw new ErroHttp(404, 'Médico não encontrado.');
  }

  const ignorar = query.get('ignorarConsultaId');
  const [horarios, consultas] = await Promise.all([
    listar('horarios'),
    listar('consultas'),
  ]);

  return ok(
    regras.calcularHorariosLivres({
      horarios: horarios.filter((h) => mesmoId(h.medicoId, medico.id)),
      consultas: consultas.filter(
        (c) =>
          mesmoId(c.medicoId, medico.id) &&
          !(ignorar && mesmoId(c.id, ignorar)),
      ),
      dias: regras.diasDaBusca(query.get('dias')),
    }),
  );
}

// =====================================================================
// SINAIS VITAIS
// =====================================================================

// Mais recente primeiro. registradoEm e ISO 8601 em UTC, entao a ordem
// do texto e a ordem do tempo.
function maisRecentePrimeiro(a, b) {
  const ra = String(a.registradoEm ?? '');
  const rb = String(b.registradoEm ?? '');

  if (ra === rb) {
    return 0;
  }

  return ra < rb ? 1 : -1;
}

async function listarSinaisVitais({ usuario, query }) {
  let pacienteId = query.get('pacienteId');
  const consultaId = query.get('consultaId');

  if (usuario.perfil === 'paciente') {
    pacienteId = usuario.vinculoId;
  } else {
    // O medico nunca lista tudo: so o que pede, e so de paciente dele.
    if (!pacienteId && !consultaId) {
      throw new ErroHttp(400, 'Informe o paciente ou a consulta.');
    }

    if (pacienteId) {
      await pacienteVisivel(usuario, pacienteId);
    }

    if (consultaId) {
      await consultaVisivel(usuario, consultaId);
    }
  }

  const sinais = await listar('sinaisVitais');

  return ok(
    sinais
      .filter(
        (s) =>
          (!pacienteId || mesmoId(s.pacienteId, pacienteId)) &&
          (!consultaId || mesmoId(s.consultaId, consultaId)),
      )
      .sort(maisRecentePrimeiro),
  );
}

async function registrarSinaisVitais({ usuario, corpo }) {
  // O paciente so registra para si mesmo.
  const pacienteId =
    usuario.perfil === 'paciente'
      ? idOuNulo(usuario.vinculoId)
      : idOuNulo(corpo.pacienteId);

  if (usuario.perfil === 'medico') {
    await pacienteVisivel(usuario, pacienteId);
  }

  // A consulta, se vier, tem que ser de quem registra e deste paciente.
  const consultaId = idOuNulo(corpo.consultaId);

  if (consultaId) {
    const consulta = await consultaVisivel(usuario, consultaId);

    if (!mesmoId(consulta.pacienteId, pacienteId)) {
      throw new ErroHttp(404, 'Consulta não encontrada.');
    }
  }

  const { frequenciaCardiaca, quantidadeLeituras, origem } = corpo;

  if (
    !Number.isInteger(frequenciaCardiaca) ||
    frequenciaCardiaca < 20 ||
    frequenciaCardiaca > 250
  ) {
    throw new ErroHttp(
      400,
      'Informe a frequência cardíaca em bpm, um número inteiro entre 20 e 250.',
    );
  }

  if (!Number.isInteger(quantidadeLeituras) || quantidadeLeituras < 1) {
    throw new ErroHttp(400, 'Informe quantas leituras formaram o valor.');
  }

  if (origem !== 'bluetooth' && origem !== 'manual') {
    throw new ErroHttp(400, 'Informe a origem: bluetooth ou manual.');
  }

  // So os campos conhecidos vao para o prontuario.
  const registro = {
    pacienteId,
    consultaId,
    frequenciaCardiaca,
    quantidadeLeituras,
    origem,
    aparelho: texto(corpo.aparelho) ? corpo.aparelho : null,
    registradoEm:
      texto(corpo.registradoEm) && !Number.isNaN(Date.parse(corpo.registradoEm))
        ? corpo.registradoEm
        : new Date().toISOString(),
    registradoPor: usuario.id,
  };

  return criado(await inserir('sinaisVitais', registro));
}

// =====================================================================
// ROTAS
// =====================================================================
//
// Unica lista do que existe. A tela do app so esconde botoes; quem
// garante o acesso e esta tabela.
//   publica: true                    -> nao exige login
//   perfis: [...]                    -> perfis que podem usar a funcao
//   liberadaComSenhaTemporaria: true -> funciona antes da troca de senha

const R = 'recepcao';
const M = 'medico';
const P = 'paciente';

const ROTAS = [
  { metodo: 'POST', caminho: '/login', publica: true, acao: login },
  { metodo: 'POST', caminho: '/auth/registrar', publica: true, acao: registrarPaciente },

  { metodo: 'GET', caminho: '/me', perfis: TODOS, liberadaComSenhaTemporaria: true, acao: obterMe },
  { metodo: 'PUT', caminho: '/me/senha', perfis: TODOS, liberadaComSenhaTemporaria: true, acao: trocarSenha },
  { metodo: 'PATCH', caminho: '/me', perfis: [M, P], acao: atualizarMinhaFoto },

  { metodo: 'GET', caminho: '/pacientes', perfis: [R, M], acao: listarPacientes },
  { metodo: 'GET', caminho: '/pacientes/:id', perfis: TODOS, acao: obterPaciente },
  { metodo: 'POST', caminho: '/pacientes', perfis: [R], acao: criarPaciente },
  { metodo: 'PUT', caminho: '/pacientes/:id', perfis: [R, P], acao: atualizarPaciente },
  { metodo: 'DELETE', caminho: '/pacientes/:id', perfis: [R], acao: excluirPaciente },

  { metodo: 'GET', caminho: '/medicos', perfis: TODOS, acao: listarMedicos },
  { metodo: 'GET', caminho: '/medicos/:id', perfis: TODOS, acao: obterMedico },
  { metodo: 'POST', caminho: '/medicos', perfis: [R], acao: criarMedico },
  { metodo: 'PUT', caminho: '/medicos/:id', perfis: [R], acao: atualizarMedico },
  { metodo: 'DELETE', caminho: '/medicos/:id', perfis: [R], acao: excluirMedico },
  { metodo: 'POST', caminho: '/medicos/:id/acesso', perfis: [R], acao: gerarAcessoMedico },

  { metodo: 'GET', caminho: '/especialidades', perfis: TODOS, acao: listarEspecialidades },
  { metodo: 'POST', caminho: '/especialidades', perfis: [R], acao: criarEspecialidade },
  { metodo: 'PUT', caminho: '/especialidades/:id', perfis: [R], acao: atualizarEspecialidade },
  { metodo: 'DELETE', caminho: '/especialidades/:id', perfis: [R], acao: excluirEspecialidade },

  { metodo: 'GET', caminho: '/horarios', perfis: [R, M], acao: listarHorarios },
  { metodo: 'POST', caminho: '/horarios', perfis: [R, M], acao: criarHorario },
  { metodo: 'PUT', caminho: '/horarios/:id', perfis: [R, M], acao: atualizarHorario },
  { metodo: 'DELETE', caminho: '/horarios/:id', perfis: [R, M], acao: excluirHorario },

  { metodo: 'GET', caminho: '/consultas', perfis: TODOS, acao: listarConsultas },
  { metodo: 'GET', caminho: '/consultas/:id', perfis: TODOS, acao: obterConsulta },
  { metodo: 'POST', caminho: '/consultas', perfis: [R, P], acao: criarConsulta },
  { metodo: 'PUT', caminho: '/consultas/:id', perfis: [R, P], acao: remarcarConsulta },
  { metodo: 'DELETE', caminho: '/consultas/:id', perfis: [R, P], acao: cancelarConsulta },

  { metodo: 'GET', caminho: '/disponibilidade', perfis: TODOS, acao: consultarDisponibilidade },

  { metodo: 'GET', caminho: '/sinaisVitais', perfis: [M, P], acao: listarSinaisVitais },
  { metodo: 'POST', caminho: '/sinaisVitais', perfis: [M, P], acao: registrarSinaisVitais },
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

    // Com senha temporaria, so da para ver quem e e trocar a senha.
    if (
      contexto.usuario.trocarSenha === true &&
      !rota.liberadaComSenhaTemporaria
    ) {
      throw new ErroHttp(
        403,
        'Troque a senha temporária para continuar.',
        'TROCAR_SENHA',
      );
    }

    // Seu perfil pode usar esta funcao? (403)
    if (!rota.perfis.includes(contexto.usuario.perfil)) {
      throw new ErroHttp(403, 'Seu perfil não tem permissão para isso.');
    }
  }

  if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    const corpo = await lerCorpo(req);

    if (!corpo || typeof corpo !== 'object' || Array.isArray(corpo)) {
      throw new ErroHttp(400, 'Envie os dados em JSON.');
    }

    contexto.corpo = corpo;
  }

  // O registro e seu? (404) e as regras de negocio (400/409) ficam em
  // cada acao, porque dependem do registro.
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
