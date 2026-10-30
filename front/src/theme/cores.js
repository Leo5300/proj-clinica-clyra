// src/theme/cores.js
//
// Paletas clara e escura da CLYRA. Unico arquivo do app com hexadecimal
// de interface: as telas leem as cores por useTema(), nunca daqui direto,
// para acompanhar o tema escolhido.
//
// Regra de ouro: salvia age, lavanda acolhe. Salvia e a unica cor de acao,
// selecao e status; lavanda e para pessoas, avisos, o medico e o apoio.
// Nunca texto branco sobre lavanda.

const claro = {
  papel: '#F4F3EE',
  superficie: '#FFFFFF',
  superficie2: '#ECEBE6',
  linha: '#E2E1DB',
  linhaForte: '#D5D4CC',
  tinta: '#1E2B2F',
  tinta2: '#4A5560',
  apoio: '#63686F',
  desativado: '#8B909A',
  marca: '#4C5C76',

  acao: '#4B7776',
  sobreAcao: '#FFFFFF',
  destaque: '#2F5553',
  sobreDestaque: '#FFFFFF',
  sobreDestaque2: '#CFE2DC',
  dataDestaque: '#D9CFEA',
  selFundo: '#2F5553',
  selTexto: '#FFFFFF',
  link: '#2F5553',
  salviaSuave: '#E3EEEA',
  sobreSalviaSuave: '#2F5553',

  lavanda: '#9A8BB6',
  lavandaSuave: '#EFE9F3',
  sobreLavandaSuave: '#6B5A8E',

  alerta: '#A4434E',
  alertaSuave: '#F7E6E8',
  alertaBorda: '#F0D5D9',
  sobreAlerta: '#FFFFFF',
  atencao: '#8A5A12',
  atencaoSuave: '#F6EBD9',
  neutroSuave: '#ECEBE6',
  sobreNeutro: '#4A5560',

  abaAtiva: 'rgba(75,119,118,0.16)',
  sobreAbaAtiva: '#2F5553',
  veu: 'rgba(30,43,47,0.34)',
  sombra: 'rgba(30,43,47,0.16)',

  // Esqueleto de carregamento: sobre o papel e sobre o bloco de destaque.
  esqueleto: '#E4E3DD',
  esqueletoDestaque: '#3B605E',

  // Vidro: fundos por espessura e modo (ver components/Vidro).
  vidroRegular: 'rgba(244,243,238,0.76)',
  vidroEspesso: 'rgba(255,255,255,0.9)',
  vidroBorda: 'rgba(255,255,255,0.6)',
  vidroAntigo: 'rgba(250,249,246,0.94)',
  vidroClaro: 'rgba(255,255,255,0.16)',
  vidroClaroBorda: 'rgba(255,255,255,0.3)',
  vidroClaroOpaco: '#3B605E',
  vidroTinta: 'rgba(63,110,108,0.92)',
  vidroTintaBorda: 'rgba(255,255,255,0.2)',
  vidroTintaSolido: '#3F6E6C',
};

const escuro = {
  papel: '#111A1B',
  superficie: '#1A2426',
  superficie2: '#222E30',
  linha: '#2C3A3C',
  linhaForte: '#3A4A4C',
  tinta: '#ECEFEC',
  tinta2: '#C2CAC8',
  apoio: '#9AA5A3',
  desativado: '#6E7A79',
  marca: '#DCE2EA',

  acao: '#4B7776',
  sobreAcao: '#FFFFFF',
  destaque: '#244543',
  sobreDestaque: '#FFFFFF',
  sobreDestaque2: '#B7D3CC',
  dataDestaque: '#D9CFEA',
  selFundo: '#A9D2C8',
  selTexto: '#10201F',
  link: '#A9D2C8',
  salviaSuave: '#1E3634',
  sobreSalviaSuave: '#A9D2C8',

  lavanda: '#9A8BB6',
  lavandaSuave: '#2A2436',
  sobreLavandaSuave: '#C9BDE3',

  alerta: '#E58A94',
  alertaSuave: '#3A1F23',
  alertaBorda: '#5A2D33',
  sobreAlerta: '#2A1215',
  atencao: '#E0B36A',
  atencaoSuave: '#3A2E1A',
  neutroSuave: '#263133',
  sobreNeutro: '#C2CAC8',

  abaAtiva: 'rgba(169,210,200,0.16)',
  sobreAbaAtiva: '#A9D2C8',
  veu: 'rgba(0,0,0,0.5)',
  sombra: 'rgba(0,0,0,0.4)',

  esqueleto: '#222E30',
  esqueletoDestaque: '#2E5250',

  vidroRegular: 'rgba(17,26,27,0.78)',
  vidroEspesso: 'rgba(26,36,38,0.94)',
  vidroBorda: 'rgba(255,255,255,0.12)',
  vidroAntigo: 'rgba(24,33,35,0.96)',
  vidroClaro: 'rgba(255,255,255,0.16)',
  vidroClaroBorda: 'rgba(255,255,255,0.3)',
  vidroClaroOpaco: '#2E5250',
  vidroTinta: 'rgba(63,110,108,0.92)',
  vidroTintaBorda: 'rgba(255,255,255,0.2)',
  vidroTintaSolido: '#3F6E6C',
};

export const paletas = { claro, escuro };

// "#F4F3EE" + 0.5 -> "rgba(244,243,238,0.5)". Usado nos degrades de
// borda, que precisam da mesma cor do papel indo a transparente.
export function comAlfa(hex, alfa) {
  const valor = parseInt(hex.slice(1), 16);
  const r = (valor >> 16) & 255;
  const g = (valor >> 8) & 255;
  const b = valor & 255;
  return `rgba(${r},${g},${b},${alfa})`;
}

// Cor de cada perfil. cor = texto e icone; fundo = selo. Recepcao e
// salvia, medico e lavanda, paciente e neutro.
export function coresDoPerfil(cores) {
  return {
    recepcao: { cor: cores.sobreSalviaSuave, fundo: cores.salviaSuave },
    medico: { cor: cores.sobreLavandaSuave, fundo: cores.lavandaSuave },
    paciente: { cor: cores.sobreNeutro, fundo: cores.neutroSuave },
  };
}
