// gerar-consultas.js - cria um banco de teste com milhares de consultas (Aula 10)
//
// Node puro, sem dependencia nenhuma. Serve para produzir VOLUME: com 10
// consultas nada trava e a aula nao acontece.
//
// Ele NAO mexe no db_clinica.json. Le o banco da clinica, copia os cadastros
// (usuarios, medicos, pacientes, horarios) e grava tudo, mais as consultas
// geradas, num arquivo temporario. Quem aponta o json-server para esse arquivo
// e voce, na hora de testar.
//
// Uso:
//   node servidor/gerar-consultas.js [quantidade]
//
// Sem argumento, gera 2500 consultas. O sorteio usa uma semente fixa: todas as
// maquinas geram exatamente os mesmos dados, entao os numeros de uma squad
// podem ser comparados com os de outra.

const fs = require('fs');
const os = require('os');
const path = require('path');
const { conflitam } = require('./regras');

const QUANTIDADE_PADRAO = 2500;
const SEMENTE = 10;

const caminhoDoBanco = path.join(__dirname, '..', 'db_clinica.json');
const caminhoDaSaida = path.join(os.tmpdir(), 'clyra-volume.json');

const quantidade = Number.parseInt(process.argv[2], 10) || QUANTIDADE_PADRAO;

if (quantidade < 10 || quantidade > 20000) {
  console.error('Informe uma quantidade entre 10 e 20000.');
  process.exit(1);
}

const banco = JSON.parse(fs.readFileSync(caminhoDoBanco, 'utf8'));

console.log(
  `Banco base: ${banco.medicos.length} medicos, ${banco.pacientes.length} pacientes.`,
);
console.log(`Consultas a gerar: ${quantidade}`);

