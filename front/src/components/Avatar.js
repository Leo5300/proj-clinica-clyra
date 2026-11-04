// Foto ou iniciais de uma pessoa. nome; fotoUri; tamanho (padrao 44); tom: 'lavanda' (padrao) | 'neutro' | 'vidro' (sobre o destaque) | 'psicologia' | 'psiquiatria' (cor cheia da area) | 'verde' (verde suave, no perfil Paciente); style.
import React from 'react';
import { Image, View } from 'react-native';
import Texto from './Texto';
import { useTema } from '../theme';

export function iniciais(nome) {
  const partes = String(nome ?? '')
    .replace(/^(dra?\.)\s+/i, '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (partes.length === 0) return '?';

  const primeira = partes[0][0];
  const ultima = partes.length > 1 ? partes[partes.length - 1][0] : '';
  return `${primeira}${ultima}`.toUpperCase();
}

function coresDoTom(tom, cores) {
  if (tom === 'neutro') return { fundo: cores.neutroSuave, texto: cores.sobreNeutro };
  if (tom === 'vidro') return { fundo: cores.vidroClaro, texto: cores.sobreDestaque };
  if (tom === 'verde') return { fundo: cores.verdeSuave, texto: cores.sobreVerdeSuave };
  if (tom === 'psicologia') return { fundo: cores.lavanda, texto: cores.sobrePlano };
  if (tom === 'psiquiatria') return { fundo: cores.planoVerde, texto: cores.sobrePlanoVerde };
  return { fundo: cores.lavandaSuave, texto: cores.sobreLavandaSuave };
}

export default function Avatar({ nome, fotoUri, tamanho = 44, tom = 'lavanda', style }) {
  const { cores } = useTema();
  const forma = { width: tamanho, height: tamanho, borderRadius: tamanho / 2 };

  if (fotoUri) {
    return (
      <Image
        source={{ uri: fotoUri }}
        style={[forma, style]}
        accessibilityIgnoresInvertColors
      />
    );
  }

  const visual = coresDoTom(tom, cores);

  return (
    <View
      style={[
        forma,
        { backgroundColor: visual.fundo, alignItems: 'center', justifyContent: 'center' },
        style,
      ]}
    >
      <Texto
        variante="rotuloForte"
        cor={visual.texto}
        maxFontSizeMultiplier={1.2}
        style={{ fontSize: Math.round(tamanho * 0.34), lineHeight: Math.round(tamanho * 0.42) }}
      >
        {iniciais(nome)}
      </Texto>
    </View>
  );
}
