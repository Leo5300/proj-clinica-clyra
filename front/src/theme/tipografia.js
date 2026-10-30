// src/theme/tipografia.js
//
// Fontes e estilos de texto. Cada peso e um arquivo de fonte proprio,
// por isso o peso vai no fontFamily e nunca em fontWeight (senao o
// sistema "engorda" a letra ou troca pela fonte padrao).
//
// Bricolage Grotesque 600: titulos. Bricolage 800: o numeral grande
// (components/Numeral). Figtree: todo o resto.
// Montserrat: so o logotipo. Cada peso e importado pelo caminho proprio
// para o app levar so os arquivos que usa.

import { BricolageGrotesque_600SemiBold } from '@expo-google-fonts/bricolage-grotesque/600SemiBold';
import { BricolageGrotesque_800ExtraBold } from '@expo-google-fonts/bricolage-grotesque/800ExtraBold';
import { Figtree_400Regular } from '@expo-google-fonts/figtree/400Regular';
import { Figtree_500Medium } from '@expo-google-fonts/figtree/500Medium';
import { Figtree_600SemiBold } from '@expo-google-fonts/figtree/600SemiBold';
import { Figtree_700Bold } from '@expo-google-fonts/figtree/700Bold';
import { Montserrat_500Medium } from '@expo-google-fonts/montserrat/500Medium';
import { Montserrat_600SemiBold } from '@expo-google-fonts/montserrat/600SemiBold';

// Mapa entregue ao useFonts no AppNavigator.
export const arquivosDeFonte = {
  BricolageGrotesque_600SemiBold,
  BricolageGrotesque_800ExtraBold,
  Figtree_400Regular,
  Figtree_500Medium,
  Figtree_600SemiBold,
  Figtree_700Bold,
  Montserrat_500Medium,
  Montserrat_600SemiBold,
};

export const fontes = {
  titulo: 'BricolageGrotesque_600SemiBold',
  numeral: 'BricolageGrotesque_800ExtraBold',
  texto: 'Figtree_400Regular',
  textoMedio: 'Figtree_500Medium',
  textoSemi: 'Figtree_600SemiBold',
  textoForte: 'Figtree_700Bold',
  marca: 'Montserrat_600SemiBold',
  assinatura: 'Montserrat_500Medium',
};

// Rampa de texto. Tracking negativo so nos titulos grandes.
export const estilosDeTexto = {
  dataGrande: { fontFamily: fontes.titulo, fontSize: 96, lineHeight: 96, letterSpacing: -3 },
  tituloGrande: { fontFamily: fontes.titulo, fontSize: 32, lineHeight: 38, letterSpacing: -0.6 },
  titulo: { fontFamily: fontes.titulo, fontSize: 26, lineHeight: 32, letterSpacing: -0.4 },
  tituloMedio: { fontFamily: fontes.titulo, fontSize: 22, lineHeight: 28, letterSpacing: -0.2 },
  secao: { fontFamily: fontes.textoSemi, fontSize: 17, lineHeight: 24 },
  corpo: { fontFamily: fontes.texto, fontSize: 16, lineHeight: 24 },
  corpoForte: { fontFamily: fontes.textoSemi, fontSize: 16, lineHeight: 22 },
  rotulo: { fontFamily: fontes.textoMedio, fontSize: 14, lineHeight: 20 },
  rotuloForte: { fontFamily: fontes.textoForte, fontSize: 14, lineHeight: 20 },
  legenda: { fontFamily: fontes.texto, fontSize: 13, lineHeight: 18 },
  legendaForte: { fontFamily: fontes.textoSemi, fontSize: 13, lineHeight: 18 },
  pequeno: { fontFamily: fontes.textoSemi, fontSize: 12, lineHeight: 16 },
  botao: { fontFamily: fontes.textoForte, fontSize: 15, lineHeight: 20 },
};

// Numeros de data, hora e sinais vitais nao "dancam" de largura.
export const numerosTabulares = { fontVariant: ['tabular-nums'] };
