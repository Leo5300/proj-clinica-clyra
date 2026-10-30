// Botao do app. variante: 'solido' | 'contorno' | 'vidro' | 'tinta' (lavanda do "+") | 'inverso' (tinta sobre o destaque) | 'contornoClaro' (sobre o destaque) | 'alerta' | 'texto'; titulo; icone (Feather); carregando; desativado; compacto (44 em vez de 48); style.
import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import Pressionavel from './Pressionavel';
import Vidro, { escalaDoVidro } from './Vidro';
import Texto from './Texto';
import { useTema, raio, toque, espaco } from '../theme';

function aparencia(variante, cores) {
  switch (variante) {
    case 'contorno':
      return { fundo: 'transparent', borda: cores.linhaForte, texto: cores.tinta };
    case 'contornoClaro':
      return { fundo: 'transparent', borda: cores.sobreDestaque, texto: cores.sobreDestaque };
    case 'inverso':
      return { fundo: cores.sobreDestaque, borda: cores.sobreDestaque, texto: cores.sobrePlanoTinta };
    case 'alerta':
      return { fundo: cores.alerta, borda: cores.alerta, texto: cores.sobreAlerta };
    case 'texto':
      return { fundo: 'transparent', borda: 'transparent', texto: cores.link };
    case 'vidro':
      return { texto: cores.tinta };
    case 'tinta':
      return { texto: cores.sobreVidroTinta };
    default:
      return { fundo: cores.acao, borda: cores.acao, texto: cores.sobreAcao };
  }
}

export default function Botao({
  titulo,
  onPress,
  variante = 'solido',
  icone,
  carregando = false,
  desativado = false,
  compacto = false,
  accessibilityLabel,
  style,
}) {
  const { cores } = useTema();
  const visual = aparencia(variante, cores);
  const deVidro = variante === 'vidro' || variante === 'tinta';
  const bloqueado = desativado || carregando;

  const miolo = (
    <View
      style={{
        minHeight: compacto ? toque.minimo : toque.botao,
        paddingHorizontal: variante === 'texto' ? 0 : 20,
        paddingVertical: espaco.xs,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: espaco.xs,
      }}
    >
      {carregando ? (
        <ActivityIndicator color={visual.texto} />
      ) : (
        <>
          {icone ? <Feather name={icone} size={18} color={visual.texto} /> : null}
          {titulo ? (
            <Texto variante="botao" cor={visual.texto} style={{ textAlign: 'center' }}>
              {titulo}
            </Texto>
          ) : null}
        </>
      )}
    </View>
  );

  return (
    <Pressionavel
      onPress={onPress}
      disabled={bloqueado}
      escala={deVidro ? escalaDoVidro : 'toque'}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? titulo}
      accessibilityState={{ disabled: bloqueado, busy: carregando }}
      style={style}
    >
      {deVidro ? (
        <Vidro
          espessura={variante === 'tinta' ? 'tinta' : 'regular'}
          raio={raio.botao}
          interativo
        >
          {miolo}
        </Vidro>
      ) : (
        <View
          style={{
            backgroundColor: visual.fundo,
            borderColor: visual.borda,
            borderWidth: variante === 'texto' ? 0 : 1,
            borderRadius: raio.botao,
            borderCurve: 'continuous',
            // Opacidade so fora do vidro: vidro com pai translucido quebra.
            opacity: desativado ? 0.5 : 1,
          }}
        >
          {miolo}
        </View>
      )}
    </Pressionavel>
  );
}
