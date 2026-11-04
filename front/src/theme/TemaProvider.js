// src/theme/TemaProvider.js
//
// Guarda o tema do app e entrega tudo que a interface precisa saber por
// useTema(): a paleta da vez, se esta escuro, o modo escolhido e as
// preferencias de acessibilidade (reduzir transparencia e movimento).
//
// O modo vale para o app inteiro, inclusive componentes nativos (alerta,
// chave, barra de status): Appearance.setColorScheme aplica a escolha ao
// sistema enquanto o app esta aberto.

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { AccessibilityInfo, Appearance, useColorScheme } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import * as SystemUI from 'expo-system-ui';

import { paletas, coresDoPerfil, sobreposicaoDoPaciente } from './cores';
import { sombras } from './medidas';
import { lerPreferencias, salvarPreferencias } from '../services/preferencias';
import { useUsuario } from '../services/sessao';

const TemaContexto = createContext(null);

const ESQUEMA_DO_MODO = {
  automatico: 'unspecified',
  claro: 'light',
  escuro: 'dark',
};

function aplicarAoSistema(modo) {
  try {
    Appearance.setColorScheme(ESQUEMA_DO_MODO[modo]);
  } catch (e) {
    // Versao sem suporte: o app segue o tema, os controles nativos seguem
    // o sistema.
  }
}

export function TemaProvider({ children }) {
  const esquemaDoSistema = useColorScheme();
  const movimentoReduzido = useReducedMotion();

  const [modo, setModo] = useState('automatico');
  const [reduzirTransparencia, setReduzirTransparencia] = useState(false);
  const [transparenciaDoSistema, setTransparenciaDoSistema] = useState(false);

  useEffect(() => {
    lerPreferencias().then((preferencias) => {
      setModo(preferencias.tema);
      setReduzirTransparencia(preferencias.reduzirTransparencia);
      aplicarAoSistema(preferencias.tema);
    });
  }, []);

  // So o iOS informa "reduzir transparencia"; no Android a chave do
  // Perfil e o unico caminho.
  useEffect(() => {
    AccessibilityInfo.isReduceTransparencyEnabled?.()
      .then(setTransparenciaDoSistema)
      .catch(() => {});

    const inscricao = AccessibilityInfo.addEventListener?.(
      'reduceTransparencyChanged',
      setTransparenciaDoSistema,
    );

    return () => inscricao?.remove();
  }, []);

  const escuro =
    modo === 'escuro' || (modo === 'automatico' && esquemaDoSistema === 'dark');
  // No perfil Paciente alguns tokens trocam (links e botao sobre a tinta):
  // a troca fica aqui, nao espalhada nas telas.
  const { usuario } = useUsuario();
  const ehPaciente = usuario?.perfil === 'paciente';
  const cores = useMemo(() => {
    const base = escuro ? paletas.escuro : paletas.claro;
    return ehPaciente ? { ...base, ...sobreposicaoDoPaciente(base) } : base;
  }, [escuro, ehPaciente]);

  // Fundo da janela nativa igual ao papel: sem lampejo branco ao trocar de
  // tela no tema escuro.
  useEffect(() => {
    SystemUI.setBackgroundColorAsync(cores.papel).catch(() => {});
  }, [cores.papel]);

  const definirModo = useCallback((novo) => {
    setModo(novo);
    aplicarAoSistema(novo);
    salvarPreferencias({ tema: novo });
  }, []);

  const definirReduzirTransparencia = useCallback((ligado) => {
    setReduzirTransparencia(ligado);
    salvarPreferencias({ reduzirTransparencia: ligado });
  }, []);

  const valor = useMemo(
    () => ({
      cores,
      escuro,
      sombras: sombras(cores),
      coresDoPerfil: coresDoPerfil(cores),
      modo,
      definirModo,
      reduzirTransparencia,
      definirReduzirTransparencia,
      transparenciaReduzida: reduzirTransparencia || transparenciaDoSistema,
      movimentoReduzido,
    }),
    [
      cores,
      escuro,
      modo,
      definirModo,
      reduzirTransparencia,
      definirReduzirTransparencia,
      transparenciaDoSistema,
      movimentoReduzido,
    ],
  );

  return <TemaContexto.Provider value={valor}>{children}</TemaContexto.Provider>;
}

export function useTema() {
  const tema = useContext(TemaContexto);

  if (!tema) {
    throw new Error('useTema precisa estar dentro de TemaProvider.');
  }

  return tema;
}
