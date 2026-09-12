// src/services/httpExterno.js
//
// Cliente HTTP para servicos que NAO sao nossos.
//
// Este arquivo e separado do api.js para impedir que o token da clinica
// seja enviado a servicos de terceiros.

const USER_AGENT = 'ClyraApp-SENAI/1.0 (projeto academico)';
const TIMEOUT_MS = 8000;

class ServicoExternoIndisponivel extends Error {
  constructor(servico, mensagem) {
    super(mensagem);
    this.name = 'ServicoExternoIndisponivel';
    this.servico = servico;
  }
}

async function buscarExterno(nomeServico, url, opcoes = {}) {
  const controlador = new AbortController();
  const temporizador = setTimeout(
    () => controlador.abort(),
    TIMEOUT_MS,
  );

  let resposta;

  try {
    resposta = await fetch(url, {
      ...opcoes,
      signal: controlador.signal,
      headers: {
        'User-Agent': USER_AGENT,
        ...(opcoes.headers || {}),
      },
    });
  } catch (e) {
    if (e.name === 'AbortError') {
      throw new ServicoExternoIndisponivel(
        nomeServico,
        `O serviço de ${nomeServico} demorou demais para responder.`,
      );
    }

    throw new ServicoExternoIndisponivel(
      nomeServico,
      `Não foi possível falar com o serviço de ${nomeServico}.`,
    );
  } finally {
    clearTimeout(temporizador);
  }

  if (resposta.status === 429) {
    throw new ServicoExternoIndisponivel(
      nomeServico,
      `Muitas consultas seguidas ao serviço de ${nomeServico}. Espere um instante.`,
    );
  }

  if (resposta.status === 403) {
    throw new ServicoExternoIndisponivel(
      nomeServico,
      `O serviço de ${nomeServico} recusou a requisição.`,
    );
  }

  return resposta;
}

export {
  buscarExterno,
  ServicoExternoIndisponivel,
  USER_AGENT,
  TIMEOUT_MS,
};