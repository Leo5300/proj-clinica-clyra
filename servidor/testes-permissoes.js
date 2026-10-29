// testes-permissoes.js - verificacao automatica das permissoes por perfil
//
// Precisa dos dois servidores no ar:
//   npx json-server --watch db_clinica.json --port 3000 --host 127.0.0.1
//   node servidor/auth-api.js
//
// Rode com:
//   node servidor/testes-permissoes.js
//
// Cada caso imprime OK ou FALHOU, com o esperado e o obtido. Se algum
// falhar, o processo termina com codigo 1.
//
// ATENCAO: os casos gravam consultas, usuarios e registros no
// db_clinica.json. Depois de rodar, pare os servidores e restaure o
// arquivo com git restore db_clinica.json.

const regras = require('./regras');

const API = 'http://localhost:3001';
const DADOS = 'http://127.0.0.1:3000';

let total = 0;
let falhas = 0;

function verificar(nome, esperado, obtido) {
  const passou = esperado === obtido;

  total += 1;

  if (!passou) {
    falhas += 1;
  }

  console.log(
    `${passou ? 'OK    ' : 'FALHOU'} ${nome} | esperado: ${esperado} | obtido: ${obtido}`,
  );
}

async function chamar(metodo, caminho, { token, corpo, base = API } = {}) {
  const headers = {};

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  if (corpo !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  const resposta = await fetch(`${base}${caminho}`, {
    method: metodo,
    headers,
    body: corpo === undefined ? undefined : JSON.stringify(corpo),
  });

  const texto = await resposta.text();
  let dados = null;

  try {
    dados = texto ? JSON.parse(texto) : null;
  } catch (e) {
    dados = null;
  }

  return { status: resposta.status, dados, texto };
}

function textoDaData(data) {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

// Proximo dia da semana (0 = domingo) a pelo menos "distancia" dias de
// hoje. Datas calculadas na hora: o teste vale em qualquer dia em que rodar.
function proximoDia(diaDaSemana, distancia) {
  const data = new Date();
  data.setHours(0, 0, 0, 0);
  data.setDate(data.getDate() + distancia);

  while (data.getDay() !== diaDaSemana) {
    data.setDate(data.getDate() + 1);
  }

  return textoDaData(data);
}

function diaDaSemanaDe(texto) {
  const [ano, mes, dia] = texto.split('-').map(Number);
  return new Date(ano, mes - 1, dia).getDay();
}

function sinal(pacienteId, consultaId) {
  return {
    pacienteId,
    consultaId,
    frequenciaCardiaca: 72,
    quantidadeLeituras: 5,
    origem: 'bluetooth',
    aparelho: 'Monitor de teste',
    registradoEm: new Date().toISOString(),
  };
}

const semSegredos = (texto) =>
  !texto.includes('senhaHash') && !texto.includes('"salt"');

// =====================================================================
// REGRAS PURAS (sem servidor)
// =====================================================================

function testarRegras() {
  verificar('regras: CPF valido', true, regras.validarCpf('529.982.247-25'));
  verificar(
    'regras: CPF com digito verificador errado',
    false,
    regras.validarCpf('529.982.247-24'),
  );
  verificar(
    'regras: CPF com digitos repetidos',
    false,
    regras.validarCpf('111.111.111-11'),
  );

  const segunda = proximoDia(1, 1);
  const [ano, mes, dia] = segunda.split('-').map(Number);
  const terca = textoDaData(new Date(ano, mes - 1, dia + 1));
  const faixa = [
    { diaSemana: 'Segunda-feira', horaInicio: '08:00', horaFim: '12:00' },
  ];

  verificar(
    'regras: consulta que cabe na faixa (11:30 em 08:00-12:00)',
    true,
    regras.cabeNoAtendimento({ data: segunda, hora: '11:30' }, faixa),
  );
  verificar(
    'regras: consulta que passa do fim da faixa (11:45 em 08:00-12:00)',
    false,
    regras.cabeNoAtendimento({ data: segunda, hora: '11:45' }, faixa),
  );
  verificar(
    'regras: consulta em dia sem atendimento',
    false,
    regras.cabeNoAtendimento({ data: terca, hora: '09:00' }, faixa),
  );

  // Domingo anterior ao meio-dia, para a semana inteira estar no futuro.
  const livres = regras.calcularHorariosLivres({
    horarios: [
      { diaSemana: 'Segunda-feira', horaInicio: '08:00', horaFim: '09:30' },
    ],
    consultas: [{ data: segunda, hora: '08:30' }],
    dias: 7,
    agora: new Date(ano, mes - 1, dia - 1, 12, 0),
  });

  verificar(
    'regras: horarios livres sem o horario ocupado',
    JSON.stringify([
      { data: segunda, diaSemana: 'Segunda-feira', horarios: ['08:00', '09:00'] },
    ]),
    JSON.stringify(livres),
  );
}

// =====================================================================
// API (servidores no ar)
// =====================================================================

async function entrar(email, senha, perfil) {
  const r = await chamar('POST', '/login', { corpo: { email, senha } });

  verificar(
    `3. login ${perfil}`,
    `200 ${perfil}`,
    `${r.status} ${r.dados?.usuario?.perfil}`,
  );
  verificar(
    `3. resposta do login ${perfil} sem salt e senhaHash`,
    true,
    semSegredos(r.texto),
  );

  const eu = await chamar('GET', '/me', { token: r.dados?.token });

  verificar(
    `3. GET /me ${perfil} sem salt e senhaHash`,
    true,
    eu.status === 200 && semSegredos(eu.texto),
  );

  return r.dados?.token;
}

async function testarApi() {
  const sufixo = Date.now();

  // 1
  let r = await chamar('GET', '/consultas');
  verificar('1. sem token GET /consultas', 401, r.status);

  r = await chamar('GET', '/consultas', { token: 'token-inventado' });
  verificar('1. token inventado GET /consultas', 401, r.status);

  // 2
  r = await chamar('POST', '/login', {
    corpo: { email: 'joao@clinica.com', senha: 'senhaErrada1' },
  });
  verificar(
    '2. login com senha errada',
    '401 E-mail ou senha inválidos.',
    `${r.status} ${r.dados?.erro}`,
  );

  // 3
  const recepcao = await entrar('recepcao@clinica.com', 'clinica123', 'recepcao');
  const medico = await entrar('joao@clinica.com', 'medico123', 'medico');
  const paciente = await entrar('lucas@exemplo.com', 'paciente123', 'paciente');

  // 4
  r = await chamar('GET', '/pacientes', { token: recepcao });
  verificar(
    '4. recepcao GET /pacientes',
    '200 com cpf',
    `${r.status} ${Array.isArray(r.dados) && r.dados.length > 0 && r.dados.every((p) => p.cpf) ? 'com cpf' : 'sem cpf'}`,
  );

  r = await chamar('GET', '/sinaisVitais?pacienteId=1', { token: recepcao });
  verificar('4. recepcao GET /sinaisVitais', 403, r.status);

  r = await chamar('POST', '/sinaisVitais', {
    token: recepcao,
    corpo: sinal('1'),
  });
  verificar('4. recepcao POST /sinaisVitais', 403, r.status);

  // 5
  const emailDoNovoMedico = `paula.${sufixo}@clinica.com`;

  r = await chamar('POST', '/medicos', {
    token: recepcao,
    corpo: {
      nome: 'Paula Mendes',
      especialidade: 'Clínico Geral',
      crm: '67890/MG',
      email: emailDoNovoMedico,
      telefone: '(31) 90000-0000',
      endereco: 'Rua F, 600',
      fotoUri: 'file:///foto-paula.jpg',
    },
  });

  const senhaTemporaria = r.dados?.acesso?.senhaTemporaria;
  const novoMedicoId = r.dados?.medico?.id;

  verificar(
    '5. recepcao POST /medicos devolve o acesso',
    '201 com senha temporaria',
    `${r.status} ${senhaTemporaria ? 'com senha temporaria' : 'sem senha temporaria'}`,
  );

  r = await chamar('GET', `/medicos/${novoMedicoId}`, { token: recepcao });
  verificar(
    '5. medico novo guarda telefone, endereco e fotoUri',
    true,
    r.status === 200 &&
      r.dados.telefone === '(31) 90000-0000' &&
      r.dados.endereco === 'Rua F, 600' &&
      r.dados.fotoUri === 'file:///foto-paula.jpg',
  );
  verificar('5. medico novo com temAcesso', true, r.dados?.temAcesso === true);

  // 6
  r = await chamar('POST', '/login', {
    corpo: { email: emailDoNovoMedico, senha: senhaTemporaria },
  });
  const novoMedico = r.dados?.token;

  verificar(
    '6. login com a senha temporaria',
    '200 trocarSenha=true',
    `${r.status} trocarSenha=${r.dados?.usuario?.trocarSenha}`,
  );

  r = await chamar('GET', '/consultas', { token: novoMedico });
  verificar(
    '6. senha temporaria bloqueia GET /consultas',
    '403 TROCAR_SENHA',
    `${r.status} ${r.dados?.codigo}`,
  );

  r = await chamar('PUT', '/me/senha', {
    token: novoMedico,
    corpo: { senhaAtual: senhaTemporaria, novaSenha: 'novaSenha123' },
  });
  verificar('6. PUT /me/senha', 200, r.status);

  r = await chamar('GET', '/consultas', { token: novoMedico });
  verificar('6. depois da troca, GET /consultas', 200, r.status);

  // 7
  const segunda = proximoDia(1, 2);

  r = await chamar('POST', '/consultas', {
    token: paciente,
    corpo: { pacienteId: '2', medicoId: '1', data: segunda, hora: '08:00' },
  });
  const consultaDoLucas = r.dados?.id;

  verificar('7. paciente POST /consultas', 201, r.status);

  r = await chamar('GET', `/consultas/${consultaDoLucas}`, { base: DADOS });
  verificar(
    '7. consulta gravada com o pacienteId do proprio paciente',
    '1',
    String(r.dados?.pacienteId),
  );

  // 8
  r = await chamar('POST', '/consultas', {
    token: recepcao,
    corpo: { pacienteId: '2', medicoId: '1', data: segunda, hora: '08:00' },
  });
  verificar('8. mesmo medico, dia e hora', 409, r.status);

  r = await chamar('POST', '/consultas', {
    token: recepcao,
    corpo: { pacienteId: '2', medicoId: '1', data: segunda, hora: '13:00' },
  });
  verificar('8. fora do horario de atendimento', 409, r.status);

  const ontem = new Date();
  ontem.setDate(ontem.getDate() - 1);

  r = await chamar('POST', '/consultas', {
    token: recepcao,
    corpo: {
      pacienteId: '2',
      medicoId: '1',
      data: textoDaData(ontem),
      hora: '08:00',
    },
  });
  verificar('8. data no passado', 400, r.status);

  // 9
  const terca = proximoDia(2, 2);

  r = await chamar('POST', '/consultas', {
    token: recepcao,
    corpo: { pacienteId: '2', medicoId: '2', data: terca, hora: '09:00' },
  });
  const consultaDaFernanda = r.dados?.id;

  verificar('9. recepcao agenda Fernanda com Antonio', 201, r.status);

  // 10
  r = await chamar('GET', '/consultas', { token: paciente });
  verificar(
    '10. paciente GET /consultas so as dele',
    true,
    r.status === 200 &&
      r.dados.length > 0 &&
      r.dados.every((c) => String(c.pacienteId) === '1'),
  );

  r = await chamar('GET', `/consultas/${consultaDaFernanda}`, {
    token: paciente,
  });
  verificar('10. paciente GET consulta de outro paciente', 404, r.status);

  r = await chamar('GET', '/pacientes', { token: paciente });
  verificar('10. paciente GET /pacientes', 403, r.status);

  r = await chamar('GET', '/pacientes/1', { token: paciente });
  verificar('10. paciente GET /pacientes/1 (ele mesmo)', 200, r.status);

  r = await chamar('GET', '/pacientes/2', { token: paciente });
  verificar('10. paciente GET /pacientes/2', 404, r.status);

  r = await chamar('GET', '/medicos', { token: paciente });
  verificar(
    '10. paciente GET /medicos sem email e telefone',
    true,
    r.status === 200 &&
      r.dados.length > 0 &&
      r.dados.every((m) => !('email' in m) && !('telefone' in m)),
  );

  r = await chamar('POST', '/medicos', {
    token: paciente,
    corpo: { nome: 'X', especialidade: 'Y', crm: 'Z', email: 'x@y.com' },
  });
  verificar('10. paciente POST /medicos', 403, r.status);

  r = await chamar('GET', '/horarios', { token: paciente });
  verificar('10. paciente GET /horarios', 403, r.status);

  // 11
  r = await chamar('GET', '/consultas', { token: medico });
  verificar(
    '11. medico GET /consultas so as dele',
    true,
    r.status === 200 &&
      r.dados.length > 0 &&
      r.dados.every((c) => String(c.medicoId) === '1'),
  );

  r = await chamar('GET', '/pacientes', { token: medico });
  verificar(
    '11. medico GET /pacientes so o Lucas, sem cpf',
    true,
    r.status === 200 &&
      r.dados.length === 1 &&
      String(r.dados[0].id) === '1' &&
      !('cpf' in r.dados[0]),
  );

  r = await chamar('GET', '/pacientes/2', { token: medico });
  verificar('11. medico GET /pacientes/2', 404, r.status);

  r = await chamar('POST', '/consultas', {
    token: medico,
    corpo: { pacienteId: '1', medicoId: '1', data: segunda, hora: '09:00' },
  });
  verificar('11. medico POST /consultas', 403, r.status);

  r = await chamar('DELETE', `/consultas/${consultaDoLucas}`, {
    token: medico,
  });
  verificar('11. medico DELETE na consulta do Lucas', 403, r.status);

  // 12
  r = await chamar('POST', '/horarios', {
    token: medico,
    corpo: {
      medicoId: 2,
      diaSemana: 'Sexta-feira',
      horaInicio: '08:00',
      horaFim: '10:00',
    },
  });
  const horarioNovo = r.dados?.id;

  verificar(
    '12. medico POST /horarios grava com o medicoId dele',
    '201 medicoId=1',
    `${r.status} medicoId=${r.dados?.medicoId}`,
  );

  // Apagar em seguida mantem a agenda do Joao como no inicio (caso 14).
  r = await chamar('DELETE', `/horarios/${horarioNovo}`, { token: medico });
  verificar('12. medico DELETE no proprio horario', 200, r.status);

  r = await chamar('PUT', '/horarios/3', {
    token: medico,
    corpo: {
      medicoId: 1,
      diaSemana: 'Terça-feira',
      horaInicio: '09:00',
      horaFim: '13:00',
    },
  });
  verificar('12. medico PUT /horarios/3 (do Antonio)', 404, r.status);

  // 13
  r = await chamar('POST', '/sinaisVitais', {
    token: medico,
    corpo: sinal('1', consultaDoLucas),
  });
  verificar(
    '13. medico POST /sinaisVitais do Lucas na consulta dele',
    201,
    r.status,
  );

  r = await chamar('POST', '/sinaisVitais', {
    token: medico,
    corpo: sinal('2'),
  });
  verificar('13. medico POST /sinaisVitais da Fernanda', 404, r.status);

  r = await chamar('POST', '/sinaisVitais', {
    token: paciente,
    corpo: sinal('2'),
  });
  verificar(
    '13. paciente POST /sinaisVitais grava com o pacienteId dele',
    '201 pacienteId=1',
    `${r.status} pacienteId=${r.dados?.pacienteId}`,
  );

  r = await chamar('GET', '/sinaisVitais', { token: paciente });
  verificar(
    '13. paciente GET /sinaisVitais so os dele',
    true,
    r.status === 200 &&
      r.dados.length >= 2 &&
      r.dados.every((s) => String(s.pacienteId) === '1'),
  );

  // 14
  r = await chamar('GET', '/disponibilidade?medicoId=1&dias=21', {
    token: paciente,
  });
  const dias = Array.isArray(r.dados) ? r.dados : [];

  verificar('14. paciente GET /disponibilidade', 200, r.status);
  verificar(
    '14. so segundas e quartas',
    true,
    dias.length > 0 &&
      dias.every(
        (d) =>
          ['Segunda-feira', 'Quarta-feira'].includes(d.diaSemana) &&
          [1, 3].includes(diaDaSemanaDe(d.data)),
      ),
  );
  verificar(
    '14. horario ocupado no caso 7 nao aparece',
    true,
    !dias.some((d) => d.data === segunda && d.horarios.includes('08:00')),
  );
  verificar('14. nenhum dado de paciente', true, !r.texto.includes('pacienteId'));

  // 15 - consulta gravada direto no json-server, sem passar pelas regras.
  const daquiADuasHoras = new Date(Date.now() + 2 * 60 * 60 * 1000);

  r = await chamar('POST', '/consultas', {
    base: DADOS,
    corpo: {
      pacienteId: '1',
      medicoId: '3',
      data: textoDaData(daquiADuasHoras),
      hora: `${String(daquiADuasHoras.getHours()).padStart(2, '0')}:${String(daquiADuasHoras.getMinutes()).padStart(2, '0')}`,
    },
  });

  r = await chamar('DELETE', `/consultas/${r.dados?.id}`, { token: paciente });
  verificar('15. paciente cancela com menos de 24 h', 403, r.status);

  r = await chamar('DELETE', `/consultas/${consultaDoLucas}`, {
    token: paciente,
  });
  verificar('15. paciente cancela com mais de 24 h', 200, r.status);

  r = await chamar('GET', `/consultas/${consultaDoLucas}`, { token: paciente });
  verificar('15. consulta cancelada nao existe mais', 404, r.status);

  // 16 - a consulta do caso 7 foi cancelada: cria outra do Joao antes.
  r = await chamar('POST', '/consultas', {
    token: recepcao,
    corpo: { pacienteId: '2', medicoId: '1', data: segunda, hora: '09:00' },
  });
  verificar('16. recepcao agenda consulta futura com o Joao', 201, r.status);

  r = await chamar('DELETE', '/medicos/1', { token: recepcao });
  verificar('16. excluir medico com consulta futura', 409, r.status);

  // 17
  const cadastro = {
    nome: 'Marina Rocha',
    cpf: '275.184.396-46',
    dataNascimento: '1995-05-20',
    email: `marina.${sufixo}@exemplo.com`,
    senha: 'minhaSenha1',
    aceiteTermos: true,
  };

  r = await chamar('POST', '/auth/registrar', {
    corpo: { ...cadastro, perfil: 'recepcao' },
  });
  verificar(
    '17. autocadastro ignora o perfil enviado',
    '201 paciente',
    `${r.status} ${r.dados?.usuario?.perfil}`,
  );

  r = await chamar('POST', '/auth/registrar', { corpo: cadastro });
  verificar('17. mesmo e-mail de novo', 409, r.status);

  const antes = (await chamar('GET', '/pacientes', { base: DADOS })).dados.length;

  r = await chamar('POST', '/auth/registrar', {
    corpo: {
      ...cadastro,
      nome: 'Fernanda Lima',
      cpf: '153.509.460-56',
      dataNascimento: '1985-09-03',
      email: `fernanda.${sufixo}@exemplo.com`,
    },
  });
  verificar(
    '17. CPF da Fernanda vincula ao cadastro existente',
    '201 vinculoId=2',
    `${r.status} vinculoId=${r.dados?.usuario?.vinculoId}`,
  );

  const depois = (await chamar('GET', '/pacientes', { base: DADOS })).dados
    .length;
  verificar('17. total de pacientes nao muda no vinculo', antes, depois);

  r = await chamar('POST', '/auth/registrar', {
    corpo: {
      ...cadastro,
      cpf: '386.421.507-26',
      dataNascimento: '2000-01-01',
      email: `rafael.${sufixo}@exemplo.com`,
    },
  });
  verificar('17. CPF do Rafael com nascimento errado', 409, r.status);

  r = await chamar('POST', '/auth/registrar', {
    corpo: {
      ...cadastro,
      cpf: '111.111.111-11',
      email: `cpf.${sufixo}@exemplo.com`,
    },
  });
  verificar('17. CPF 111.111.111-11', 400, r.status);

  r = await chamar('POST', '/auth/registrar', {
    corpo: {
      ...cadastro,
      cpf: '935.411.347-80',
      senha: 'abc12',
      email: `curta.${sufixo}@exemplo.com`,
    },
  });
  verificar('17. senha de 5 caracteres', 400, r.status);

  const { aceiteTermos, ...semAceite } = cadastro;

  r = await chamar('POST', '/auth/registrar', {
    corpo: {
      ...semAceite,
      cpf: '935.411.347-80',
      email: `aceite.${sufixo}@exemplo.com`,
    },
  });
  verificar('17. sem aceiteTermos', 400, r.status);

  // 18
  const aparelho = { token: `ExponentPushToken[teste-${sufixo}]`, plataforma: 'android' };

  r = await chamar('POST', '/dispositivos', { corpo: aparelho });
  verificar('18. POST /dispositivos sem login', 401, r.status);

  r = await chamar('POST', '/dispositivos', { token: paciente, corpo: aparelho });
  verificar(
    '18. paciente POST /dispositivos',
    '200 usuarioId=3',
    `${r.status} usuarioId=${r.dados?.usuarioId}`,
  );

  r = await chamar('POST', '/dispositivos', { token: paciente, corpo: aparelho });
  const registros = (await chamar('GET', '/dispositivos', { base: DADOS })).dados
    .filter((d) => d.token === aparelho.token);
  verificar('18. mesmo aparelho de novo nao duplica', '200 1', `${r.status} ${registros.length}`);

  // 19
  r = await chamar('GET', '/qualquercoisa', { token: recepcao });
  verificar('19. rota inexistente', 404, r.status);
}

async function main() {
  console.log('== Regras (servidor/regras.js, sem servidor)');
  testarRegras();

  console.log('== API (http://localhost:3001)');

  try {
    await testarApi();
  } catch (e) {
    falhas += 1;
    console.log(
      `FALHOU execucao interrompida: ${e.message}. Os dois servidores estao no ar?`,
    );
  }

  console.log(`== ${total - falhas} de ${total} casos OK`);
  console.log(
    'Testes gravaram dados no db_clinica.json: pare os servidores e rode git restore db_clinica.json',
  );

  process.exit(falhas > 0 ? 1 : 0);
}

main();