// ---------------------------------------------------------------------
// Sorteio com semente (mulberry32): mesma semente, mesma sequencia.
// ---------------------------------------------------------------------
function criarSorteio(semente) {
  let estado = semente >>> 0;

  return () => {
    estado = (estado + 0x6d2b79f5) >>> 0;
    let t = estado;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const sortear = criarSorteio(SEMENTE);
const sortearAte = (limite) => Math.floor(sortear() * limite);
const doisDigitos = (numero) => String(numero).padStart(2, '0');

// ---------------------------------------------------------------------
// Vagas: profissional + dia + horario
// ---------------------------------------------------------------------
// Horarios de 30 em 30 minutos, das 07:00 as 18:30.
const HORARIOS_DO_DIA = [];

for (let minutos = 7 * 60; minutos < 19 * 60; minutos += 30) {
  HORARIOS_DO_DIA.push(
    `${doisDigitos(Math.floor(minutos / 60))}:${doisDigitos(minutos % 60)}`,
  );
}

const MINIMO_DE_DIAS = 26;
const medicosIds = banco.medicos.map((medico) => String(medico.id));
const pacientesIds = banco.pacientes.map((paciente) => String(paciente.id));

function dataIso(data) {
  return `${data.getFullYear()}-${doisDigitos(data.getMonth() + 1)}-${doisDigitos(data.getDate())}`;
}

// Dias de atendimento (segunda a sabado) a partir de amanha, em numero
// suficiente para caber todas as consultas sem sobreposicao.
function diasDeAtendimento(precisaDe) {
  const dias = [];
  const dia = new Date();
  dia.setHours(12, 0, 0, 0);

  while (
    dias.length < MINIMO_DE_DIAS ||
    dias.length * medicosIds.length * HORARIOS_DO_DIA.length < precisaDe * 1.1
  ) {
    dia.setDate(dia.getDate() + 1);

    if (dia.getDay() !== 0) {
      dias.push(dataIso(dia));
    }
  }

  return dias;
}

// Sorteia vagas todas diferentes: embaralha so o comeco da lista
// (Fisher-Yates parcial) e devolve as primeiras.
function sortearVagas(total) {
  const vagas = [];

  for (const data of diasDeAtendimento(total)) {
    for (const medicoId of medicosIds) {
      for (const hora of HORARIOS_DO_DIA) {
        vagas.push({ medicoId, data, hora });
      }
    }
  }

  for (let i = 0; i < total; i++) {
    const j = i + sortearAte(vagas.length - i);
    [vagas[i], vagas[j]] = [vagas[j], vagas[i]];
  }

  return vagas.slice(0, total);
}

// 5% das consultas sao conflitos plantados de proposito. Sem eles nao ha o
// que encontrar.
const plantadas = Math.round(quantidade * 0.05);
const repetidas = Math.ceil(plantadas * 0.6);

const consultas = sortearVagas(quantidade - plantadas).map((vaga, indice) => ({
  id: String(indice + 1),
  pacienteId: pacientesIds[sortearAte(pacientesIds.length)],
  medicoId: vaga.medicoId,
  data: vaga.data,
  hora: vaga.hora,
  criadoPor: 'gerador',
}));

// ---------------------------------------------------------------------
// Conflitos de proposito
// ---------------------------------------------------------------------
// - repetidas: mesmo profissional, dia e horario de uma consulta que ja existe;
// - deslocadas: comecam 15 minutos depois de uma existente. Se sobrepoem a ela
//   e, quando a vaga seguinte tambem esta ocupada, a essa tambem.
function somarMinutos(hora, minutos) {
  const total = Number(hora.slice(0, 2)) * 60 + Number(hora.slice(3)) + minutos;
  return `${doisDigitos(Math.floor(total / 60))}:${doisDigitos(total % 60)}`;
}

const semSobreposicao = consultas.length;

for (let i = 0; i < plantadas; i++) {
  const original = consultas[sortearAte(semSobreposicao)];

  consultas.push({
    ...original,
    id: String(consultas.length + 1),
    pacienteId: pacientesIds[sortearAte(pacientesIds.length)],
    hora: i < repetidas ? original.hora : somarMinutos(original.hora, 15),
  });
}

console.log(
  `Consultas: ${semSobreposicao} sem sobreposicao + ${plantadas} plantadas (${repetidas} repetidas, ${plantadas - repetidas} deslocadas).`,
);

// ---------------------------------------------------------------------
// A resposta certa, pela regra do servidor
// ---------------------------------------------------------------------
// Conta os pares que conflitam usando a conflitam() de regras.js, a mesma
// regra que a API aplica ao gravar uma consulta. So consultas do mesmo
// profissional e do mesmo dia podem conflitar, entao compara dentro desses
// grupos. E o numero que o app precisa encontrar.
function contarConflitos(lista) {
  const grupos = new Map();

  for (const consulta of lista) {
    const chave = `${consulta.medicoId}|${consulta.data}`;
    const grupo = grupos.get(chave) || [];
    grupo.push(consulta);
    grupos.set(chave, grupo);
  }

  let pares = 0;

  for (const grupo of grupos.values()) {
    for (let i = 0; i < grupo.length; i++) {
      for (let j = i + 1; j < grupo.length; j++) {
        if (conflitam(grupo[i], grupo[j])) {
          pares++;
        }
      }
    }
  }

  return pares;
}

console.log(
  `Conflitos esperados (regra do servidor): ${contarConflitos(consultas)} pares.`,
);

fs.writeFileSync(
  caminhoDaSaida,
  JSON.stringify({ ...banco, consultas }, null, 2),
);

console.log(`Arquivo gravado em: ${caminhoDaSaida}`);

console.log('');
console.log('Para testar com este volume, pare o json-server de sempre e suba este:');
console.log(`  npx json-server --watch "${caminhoDaSaida}" --port 3000 --host 127.0.0.1`);
console.log('');
console.log('Para voltar ao normal, pare esse e suba o de sempre:');
console.log('  npx json-server --watch db_clinica.json --port 3000 --host 127.0.0.1');
