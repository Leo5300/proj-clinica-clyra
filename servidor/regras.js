// regras.js - regras de negocio da API da clinica
//
// So funcoes puras: recebem os dados e devolvem a resposta, sem rede, sem
// arquivo e sem relogio escondido (quem depende de "agora" recebe o
// momento por parametro). Por isso cada regra pode ser testada direto,
// sem subir servidor nenhum.
//
// Datas e horas seguem o fuso do computador que roda a API, o mesmo que
// o app usa para mostrar as consultas.

// Uma consulta ocupa [hora, hora + 30 min).
const DURACAO_CONSULTA_MIN = 30;

// O paciente so remarca ou cancela sozinho com esta antecedencia. Mais
// perto disso, so a recepcao, que ainda consegue encaixar outra pessoa.
const ANTECEDENCIA_MINIMA_MS = 24 * 60 * 60 * 1000;

// Indice de Date.getDay() -> nome gravado nos horarios. Domingo (0) nao
// tem atendimento.
const DIAS_SEMANA = [
  null,
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
];

function horaValida(texto) {
  if (typeof texto !== 'string' || !/^\d{2}:\d{2}$/.test(texto)) {
    return false;
  }

  const [hora, minuto] = texto.split(':').map(Number);
  return hora <= 23 && minuto <= 59;
}

function minutosDe(hora) {
  const [h, m] = hora.split(':').map(Number);
  return h * 60 + m;
}

// new Date aceita 2026-02-31 e "corrige" para marco. Conferir os campos
// de volta pega data que nao existe no calendario.
function dataValida(texto) {
  if (typeof texto !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(texto)) {
    return false;
  }

  const [ano, mes, dia] = texto.split('-').map(Number);
  const data = new Date(ano, mes - 1, dia);

  return (
    data.getFullYear() === ano &&
    data.getMonth() === mes - 1 &&
    data.getDate() === dia
  );
}

function dataDe(texto) {
  const [ano, mes, dia] = texto.split('-').map(Number);
  return new Date(ano, mes - 1, dia);
}

function consultaValida(consulta) {
  return dataValida(consulta.data) && horaValida(consulta.hora);
}

// Montado campo a campo, no fuso local, para nao depender de como o motor
// interpreta texto de data sem fuso.
function inicioDaConsulta(consulta) {
  const [ano, mes, dia] = String(consulta.data).split('-').map(Number);
  const [hora, minuto] = String(consulta.hora).split(':').map(Number);
  return new Date(ano, mes - 1, dia, hora, minuto);
}

function diaDaSemana(data) {
  return DIAS_SEMANA[dataDe(data).getDay()];
}

// Confere um horario de atendimento antes de gravar. Devolve a mensagem
// de erro ou null.
function validarHorarioDeAtendimento({ diaSemana, horaInicio, horaFim }) {
  if (!DIAS_SEMANA.filter(Boolean).includes(diaSemana)) {
    return 'Escolha o dia da semana, de segunda-feira a sábado.';
  }

  if (!horaValida(horaInicio) || !horaValida(horaFim)) {
    return 'Informe os horários no formato HH:MM, por exemplo 08:00.';
  }

  if (minutosDe(horaInicio) >= minutosDe(horaFim)) {
    return 'O horário inicial deve ser menor que o horário final.';
  }

  return null;
}

// A consulta inteira (inicio + 30 min) precisa caber numa faixa do
// medico naquele dia da semana.
function cabeNoAtendimento(consulta, horariosDoMedico) {
  if (!consultaValida(consulta)) {
    return false;
  }

  const dia = diaDaSemana(consulta.data);
  const inicio = minutosDe(consulta.hora);
  const fim = inicio + DURACAO_CONSULTA_MIN;

  return horariosDoMedico.some(
    (h) =>
      h.diaSemana === dia &&
      horaValida(h.horaInicio) &&
      horaValida(h.horaFim) &&
      minutosDe(h.horaInicio) <= inicio &&
      fim <= minutosDe(h.horaFim),
  );
}

// Duas consultas conflitam quando caem no mesmo dia e os intervalos se
// sobrepoem. Com a agenda em passos de 30 min, e o caso de mesmo
// data + hora.
function conflitam(a, b) {
  if (!consultaValida(a) || !consultaValida(b) || a.data !== b.data) {
    return false;
  }

  const inicioA = minutosDe(a.hora);
  const inicioB = minutosDe(b.hora);

  return (
    inicioA < inicioB + DURACAO_CONSULTA_MIN &&
    inicioB < inicioA + DURACAO_CONSULTA_MIN
  );
}

// Confere, nesta ordem, se a consulta pode ser gravada: o primeiro
// problema encontrado e o que a pessoa precisa resolver. "outras" ja vem
// sem a propria consulta, no caso da remarcacao.
// Devolve null (pode gravar) ou { status, erro }.
function verificarAgendamento({
  consulta,
  horariosDoMedico,
  outrasDoMedico,
  outrasDoPaciente,
  agora = new Date(),
}) {
  if (!consultaValida(consulta)) {
    return { status: 400, erro: 'Data ou hora inválida.' };
  }

  if (inicioDaConsulta(consulta) <= agora) {
    return { status: 400, erro: 'Escolha um horário futuro.' };
  }

  if (!cabeNoAtendimento(consulta, horariosDoMedico)) {
    return { status: 409, erro: 'Fora do horário de atendimento do médico.' };
  }

  if (outrasDoMedico.some((outra) => conflitam(outra, consulta))) {
    return {
      status: 409,
      erro: 'Este horário acabou de ser ocupado. Escolha outro.',
    };
  }

  if (outrasDoPaciente.some((outra) => conflitam(outra, consulta))) {
    return {
      status: 409,
      erro: 'O paciente já tem uma consulta neste horário.',
    };
  }

  return null;
}

function consultaFutura(consulta, agora = new Date()) {
  return consultaValida(consulta) && inicioDaConsulta(consulta) > agora;
}

// Regra das 24 h. Vale a data da consulta ORIGINAL: remarcar para longe
// nao libera uma consulta que ja esta em cima da hora.
function podeAlterarSozinho(consulta, agora = new Date()) {
  return (
    consultaValida(consulta) &&
    inicioDaConsulta(consulta) - agora >= ANTECEDENCIA_MINIMA_MS
  );
}

module.exports = {
  DURACAO_CONSULTA_MIN,
  DIAS_SEMANA,
  horaValida,
  dataValida,
  inicioDaConsulta,
  validarHorarioDeAtendimento,
  cabeNoAtendimento,
  conflitam,
  verificarAgendamento,
  consultaFutura,
  podeAlterarSozinho,
};
