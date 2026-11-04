// src/services/datas.js
//
// Funcoes puras de data para as telas: o que a pessoa le e sempre dd/mm,
// nunca AAAA-MM-DD. Nenhuma depende de Intl/toLocaleString, que muda de
// aparelho para aparelho.

// Indice de Date.getDay() -> nome gravado nos horarios de atendimento.
// Domingo (0) nao tem atendimento.
export const DIAS_SEMANA = [
  null,
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
];

const NOMES_CURTOS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];

const doisDigitos = (numero) => String(numero).padStart(2, '0');

export function nomeCurtoDoDia(data) {
  return NOMES_CURTOS[data.getDay()];
}

// "seg, 05/10"
export function formatarDataCurta(data) {
  return `${nomeCurtoDoDia(data)}, ${doisDigitos(data.getDate())}/${doisDigitos(data.getMonth() + 1)}`;
}

// "05/10/2026"
export function formatarDataLonga(data) {
  return `${doisDigitos(data.getDate())}/${doisDigitos(data.getMonth() + 1)}/${data.getFullYear()}`;
}

// "31/12/1990" -> "1990-12-31", ou null se a data nao existe no
// calendario (new Date aceita 31/02 e "corrige" para marco).
export function brParaIso(texto) {
  const partes = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(texto ?? '').trim());

  if (!partes) return null;

  const dia = Number(partes[1]);
  const mes = Number(partes[2]);
  const ano = Number(partes[3]);
  const data = new Date(ano, mes - 1, dia);

  if (
    data.getFullYear() !== ano ||
    data.getMonth() !== mes - 1 ||
    data.getDate() !== dia
  ) {
    return null;
  }

  return `${ano}-${doisDigitos(mes)}-${doisDigitos(dia)}`;
}

export function saudacaoPorHorario(data) {
  const hora = data.getHours();

  if (hora >= 5 && hora < 12) return 'Bom dia';
  if (hora >= 12 && hora < 18) return 'Boa tarde';
  return 'Boa noite';
}

// =====================================================================
// Formatos do redesign: "Ter, 3 nov", "14:30 – 15:00", "em 5 dias".
// =====================================================================

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

const MESES_LONGOS = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];

const DIAS_LONGOS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];

const DIAS_COMPLETOS = [
  'Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira',
  'Quinta-feira', 'Sexta-feira', 'Sábado',
];

// Mesma duracao que o servidor usa para a agenda (servidor/regras.js).
export const DURACAO_CONSULTA_MIN = 30;

const maiuscula = (texto) => `${texto[0].toUpperCase()}${texto.slice(1)}`;

export function nomeDoMes(data) {
  return MESES[data.getMonth()];
}

export function nomeLongoDoDia(data) {
  return DIAS_LONGOS[data.getDay()];
}

// "14:30"
export function formatarHorario(data) {
  return `${doisDigitos(data.getHours())}:${doisDigitos(data.getMinutes())}`;
}

// "Ter, 3 nov"
export function formatarDiaEMes(data) {
  return `${maiuscula(nomeCurtoDoDia(data))}, ${data.getDate()} ${nomeDoMes(data)}`;
}

// "Ter, 3 nov · 14:30"
export function formatarDiaEHora(data) {
  return `${formatarDiaEMes(data)} · ${formatarHorario(data)}`;
}

// "Terça-feira, 3 de novembro"
export function formatarDataPorExtenso(data) {
  return `${DIAS_COMPLETOS[data.getDay()]}, ${data.getDate()} de ${MESES_LONGOS[data.getMonth()]}`;
}

// "14:30 – 15:00"
export function formatarFaixa(inicio) {
  const fim = new Date(inicio.getTime() + DURACAO_CONSULTA_MIN * 60 * 1000);
  return `${formatarHorario(inicio)} – ${formatarHorario(fim)}`;
}

// "hoje", "amanhã", "em 5 dias" -- contando dias de calendario.
export function quandoRelativo(data, agora = new Date()) {
  const inicio = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const dias = Math.round((inicio(data) - inicio(agora)) / (24 * 60 * 60 * 1000));

  if (dias <= 0) return 'hoje';
  if (dias === 1) return 'amanhã';
  return `em ${dias} dias`;
}

// "out – nov 2026" ou "nov 2026": meses cobertos por uma lista de datas.
export function faixaDeMeses(datas) {
  if (datas.length === 0) return '';

  const primeira = datas[0];
  const ultima = datas[datas.length - 1];
  const ano = ultima.getFullYear();

  if (primeira.getMonth() === ultima.getMonth()) {
    return `${nomeDoMes(primeira)} ${ano}`;
  }

  return `${nomeDoMes(primeira)} – ${nomeDoMes(ultima)} ${ano}`;
}
