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

// Busca de horarios livres: padrao de 3 semanas, no maximo ~2 meses.
const DIAS_DISPONIBILIDADE_PADRAO = 21;
const DIAS_DISPONIBILIDADE_MAXIMO = 60;

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

function horaDeMinutos(minutos) {
  const h = String(Math.floor(minutos / 60)).padStart(2, '0');
  const m = String(minutos % 60).padStart(2, '0');
  return `${h}:${m}`;
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

function textoDaData(data) {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
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

// Quantidade de dias pedida, dentro dos limites. Valor ausente ou
// invalido cai no padrao.
function diasDaBusca(valor) {
  const dias = Number.parseInt(valor, 10);

  if (!Number.isInteger(dias) || dias < 1) {
    return DIAS_DISPONIBILIDADE_PADRAO;
  }

  return Math.min(dias, DIAS_DISPONIBILIDADE_MAXIMO);
}

// Horarios livres de UM medico, a partir de hoje: de 30 em 30 min dentro
// de cada faixa, so os que cabem inteiros, sem os ocupados e sem os que ja
// passaram. So entram os dias com pelo menos um horario livre. Recebe so
// horarios e consultas do medico e nunca devolve nada de paciente.
function calcularHorariosLivres({
  horarios,
  consultas,
  dias = DIAS_DISPONIBILIDADE_PADRAO,
  agora = new Date(),
}) {
  const resultado = [];

  for (let i = 0; i < dias; i += 1) {
    // Somar no campo "dia" atravessa fim de mes e horario de verao sem
    // conta de milissegundos.
    const dia = new Date(
      agora.getFullYear(),
      agora.getMonth(),
      agora.getDate() + i,
    );
    const nomeDoDia = DIAS_SEMANA[dia.getDay()];

    if (!nomeDoDia) {
      continue;
    }

    const data = textoDaData(dia);
    const livres = new Set();

    horarios
      .filter(
        (h) =>
          h.diaSemana === nomeDoDia &&
          horaValida(h.horaInicio) &&
          horaValida(h.horaFim),
      )
      .forEach((h) => {
        const fimDaFaixa = minutosDe(h.horaFim);

        for (
          let inicio = minutosDe(h.horaInicio);
          inicio + DURACAO_CONSULTA_MIN <= fimDaFaixa;
          inicio += DURACAO_CONSULTA_MIN
        ) {
          const candidata = { data, hora: horaDeMinutos(inicio) };
          const passou = inicioDaConsulta(candidata) <= agora;
          const ocupada = consultas.some((c) => conflitam(c, candidata));

          if (!passou && !ocupada) {
            livres.add(candidata.hora);
          }
        }
      });

    if (livres.size > 0) {
      resultado.push({
        data,
        diaSemana: nomeDoDia,
        horarios: [...livres].sort(),
      });
    }
  }

  return resultado;
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
  diasDaBusca,
  calcularHorariosLivres,
};
