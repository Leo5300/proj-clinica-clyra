// src/services/viacep.js
//
// A URL e o contrato do ViaCEP ficam isolados neste arquivo.
// A tela recebe nomes do domínio do CLYRA, como "cidade".

import {
  buscarExterno,
  ServicoExternoIndisponivel,
} from './httpExterno';

const NOME_SERVICO = 'CEP';

async function consultarCep(cepDigitado) {
  const cep = String(cepDigitado || '').replace(/\D/g, '');

  if (cep.length !== 8) {
    throw new ServicoExternoIndisponivel(
      NOME_SERVICO,
      'CEP deve ter 8 dígitos.',
    );
  }

  const resposta = await buscarExterno(
    NOME_SERVICO,
    `https://viacep.com.br/ws/${cep}/json/`,
  );

  // O ViaCEP pode devolver HTML nos erros de formato.
  if (!resposta.ok) {
    throw new ServicoExternoIndisponivel(
      NOME_SERVICO,
      `O serviço de CEP recusou a consulta (HTTP ${resposta.status}).`,
    );
  }

  const dados = await resposta.json();

  // CEP inexistente retorna HTTP 200 com erro no corpo.
  if (dados.erro) {
    throw new ServicoExternoIndisponivel(
      NOME_SERVICO,
      'CEP não encontrado.',
    );
  }

  return {
    cep: dados.cep || '',
    logradouro: dados.logradouro || '',
    bairro: dados.bairro || '',
    cidade: dados.localidade || '',
    uf: dados.uf || '',
  };
}

export { consultarCep };