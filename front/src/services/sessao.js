// src/services/sessao.js
//
// Unico ponto do app que conversa com o cofre do sistema operacional.
// Nenhuma tela deve importar expo-secure-store diretamente -- se precisar
// do token, importa daqui.
//
// Limitacao conhecida: expo-secure-store nao funciona no target web. Como o
// app ja precisa ser testado no Expo Go ou emulador (Alert.alert tambem nao
// funciona no web), isso nao muda nosso fluxo de teste. NAO cair para
// AsyncStorage no web: seria trocar o cofre por um arquivo de texto puro.

import * as SecureStore from 'expo-secure-store';

// Chave unica, definida so aqui.
const CHAVE_TOKEN = 'clinica.token';

async function salvarToken(token) {
  await SecureStore.setItemAsync(CHAVE_TOKEN, token);
}

// Cofre indisponivel e tratado como "nao ha sessao" -- nunca derruba o app.
async function obterToken() {
  try {
    return await SecureStore.getItemAsync(CHAVE_TOKEN);
  } catch (e) {
    return null;
  }
}

async function limparToken() {
  try {
    await SecureStore.deleteItemAsync(CHAVE_TOKEN);
  } catch (e) {
    // Nada a fazer: se o cofre nao responde, o token tambem nao sera lido.
  }
}

async function estaLogado() {
  const token = await obterToken();
  return Boolean(token);
}

export { salvarToken, obterToken, limparToken, estaLogado };
