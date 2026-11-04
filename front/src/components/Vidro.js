// Superficie de vidro para o que flutua. espessura: 'claro' | 'regular' | 'espesso' | 'tinta'; acento (com 'tinta': { solido, translucido } de acentoDoPerfil, no lugar da lavanda); raio; interativo (e um botao); style; children.
//
// O modo e escolhido em tempo de execucao:
// - iOS 26: GlassView (Liquid Glass) do sistema.
// - iOS anterior: BlurView do sistema.
// - Android 12+: BlurView desfocando o alvo de ComVidro. Sem alvo, cai no
//   translucido -- e assim que se respeita o limite de desfoque por tela.
// - Android 11 ou anterior: cor quase solida, sem desfoque.
// - Reduzir transparencia: superficie opaca com borda, em qualquer sistema.
//
// Regras: nunca vidro sobre vidro, nunca dado de saude dentro do vidro,
// nunca opacidade abaixo de 1 num pai do vidro, nunca animar o desfoque.

import React, { createContext, useContext } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { BlurView, BlurTargetView } from 'expo-blur';
import {
  GlassView,
  isGlassEffectAPIAvailable,
  isLiquidGlassAvailable,
} from 'expo-glass-effect';
import { useTema, raio as raios } from '../theme';

// Intensidade do desfoque no Android. O expo-blur divide por 4 no Android,
// entao 80 da um raio perto dos 20 px do mock.
const INTENSIDADE_ANDROID = 80;
const INTENSIDADE_IOS = 60;

function detectarModo() {
  if (Platform.OS === 'ios') {
    try {
      if (isLiquidGlassAvailable() && isGlassEffectAPIAvailable()) {
        return 'liquido';
      }
    } catch (e) {
      // Sem a API de vidro: cai no desfoque do sistema.
    }
    return 'desfoqueIos';
  }

  if (Platform.OS === 'android' && Platform.Version >= 31) {
    return 'desfoqueAndroid';
  }

  return 'antigo';
}

// Calculado uma vez: versao do sistema nao muda com o app aberto.
export const modoDoVidro = detectarModo();

// Escala do toque num botao de vidro: no iOS 26 o proprio vidro reage
// (isInteractive); no Android 12+ cresce 1,04; no Android 11, 0,97.
export const escalaDoVidro =
  modoDoVidro === 'liquido'
    ? 'nenhuma'
    : modoDoVidro === 'antigo'
      ? 'toque'
      : 'vidro';

const AlvoContexto = createContext(null);

// Uma tela com vidro de verdade no Android: o conteudo que rola vai em
// "conteudo" (e e o que o vidro desfoca); o que flutua vai em children,
// sempre depois do conteudo. Um alvo por tela.
export function ComVidro({ conteudo, children, style }) {
  const alvo = React.useRef(null);

  if (modoDoVidro !== 'desfoqueAndroid') {
    return (
      <View style={[{ flex: 1 }, style]}>
        {conteudo}
        {children}
      </View>
    );
  }

  return (
    <View style={[{ flex: 1 }, style]}>
      <BlurTargetView ref={alvo} style={StyleSheet.absoluteFill}>
        {conteudo}
      </BlurTargetView>
      <AlvoContexto.Provider value={alvo}>{children}</AlvoContexto.Provider>
    </View>
  );
}

function fundoOpaco(espessura, cores) {
  if (espessura === 'tinta') return cores.destaque;
  if (espessura === 'claro') return cores.vidroClaroOpaco;
  return cores.superficie;
}

function fundoTranslucido(espessura, cores) {
  if (espessura === 'tinta') return cores.vidroTinta;
  if (espessura === 'claro') return cores.vidroClaro;
  if (espessura === 'espesso') return cores.vidroEspesso;
  return cores.vidroRegular;
}

function bordaDoVidro(espessura, cores) {
  if (espessura === 'tinta') return cores.vidroTintaBorda;
  if (espessura === 'claro') return cores.vidroClaroBorda;
  return cores.vidroBorda;
}

export default function Vidro({
  espessura = 'regular',
  raio = raios.capsula,
  interativo = false,
  acento,
  style,
  children,
}) {
  const { cores: coresDoTema, escuro, sombras, transparenciaReduzida } = useTema();
  // O acento do perfil troca so a cor da espessura 'tinta'.
  const cores = acento
    ? {
        ...coresDoTema,
        destaque: acento.solido,
        vidroTinta: acento.translucido,
        vidroTintaSolido: acento.solido,
      }
    : coresDoTema;
  const alvo = useContext(AlvoContexto);

  const forma = { borderRadius: raio, borderCurve: 'continuous' };
  const sombra = espessura === 'claro' ? null : { boxShadow: sombras.flutuante };

  if (transparenciaReduzida) {
    return (
      <View
        style={[
          forma,
          sombra,
          {
            backgroundColor: fundoOpaco(espessura, cores),
            borderWidth: 1,
            borderColor: espessura === 'regular' || espessura === 'espesso'
              ? cores.linha
              : fundoOpaco(espessura, cores),
          },
          style,
        ]}
      >
        {children}
      </View>
    );
  }

  if (modoDoVidro === 'liquido') {
    let tinta;
    if (espessura === 'tinta') tinta = cores.vidroTinta;
    if (espessura === 'espesso') tinta = cores.vidroEspesso;

    return (
      <GlassView
        glassEffectStyle={espessura === 'claro' ? 'clear' : 'regular'}
        tintColor={tinta}
        isInteractive={interativo}
        colorScheme={escuro ? 'dark' : 'light'}
        style={[forma, style]}
      >
        {children}
      </GlassView>
    );
  }

  // O "+" em tinta e quase opaco: desfoque ali gastaria o orcamento da tela
  // sem mudar nada na tela.
  const usarDesfoque =
    espessura !== 'tinta' &&
    (modoDoVidro === 'desfoqueIos' ||
      (modoDoVidro === 'desfoqueAndroid' && Boolean(alvo)));

  const fundo =
    modoDoVidro === 'antigo' && espessura !== 'claro'
      ? espessura === 'tinta'
        ? cores.vidroTintaSolido
        : cores.vidroAntigo
      : fundoTranslucido(espessura, cores);

  // Sombra fica num pai sem recorte; o recorte arredonda o desfoque.
  return (
    <View style={[forma, sombra, style]}>
      <View
        style={[
          StyleSheet.absoluteFill,
          forma,
          {
            overflow: 'hidden',
            borderWidth: 1,
            borderColor:
              modoDoVidro === 'antigo' && espessura !== 'claro'
                ? cores.linha
                : bordaDoVidro(espessura, cores),
          },
        ]}
      >
        {usarDesfoque && (
          <BlurView
            blurTarget={modoDoVidro === 'desfoqueAndroid' ? alvo : undefined}
            blurMethod="dimezisBlurViewSdk31Plus"
            intensity={
              modoDoVidro === 'desfoqueAndroid'
                ? INTENSIDADE_ANDROID
                : INTENSIDADE_IOS
            }
            tint={escuro ? 'dark' : 'light'}
            style={StyleSheet.absoluteFill}
          />
        )}
        <View style={[StyleSheet.absoluteFill, { backgroundColor: fundo }]} />
      </View>
      {children}
    </View>
  );
}
