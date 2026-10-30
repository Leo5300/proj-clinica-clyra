// src/theme/area.js
//
// Cor por area de atendimento, num lugar so. A area vem do campo "area"
// do profissional ("Psicologia" ou "Psiquiatria"). Lavanda e Psicologia;
// verde e Psiquiatria. Area vazia ou desconhecida cai no neutro, que e a
// lavanda da marca: a tela nunca quebra por falta do dado.
//
// Todas recebem as cores do tema da vez (useTema().cores).

export const AREAS = ['Psicologia', 'Psiquiatria'];

export function ehPsiquiatria(area) {
  return area === 'Psiquiatria';
}

// Ponto, barra lateral e avatar.
export function corDaArea(area, cores) {
  return ehPsiquiatria(area) ? cores.verde : cores.lavanda;
}

// Plano cheio (topo do Detalhe, faixa do bilhete). Sobre o verde o texto e
// branco; sobre a lavanda, tinta.
export function planoDaArea(area, cores) {
  if (ehPsiquiatria(area)) {
    return {
      fundo: cores.planoVerde,
      texto: cores.sobrePlanoVerde,
      texto2: cores.sobrePlanoVerde2,
      escuro: true,
    };
  }
  return {
    fundo: cores.destaque,
    texto: cores.sobrePlano,
    texto2: cores.sobrePlano2,
    escuro: false,
  };
}

// Topo das telas do perfil Paciente: sempre o verde, texto branco.
export function planoDoPaciente(cores) {
  return {
    fundo: cores.planoPaciente,
    texto: cores.sobrePlanoPaciente,
    texto2: cores.sobrePlanoPaciente2,
    escuro: true,
  };
}

// Acento de cada perfil (o "+" flutuante): verde no paciente, lavanda na
// equipe. solido = sem transparencia; translucido = vidro; texto = sinal.
export function acentoDoPerfil(perfil, cores) {
  if (perfil === 'paciente') {
    return {
      solido: cores.acentoPaciente,
      translucido: cores.acentoPacienteVidro,
      texto: cores.sobreAcentoPaciente,
    };
  }
  return {
    solido: cores.vidroTintaSolido,
    translucido: cores.vidroTinta,
    texto: cores.sobreVidroTinta,
  };
}

// Topo do Inicio do profissional: lilas ou menta, texto tinta nos dois.
export function topoDoProfissional(area, cores) {
  return {
    fundo: ehPsiquiatria(area) ? cores.menta : cores.lavandaClara,
    texto: cores.sobrePlano,
    texto2: cores.sobrePlano2,
    escuro: false,
  };
}

// Ponto sobre o plano de tinta: o verde escuro some ali, a menta nao.
export function pontoSobreTinta(area, cores) {
  return ehPsiquiatria(area) ? cores.menta : cores.lavanda;
}

// Tom do avatar na cor cheia da area (components/Avatar).
export function tomDoAvatar(area) {
  return ehPsiquiatria(area) ? 'psiquiatria' : 'psicologia';
}

// Etiqueta escrita da area: fundo suave e texto forte da mesma familia.
export function estiloDeEtiqueta(area, cores) {
  if (ehPsiquiatria(area)) {
    return { fundo: cores.verdeSuave, texto: cores.sobreVerdeSuave, ponto: cores.verde };
  }
  return {
    fundo: cores.lavandaSuave,
    texto: cores.sobreLavandaSuave,
    ponto: cores.lavanda,
  };
}
