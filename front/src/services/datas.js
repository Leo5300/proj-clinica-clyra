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
