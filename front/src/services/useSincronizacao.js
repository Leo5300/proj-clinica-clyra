// src/services/useSincronizacao.js
//
// Liga a sincronizacao a vida da tela: sincroniza quando o app VOLTA ao
// primeiro plano, deixa sincronizar sob pedido e entrega o ultimo resultado
// para a tela mostrar.
//
// So escuta enquanto a tela que usa o hook esta montada. Quando ela sai, o
// ouvinte e removido -- sem isso ele continuaria vivo e dispararia
// sincronizacoes sem ninguem para mostra-las.

import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import {
  lerHistorico,
  lerUltima,
  precisaSincronizar,
  sincronizarAgenda,
} from './sincronizacao';

// A tarefa em segundo plano nunca roda em menos de 15 minutos (minimo do
// Android), e voltar ao app tambem nao deve sincronizar mais que isso.
export const INTERVALO_PADRAO_MIN = 15;

export function useSincronizacao({
  intervaloMinutos = INTERVALO_PADRAO_MIN,
} = {}) {
  // ultima = a ultima que deu certo; ultimaTentativa = a mais recente, deu
  // certo ou nao. A tela precisa das duas para ser honesta.
  const [estado, setEstado] = useState({
    ultima: null,
    ultimaTentativa: null,
    sincronizando: false,
  });
  // Sem isto, uma sincronizacao que termina depois de a tela sair tentaria
  // atualizar um estado que nao existe mais.
  const montado = useRef(true);
  // Ref: o ouvinte do AppState e criado uma vez so e precisa ler o valor de
  // AGORA, nao o do primeiro render.
  const intervalo = useRef(intervaloMinutos);

  useEffect(() => {
    intervalo.current = intervaloMinutos;
  });

  const atualizar = useCallback((parte) => {
    if (montado.current) {
      setEstado((atual) => ({ ...atual, ...parte }));
    }
  }, []);

  const recarregar = useCallback(async () => {
    const [ultima, historico] = await Promise.all([
      lerUltima(),
      lerHistorico(),
    ]);

    atualizar({ ultima, ultimaTentativa: historico[0] ?? null });
  }, [atualizar]);

  const executar = useCallback(
    async (origem) => {
      atualizar({ sincronizando: true });

      try {
        return await sincronizarAgenda(origem);
      } finally {
        await recarregar();
        atualizar({ sincronizando: false });
      }
    },
    [atualizar, recarregar],
  );

  useEffect(() => {
    montado.current = true;
    recarregar();

    return () => {
      montado.current = false;
    };
  }, [recarregar]);

  useEffect(() => {
    let anterior = AppState.currentState;

    const assinatura = AppState.addEventListener('change', async (atual) => {
      // "Voltou" = estava fora (background ou inactive) e agora esta active.
      // active -> active nao e volta.
      const voltou =
        (anterior === 'background' || anterior === 'inactive') &&
        atual === 'active';

      anterior = atual;

      // No iOS o app tambem passa por "inactive" ao abrir a central de
      // notificacoes ou o seletor de apps, sem ir para o fundo. E o
      // intervalo que impede sincronizar a cada uma dessas voltas.
      if (voltou && (await precisaSincronizar(intervalo.current))) {
        executar('voltou ao app');
      }
    });

    return () => assinatura.remove();
  }, [executar]);

  // Sob pedido (botao "Atualizar agora"): ignora o intervalo, porque foi uma
  // pessoa quem pediu.
  const sincronizarAgora = useCallback(() => executar('manual'), [executar]);

  return { ...estado, sincronizarAgora, recarregar };
}
