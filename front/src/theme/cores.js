// src/theme/cores.js
//
// Paletas clara e escura da CLYRA. Unico arquivo do app com hexadecimal
// de interface: as telas leem as cores por useTema(), nunca daqui direto,
// para acompanhar o tema escolhido.
//
// Lavanda e a marca e a Psicologia. Verde e a cor do perfil Paciente e a
// da area Psiquiatria (o nome da area vai sempre por extenso): nunca
// botao, nunca sucesso. Confirmacao e lavanda suave. Nunca texto branco
// sobre lavanda; sobre o verde cheio, o texto e sempre branco.
// Um destaque manteiga por tela, no maximo.

const claro = {
  papel: '#F4F1EA',
  superficie: '#FFFFFF',
  superficie2: '#ECE8E0',
  linha: '#E4DFEF',
  linhaForte: '#D2CBE3',
  tinta: '#17122B',
  tinta2: '#51496B',
  apoio: '#6B6485',
  desativado: '#9A94AE',
  marca: '#17122B',

  // Botao de acao: tinta com texto branco.
  acao: '#17122B',
  sobreAcao: '#FFFFFF',

  // Plano de destaque (topo do Inicio do paciente): lavanda com tinta.
  destaque: '#9B7DF2',
  sobreDestaque: '#17122B',
  sobreDestaque2: '#2A1F4D',
  dataDestaque: '#17122B',

  selFundo: '#17122B',
  selTexto: '#FFFFFF',
  link: '#4B2FA8',

  lavanda: '#9B7DF2',
  lavandaClara: '#CBB8FF',
  lavandaMaisClara: '#E3D9FF',
  lavandaSuave: '#EEE8FF',
  sobreLavandaSuave: '#4B2FA8',
  lavandaNumeral: '#B9A3FF',

  verde: '#0B7A6E',
  menta: '#8FE3CF',
  verdeSuave: '#D4EEE8',
  sobreVerdeSuave: '#0A5A51',

  manteiga: '#F2DF6D',
  sobreManteiga: '#17122B',

  // Planos do topo. Sobre lavanda, lilas, menta e manteiga o texto e
  // sempre esta tinta escura, nos dois temas.
  sobrePlano: '#17122B',
  sobrePlano2: '#2A1F4D',
  planoTinta: '#17122B',
  sobrePlanoTinta: '#F1ECFF',
  sobrePlanoTinta2: '#C9C0E6',
  capsulaSobreTinta: 'rgba(241,236,255,0.12)',
  planoVerde: '#0B7A6E',
  sobrePlanoVerde: '#FFFFFF',
  sobrePlanoVerde2: '#E6F6F2',
  // Plano do perfil Paciente: o verde, com texto branco (5,2:1), nos dois
  // temas. A marca d'agua do topo sai branca a 9%.
  planoPaciente: '#0B7A6E',
  sobrePlanoPaciente: '#FFFFFF',
  sobrePlanoPaciente2: '#E6F6F2',
  // Acento do perfil Paciente (o "+" flutuante): verde com sinal branco.
  acentoPaciente: '#0B7A6E',
  acentoPacienteVidro: 'rgba(11,122,110,0.94)',
  sobreAcentoPaciente: '#FFFFFF',

  alerta: '#A4434E',
  alertaSuave: '#F7E6E8',
  alertaBorda: '#F0D5D9',
  sobreAlerta: '#FFFFFF',
  atencao: '#8A5A12',
  atencaoSuave: '#F6EBD9',
  neutroSuave: '#ECE8F3',
  sobreNeutro: '#51496B',

  // Bolinha do interruptor: branca nos dois temas.
  chave: '#FFFFFF',
  abaAtiva: '#17122B',
  sobreAbaAtiva: '#FFFFFF',
  veu: 'rgba(23,18,43,0.34)',
  sombra: 'rgba(23,18,43,0.14)',

  // Esqueleto de carregamento: sobre o papel e sobre o plano lavanda.
  esqueleto: '#DDD0FB',
  esqueletoDestaque: '#B8A1F6',

  // Vidro: fundos por espessura e modo (ver components/Vidro). O "+" e
  // lavanda com o icone em tinta.
  vidroRegular: 'rgba(244,241,234,0.76)',
  vidroEspesso: 'rgba(255,255,255,0.9)',
  vidroBorda: 'rgba(255,255,255,0.6)',
  vidroAntigo: 'rgba(250,248,244,0.94)',
  vidroClaro: 'rgba(255,255,255,0.24)',
  vidroClaroBorda: 'rgba(255,255,255,0.45)',
  vidroClaroOpaco: '#B49BF5',
  vidroTinta: 'rgba(155,125,242,0.94)',
  vidroTintaBorda: 'rgba(255,255,255,0.3)',
  vidroTintaSolido: '#9B7DF2',
  sobreVidroTinta: '#17122B',
};

