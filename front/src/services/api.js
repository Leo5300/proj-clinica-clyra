// BASE_URL do json-server da Aula 3. Nao confundir com a API da clinica em
// Spring Boot (http://localhost:8080/api, usada em LoginScreen/AgendarScreen),
// que ainda nao esta no ar.
// Em dispositivo fisico (Expo Go), "localhost" e o proprio aparelho -- troque
// pelo IPv4 da maquina que roda o json-server, na mesma rede Wi-Fi.
const BASE_URL = 'http://localhost:3000';

// fetch so rejeita a Promise em falha de rede: 404 e 500 chegam como resposta
// normal. Por isso cada funcao confere resposta.ok e lanca o erro na mao.
async function buscarMedicos() {
  const resposta = await fetch(`${BASE_URL}/medicos`);
  if (!resposta.ok) throw new Error(`Erro ${resposta.status} ao buscar medicos`);
  return resposta.json();
}

async function buscarPacientes() {
  const resposta = await fetch(`${BASE_URL}/pacientes`);
  if (!resposta.ok) throw new Error(`Erro ${resposta.status} ao buscar pacientes`);
  return resposta.json();
}

async function criarMedico(medico) {
  const resposta = await fetch(`${BASE_URL}/medicos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(medico),
  });
  if (!resposta.ok) throw new Error(`Erro ${resposta.status} ao cadastrar medico`);
  return resposta.json();
}

async function atualizarMedico(id, medico) {
  const resposta = await fetch(`${BASE_URL}/medicos/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(medico),
  });
  if (!resposta.ok) throw new Error(`Erro ${resposta.status} ao atualizar medico`);
  return resposta.json();
}

async function excluirMedico(id) {
  const resposta = await fetch(`${BASE_URL}/medicos/${id}`, { method: 'DELETE' });
  if (!resposta.ok) throw new Error(`Erro ${resposta.status} ao excluir medico`);
}

export {
  buscarMedicos,
  buscarPacientes,
  criarMedico,
  atualizarMedico,
  excluirMedico,
};
