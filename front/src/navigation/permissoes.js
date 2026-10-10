// src/navigation/permissoes.js
//
// Fonte unica de quem ve o que no app: rotas por perfil, menu da Home,
// rotulos e cores de cada perfil.
//
// Esconder botao e experiencia de uso, nao seguranca. A protecao de
// verdade e feita no servidor, que confere o perfil do token em toda
// requisicao: uma tela aberta "na marra" so receberia 403 ou 404.

const TODOS = ['recepcao', 'medico', 'paciente'];

export const ROTAS_PUBLICAS = ['Login', 'LoginBiometrico', 'CriarConta'];

export const ROTAS_POR_PERFIL = {
  Home: TODOS,
  Perfil: TODOS,
  TrocarSenha: TODOS,
  Consultas: TODOS,
  DetalheConsulta: TODOS,
  Agendar: ['recepcao', 'paciente'],
  Pacientes: ['recepcao', 'medico'],
  // medico = so leitura; paciente = meus dados
  CadastroPaciente: TODOS,
  Medicos: ['recepcao'],
  CadastroMedico: ['recepcao'],
  Especialidades: ['recepcao'],
  CadastroEspecialidade: ['recepcao'],
  Horarios: ['recepcao', 'medico'],
  CadastroHorario: ['recepcao', 'medico'],
  SinaisVitais: ['medico', 'paciente'],
  ComoChegar: ['paciente'],
};

// Atalhos da Home, na ordem em que aparecem.
export const MENU_POR_PERFIL = {
  recepcao: [
    { rotulo: 'Agendar', icone: 'calendar', rota: 'Agendar' },
    { rotulo: 'Consultas', icone: 'list', rota: 'Consultas' },
    { rotulo: 'Pacientes', icone: 'users', rota: 'Pacientes' },
    { rotulo: 'Médicos', icone: 'briefcase', rota: 'Medicos' },
    { rotulo: 'Horários', icone: 'clock', rota: 'Horarios' },
    { rotulo: 'Especialidades', icone: 'award', rota: 'Especialidades' },
  ],
  medico: [
    { rotulo: 'Minha agenda', icone: 'calendar', rota: 'Consultas' },
    { rotulo: 'Meus pacientes', icone: 'users', rota: 'Pacientes' },
    { rotulo: 'Meus horários', icone: 'clock', rota: 'Horarios' },
  ],
  paciente: [
    { rotulo: 'Agendar', icone: 'plus-circle', rota: 'Agendar' },
    { rotulo: 'Minhas consultas', icone: 'list', rota: 'Consultas' },
    { rotulo: 'Como chegar', icone: 'map-pin', rota: 'ComoChegar' },
  ],
};

export const ROTULO_DO_PERFIL = {
  recepcao: 'Recepção',
  medico: 'Médico',
  paciente: 'Paciente',
};

// cor = texto e icone; fundo = selo. Mesma paleta das telas.
export const CORES_DO_PERFIL = {
  recepcao: { cor: '#4B7776', fundo: '#E3EEEA' },
  medico: { cor: '#9A8BB6', fundo: '#EFE9F3' },
  paciente: { cor: '#4A5560', fundo: '#ECEBE6' },
};

export const TITULO_CONSULTAS = {
  recepcao: 'Consultas',
  medico: 'Minha agenda',
  paciente: 'Minhas consultas',
};

// Rota fora da tabela e negada: o app tambem nega por padrao.
export function podeAcessar(perfil, rota) {
  if (ROTAS_PUBLICAS.includes(rota)) return true;
  if (!perfil) return false;

  return (ROTAS_POR_PERFIL[rota] ?? []).includes(perfil);
}
