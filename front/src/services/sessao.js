// src/services/sessao.js
//
// Unico ponto do app que conversa com o cofre do sistema operacional.
// Nenhuma tela deve importar expo-secure-store diretamente -- se precisar
// do token ou de quem esta logado, importa daqui.
//
// O perfil guardado no aparelho serve SO para decidir a interface (que
// menu mostrar, que tela abrir). Quem garante o acesso e o servidor: ele
// confere o token e o perfil em toda requisicao. Alterar o perfil aqui no
// aparelho mudaria botoes, nunca os dados que a API devolve.
//
// Limitacao conhecida: expo-secure-store nao funciona no target web. Como o
// app ja precisa ser testado no Expo Go ou emulador (Alert.alert tambem nao
// funciona no web), isso nao muda nosso fluxo de teste. NAO cair para
// AsyncStorage no web: seria trocar o cofre por um arquivo de texto puro.

import { useEffect, useState } from 'react';
import * as SecureStore from 'expo-secure-store';

// Chaves unicas, definidas so aqui.
const CHAVE_TOKEN = 'clinica.token';
const CHAVE_USUARIO = 'clinica.usuario';

// Cache em memoria do modulo: o cofre e lento para ser lido a cada tela.
// undefined = ainda nao lido; null = nao ha sessao.
let tokenEmMemoria;
let usuarioEmMemoria;

// Telas montadas que querem saber quando o usuario muda (useUsuario).
const ouvintes = new Set();

function avisarOuvintes() {
  ouvintes.forEach((ouvinte) => ouvinte(usuarioEmMemoria ?? null));
}

// So o resumo necessario para a interface. Nada de dado de saude.
function resumoDoUsuario(usuario) {
  if (!usuario) return null;

  const { id, nome, email, perfil, vinculoId, trocarSenha, fotoUri } =
    usuario;

  return {
    id,
    nome,
    email,
    perfil,
    vinculoId: vinculoId ?? null,
    trocarSenha: trocarSenha === true,
    fotoUri: fotoUri ?? null,
  };
}

async function salvarSessao(token, usuario) {
  const resumo = resumoDoUsuario(usuario);

  await SecureStore.setItemAsync(CHAVE_TOKEN, token);
  await SecureStore.setItemAsync(CHAVE_USUARIO, JSON.stringify(resumo));

  tokenEmMemoria = token;
  usuarioEmMemoria = resumo;
  avisarOuvintes();
}

// Depois de GET /me, troca de senha ou de foto: o resumo acompanha o
// servidor.
async function atualizarUsuario(usuario) {
  const resumo = resumoDoUsuario(usuario);

  try {
    await SecureStore.setItemAsync(CHAVE_USUARIO, JSON.stringify(resumo));
  } catch (e) {
    // Sem cofre o resumo vale so ate fechar o app: o token continua la.
  }

  usuarioEmMemoria = resumo;
  avisarOuvintes();
}

// Atalho mantido para quem ainda so guarda o token.
async function salvarToken(token) {
  await SecureStore.setItemAsync(CHAVE_TOKEN, token);
  tokenEmMemoria = token;
}

// Cofre indisponivel e tratado como "nao ha sessao" -- nunca derruba o app.
async function obterToken() {
  if (tokenEmMemoria !== undefined) {
    return tokenEmMemoria;
  }

  try {
    tokenEmMemoria = await SecureStore.getItemAsync(CHAVE_TOKEN);
    return tokenEmMemoria;
  } catch (e) {
    return null;
  }
}

async function obterUsuario() {
  if (usuarioEmMemoria !== undefined) {
    return usuarioEmMemoria;
  }

  try {
    const bruto = await SecureStore.getItemAsync(CHAVE_USUARIO);
    usuarioEmMemoria = bruto ? JSON.parse(bruto) : null;
  } catch (e) {
    usuarioEmMemoria = null;
  }

  return usuarioEmMemoria;
}

// Sair, sessao expirada ou senha trocada em outro lugar: apaga tudo.
async function limparSessao() {
  try {
    await SecureStore.deleteItemAsync(CHAVE_TOKEN);
    await SecureStore.deleteItemAsync(CHAVE_USUARIO);
  } catch (e) {
    // Nada a fazer: se o cofre nao responde, a sessao tambem nao sera lida.
  }

  tokenEmMemoria = null;
  usuarioEmMemoria = null;
  avisarOuvintes();
}

// Atalho mantido: limpar o token e limpar a sessao inteira.
const limparToken = limparSessao;

async function estaLogado() {
  const token = await obterToken();
  return Boolean(token);
}

// Usuario logado para a tela, atualizado quando a sessao muda.
function useUsuario() {
  const [estado, setEstado] = useState(() => ({
    usuario: usuarioEmMemoria ?? null,
    carregando: usuarioEmMemoria === undefined,
  }));

  useEffect(() => {
    let montado = true;

    const ouvinte = (usuario) => {
      if (montado) setEstado({ usuario, carregando: false });
    };

    ouvintes.add(ouvinte);

    obterUsuario().then(ouvinte);

    return () => {
      montado = false;
      ouvintes.delete(ouvinte);
    };
  }, []);

  return estado;
}

export {
  salvarSessao,
  atualizarUsuario,
  salvarToken,
  obterToken,
  obterUsuario,
  limparSessao,
  limparToken,
  estaLogado,
  useUsuario,
};
