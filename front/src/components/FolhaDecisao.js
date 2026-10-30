// Folha de decisao em vidro espesso sobre um veu. visivel; aoFechar; titulo; texto; children; acaoPrincipal { titulo, onPress, variante, carregando }; acaoSecundaria { titulo, onPress } (padrao: "Voltar", fecha; false esconde).
import React, { useEffect, useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Vidro from './Vidro';
import Texto from './Texto';
import Botao from './Botao';
import { useTema, raio, espaco, margemTela, duracao, curva } from '../theme';

const FORA_DA_TELA = 2000;

// Sobe em 300 ms na curva de folha do iOS, sem quique. Com "reduzir
// movimento", nada desliza: o veu aparece em fade e a folha ja no lugar.
export default function FolhaDecisao({
  visivel,
  aoFechar,
  titulo,
  texto,
  children,
  acaoPrincipal,
  acaoSecundaria,
}) {
  const { movimentoReduzido } = useTema();
  const insets = useSafeAreaInsets();

  // Montada enquanto aparece ou some; desmonta so depois da saida.
  const [montada, setMontada] = useState(visivel);
  const entrou = useRef(false);
  const deslocamento = useSharedValue(FORA_DA_TELA);
  const altura = useSharedValue(0);
  const veu = useSharedValue(0);

  useEffect(() => {
    if (visivel) {
      entrou.current = false;
      setMontada(true);
      return;
    }

    if (!montada) return;

    const fim = { duration: duracao.camada, easing: curva.saida };
    veu.set(withTiming(0, fim));
    deslocamento.set(
      withTiming(movimentoReduzido ? 0 : altura.get(), fim, (terminou) => {
        if (terminou) scheduleOnRN(setMontada, false);
      }),
    );
  }, [visivel]);

  const entrar = (evento) => {
    const medida = evento.nativeEvent.layout.height;
    if (!visivel || entrou.current) return;

    entrou.current = true;
    altura.set(medida);
    const config = { duration: duracao.folha, easing: curva.folha };
    veu.set(withTiming(1, config));

    if (movimentoReduzido) {
      deslocamento.set(0);
    } else {
      deslocamento.set(medida);
      deslocamento.set(withTiming(0, config));
    }
  };

  const estiloVeu = useAnimatedStyle(() => ({ opacity: veu.get() }));
  // A folha nunca anima opacidade: ela e vidro, e vidro com pai
  // translucido quebra no iOS 26.
  const estiloFolha = useAnimatedStyle(() => ({
    transform: [{ translateY: deslocamento.get() }],
  }));

  const fechar = () => aoFechar?.();
  // false esconde a segunda acao (ex.: confirmacao de sucesso).
  const segunda =
    acaoSecundaria === false
      ? null
      : acaoSecundaria ?? { titulo: 'Voltar', onPress: fechar };

  return (
    <Modal
      visible={montada}
      transparent
      animationType="none"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={fechar}
    >
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Animated.View style={[StyleSheet.absoluteFill, estiloVeu]}>
          <VeuDeFundo aoTocar={fechar} />
        </Animated.View>

        <Animated.View onLayout={entrar} style={estiloFolha}>
          <Vidro
            espessura="espesso"
            raio={raio.folha}
            style={{
              marginHorizontal: espaco.xs,
              marginBottom: insets.bottom + espaco.xs,
            }}
          >
            <View
              accessibilityViewIsModal
              style={{ padding: margemTela + 2, gap: espaco.sm }}
            >
              {titulo ? (
                <Texto variante="tituloMedio" accessibilityRole="header">
                  {titulo}
                </Texto>
              ) : null}
              {texto ? (
                <Texto variante="corpo" cor="tinta2">
                  {texto}
                </Texto>
              ) : null}
              {children}
              <View style={{ gap: espaco.xs, marginTop: espaco.xs }}>
                {acaoPrincipal ? (
                  <Botao
                    titulo={acaoPrincipal.titulo}
                    variante={acaoPrincipal.variante ?? 'solido'}
                    carregando={acaoPrincipal.carregando}
                    onPress={acaoPrincipal.onPress}
                  />
                ) : null}
                {segunda ? (
                  <Botao
                    titulo={segunda.titulo}
                    variante="contorno"
                    desativado={acaoPrincipal?.carregando}
                    onPress={segunda.onPress}
                  />
                ) : null}
              </View>
            </View>
          </Vidro>
        </Animated.View>
      </View>
    </Modal>
  );
}

function VeuDeFundo({ aoTocar }) {
  const { cores } = useTema();

  return (
    <Pressable
      style={{ flex: 1, backgroundColor: cores.veu }}
      onPress={aoTocar}
      accessibilityRole="button"
      accessibilityLabel="Fechar"
    />
  );
}
