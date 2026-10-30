// src/services/preferencias.js
//
// Preferencias de aparencia deste aparelho: tema (automatico, claro ou
// escuro) e "reduzir transparencia". Nao sao segredo, por isso ficam no
// AsyncStorage e nao no cofre -- o mesmo criterio dos lembretes.

import AsyncStorage from '@react-native-async-storage/async-storage';

const CHAVE = '@clyra/preferencias';

export const TEMAS = ['automatico', 'claro', 'escuro'];

const PADRAO = {
  tema: 'automatico',
  reduzirTransparencia: false,
};

// Armazenamento indisponivel ou valor estranho: vale o padrao. Preferencia
// de aparencia nunca impede o app de abrir.
export async function lerPreferencias() {
  try {
    const bruto = await AsyncStorage.getItem(CHAVE);
    const salvas = bruto ? JSON.parse(bruto) : {};

    return {
      tema: TEMAS.includes(salvas.tema) ? salvas.tema : PADRAO.tema,
      reduzirTransparencia: salvas.reduzirTransparencia === true,
    };
  } catch (e) {
    return { ...PADRAO };
  }
}

export async function salvarPreferencias(alteracoes) {
  const atuais = await lerPreferencias();
  const novas = { ...atuais, ...alteracoes };

  try {
    await AsyncStorage.setItem(CHAVE, JSON.stringify(novas));
  } catch (e) {
    // Sem armazenamento a escolha vale ate fechar o app.
  }

  return novas;
}
