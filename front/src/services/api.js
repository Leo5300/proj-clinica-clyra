const BASE_URL = 'http://localhost:3000';

// ==================== MÉDICOS ====================

async function buscarMedicos() {
  const resposta = await fetch(`${BASE_URL}/medicos`);

  if (!resposta.ok) {
    throw new Error(`Erro ${resposta.status} ao buscar medicos`);
  }

  return resposta.json();
}

async function buscarPacientes() {
  const resposta = await fetch(`${BASE_URL}/pacientes`);

  if (!resposta.ok) {
    throw new Error(`Erro ${resposta.status} ao buscar pacientes`);
  }

  return resposta.json();
}

async function criarMedico(medico) {
  const resposta = await fetch(`${BASE_URL}/medicos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(medico),
  });

  if (!resposta.ok) {
    throw new Error(`Erro ${resposta.status} ao cadastrar medico`);
  }

  return resposta.json();
}

async function atualizarMedico(id, medico) {
  const resposta = await fetch(`${BASE_URL}/medicos/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(medico),
  });

  if (!resposta.ok) {
    throw new Error(`Erro ${resposta.status} ao atualizar medico`);
  }

  return resposta.json();
}

async function excluirMedico(id) {
  const resposta = await fetch(`${BASE_URL}/medicos/${id}`, {
    method: 'DELETE',
  });

  if (!resposta.ok) {
    throw new Error(`Erro ${resposta.status} ao excluir medico`);
  }
}

// ==================== PACIENTES ====================

async function criarPaciente(paciente) {
  const resposta = await fetch(`${BASE_URL}/pacientes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(paciente),
  });

  if (!resposta.ok) {
    throw new Error(`Erro ${resposta.status} ao cadastrar paciente`);
  }

  return resposta.json();
}

async function atualizarPaciente(id, paciente) {
  const resposta = await fetch(`${BASE_URL}/pacientes/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(paciente),
  });

  if (!resposta.ok) {
    throw new Error(`Erro ${resposta.status} ao atualizar paciente`);
  }

  return resposta.json();
}

async function excluirPaciente(id) {
  const resposta = await fetch(`${BASE_URL}/pacientes/${id}`, {
    method: 'DELETE',
  });

  if (!resposta.ok) {
    throw new Error(`Erro ${resposta.status} ao excluir paciente`);
  }
}

// ==================== HORÁRIOS ====================

async function buscarHorarios() {
  const resposta = await fetch(`${BASE_URL}/horarios`);

  if (!resposta.ok) {
    throw new Error(`Erro ${resposta.status} ao buscar horarios`);
  }

  return resposta.json();
}

async function criarHorario(horario) {
  const resposta = await fetch(`${BASE_URL}/horarios`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(horario),
  });

  if (!resposta.ok) {
    throw new Error(`Erro ${resposta.status} ao cadastrar horario`);
  }

  return resposta.json();
}

async function atualizarHorario(id, horario) {
  const resposta = await fetch(`${BASE_URL}/horarios/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(horario),
  });

  if (!resposta.ok) {
    throw new Error(`Erro ${resposta.status} ao atualizar horario`);
  }

  return resposta.json();
}

async function excluirHorario(id) {
  const resposta = await fetch(`${BASE_URL}/horarios/${id}`, {
    method: 'DELETE',
  });

  if (!resposta.ok) {
    throw new Error(`Erro ${resposta.status} ao excluir horario`);
  }
}

// ==================== EXPORTS ====================

export {
  buscarMedicos,
  buscarPacientes,
  criarMedico,
  atualizarMedico,
  excluirMedico,
  criarPaciente,
  atualizarPaciente,
  excluirPaciente,
  buscarHorarios,
  criarHorario,
  atualizarHorario,
  excluirHorario,
};