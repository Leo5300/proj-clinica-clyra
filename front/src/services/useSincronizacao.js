// src/services/useSincronizacao.js
//
// Liga a sincronizacao a vida da tela: sincroniza quando o app VOLTA ao
// primeiro plano, deixa sincronizar sob pedido e entrega o ultimo resultado
// para a tela mostrar.
//
// So escuta enquanto a tela que usa o hook esta montada. Quando ela sai, o
// ouvinte e removido -- sem isso ele continuaria vivo e dispararia
// sincronizacoes sem ninguem para mostra-las.

import { useEffect } from 'react';
import { AppState } from 'react-native';
import { sincronizarAgenda } from './sincronizacao';

export function useSincronizacao() {
  useEffect(() => {
    let anterior = AppState.currentState;

    const assinatura = AppState.addEventListener('change', (atual) => {
      // "Voltou" = estava fora (background ou inactive) e agora esta active.
      // active -> active nao e volta.
      const voltou =
        (anterior === 'background' || anterior === 'inactive') &&
        atual === 'active';

      anterior = atual;

      if (voltou) {
        sincronizarAgenda('voltou ao app');
      }
    });

    return () => assinatura.remove();
  }, []);
}