const escuro = {
  papel: '#13101F',
  superficie: '#1E1930',
  superficie2: '#262040',
  linha: '#2E2745',
  linhaForte: '#3D3459',
  tinta: '#F1ECFF',
  tinta2: '#C9C0E6',
  apoio: '#9A90BC',
  desativado: '#6E6690',
  marca: '#F1ECFF',

  // No escuro o botao de acao inverte: fundo claro, texto tinta.
  acao: '#F1ECFF',
  sobreAcao: '#17122B',

  destaque: '#A68CF5',
  sobreDestaque: '#17122B',
  sobreDestaque2: '#2A1F4D',
  dataDestaque: '#17122B',

  selFundo: '#F1ECFF',
  selTexto: '#17122B',
  link: '#D6C9FF',

  lavanda: '#A68CF5',
  lavandaClara: '#B9A3FF',
  lavandaMaisClara: '#C9B8FF',
  lavandaSuave: '#2A2145',
  sobreLavandaSuave: '#D6C9FF',
  lavandaNumeral: '#B9A3FF',

  verde: '#4DC4AE',
  menta: '#7FD3BF',
  verdeSuave: '#12332E',
  sobreVerdeSuave: '#A8EBDD',

  manteiga: '#F2DF6D',
  sobreManteiga: '#17122B',

  sobrePlano: '#17122B',
  sobrePlano2: '#2A1F4D',
  // Tinta pura some no papel escuro: o plano de tinta clareia um pouco.
  planoTinta: '#2A2148',
  sobrePlanoTinta: '#F1ECFF',
  sobrePlanoTinta2: '#C9C0E6',
  capsulaSobreTinta: 'rgba(241,236,255,0.12)',
  planoVerde: '#0B7A6E',
  sobrePlanoVerde: '#FFFFFF',
  sobrePlanoVerde2: '#E6F6F2',
  // Plano do perfil Paciente: o verde, com texto branco (5,2:1), nos dois
  // temas. A marca d'agua do topo sai branca a 9%.
  planoPaciente: '#0B7A6E',
  sobrePlanoPaciente: '#FFFFFF',
  sobrePlanoPaciente2: '#E6F6F2',
  // Acento do perfil Paciente (o "+" flutuante): verde com sinal branco.
  acentoPaciente: '#0B7A6E',
  acentoPacienteVidro: 'rgba(11,122,110,0.94)',
  sobreAcentoPaciente: '#FFFFFF',

  alerta: '#E58A94',
  alertaSuave: '#3A1F23',
  alertaBorda: '#5A2D33',
  sobreAlerta: '#2A1215',
  atencao: '#E0B36A',
  atencaoSuave: '#3A2E1A',
  neutroSuave: '#262040',
  sobreNeutro: '#C9C0E6',

  chave: '#FFFFFF',
  abaAtiva: '#F1ECFF',
  sobreAbaAtiva: '#17122B',
  veu: 'rgba(0,0,0,0.5)',
  sombra: 'rgba(0,0,0,0.4)',

  esqueleto: '#2A2145',
  esqueletoDestaque: '#9378E8',

  vidroRegular: 'rgba(19,16,31,0.78)',
  vidroEspesso: 'rgba(30,25,48,0.94)',
  vidroBorda: 'rgba(255,255,255,0.12)',
  vidroAntigo: 'rgba(28,23,44,0.96)',
  vidroClaro: 'rgba(255,255,255,0.24)',
  vidroClaroBorda: 'rgba(255,255,255,0.4)',
  vidroClaroOpaco: '#B6A0F7',
  vidroTinta: 'rgba(166,140,245,0.94)',
  vidroTintaBorda: 'rgba(255,255,255,0.2)',
  vidroTintaSolido: '#A68CF5',
  sobreVidroTinta: '#17122B',
};

export const paletas = { claro, escuro };

// "#F4F1EA" + 0.5 -> "rgba(244,241,234,0.5)". Usado nos degrades de
// borda, que precisam da mesma cor do papel indo a transparente.
export function comAlfa(hex, alfa) {
  const valor = parseInt(hex.slice(1), 16);
  const r = (valor >> 16) & 255;
  const g = (valor >> 8) & 255;
  const b = valor & 255;
  return `rgba(${r},${g},${b},${alfa})`;
}

// Cor de cada perfil. cor = texto e icone; fundo = selo. Profissional e
// lavanda; a recepcao e neutra; o paciente e papel com texto tinta.
export function coresDoPerfil(cores) {
  return {
    recepcao: { cor: cores.sobreNeutro, fundo: cores.neutroSuave },
    medico: { cor: cores.sobreLavandaSuave, fundo: cores.lavandaSuave },
    paciente: { cor: cores.tinta, fundo: cores.papel },
  };
}
