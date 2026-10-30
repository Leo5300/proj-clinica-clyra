// src/services/haptica.js
//
// Unico ponto do app que conversa com o motor de vibracao. Uma vibracao
// por acao, sempre junto do visual e nunca como unico aviso: muita gente
// desliga a vibracao, e boa parte dos Android nem tem motor fino.
//
// Falha silenciosa: sem motor ou no web, nada acontece. A vibracao nao
// e cortada com "reduzir movimento", porque nao e movimento na tela --
// quem nao quer vibrar desliga nos ajustes do proprio sistema.

import * as Haptics from 'expo-haptics';

function tentar(chamada) {
  try {
    chamada().catch(() => {});
  } catch (e) {
    // Plataforma sem suporte.
  }
}

// Escolha de chip, segmento ou chave.
export function vibrarSelecao() {
  tentar(() => Haptics.selectionAsync());
}

// Algo deu certo: agendou, salvou, conectou.
export function vibrarSucesso() {
  tentar(() =>
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
  );
}

// Conflito: horario ocupado (409).
export function vibrarAviso() {
  tentar(() =>
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning),
  );
}

// Confirmacao de acao com peso, como cancelar uma consulta.
export function vibrarImpacto() {
  tentar(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium));
}
