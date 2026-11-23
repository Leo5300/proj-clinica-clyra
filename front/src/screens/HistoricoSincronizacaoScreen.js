import React, { useCallback, useState } from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { lerHistorico } from '../services/sincronizacao';
import { formatarDiaEHora } from '../services/datas';
import {
  Cabecalho,
  ComVidro,
  EstadoVazio,
  ItemDeLista,
  Selo,
  Texto,
  useRolagem,
} from '../components';
import { useTema, espaco, margemTela, raio, toque } from '../theme';

// Historico das ultimas sincronizacoes: e como se descobre o que a tarefa em
// segundo plano fez SEM console nem computador ligado. Cada tentativa mostra
// quando foi, quem pediu (manual, voltou ao app ou background) e como acabou.

function descricaoDoRegistro(registro) {
  if (!registro.ok) {
    return `Falhou: ${registro.erro ?? 'motivo não registrado'}`;
  }

  return `${registro.consultas} consultas · ${registro.conflitos} conflitos · ${registro.duracaoMs} ms`;
}

export default function HistoricoSincronizacaoScreen({ navigation }) {
  const { cores } = useTema();
  const insets = useSafeAreaInsets();
  const { aoRolar, rolou } = useRolagem(50);
  // null = ainda lendo.
  const [registros, setRegistros] = useState(null);

  // A cada vez que a tela ganha o foco: a tarefa pode ter rodado enquanto a
  // pessoa estava em outra tela ou fora do app.
  useFocusEffect(
    useCallback(() => {
      let ativo = true;

      lerHistorico().then((lista) => {
        if (ativo) setRegistros(lista);
      });

      return () => {
        ativo = false;
      };
    }, []),
  );

  return (
    <View style={{ flex: 1, backgroundColor: cores.papel }}>
      <ComVidro
        conteudo={
          <Animated.ScrollView
            onScroll={aoRolar}
            scrollEventThrottle={16}
            contentContainerStyle={{
              paddingTop: insets.top + espaco.xs + toque.minimo + espaco.lg,
              paddingHorizontal: margemTela + 2,
              paddingBottom: insets.bottom + espaco.xl,
              gap: espaco.lg,
            }}
          >
            <View style={{ gap: 4 }}>
              <Texto variante="tituloGrande" accessibilityRole="header">
                Histórico
              </Texto>
              <Texto variante="rotulo" cor="apoio">
                As 20 sincronizações mais recentes deste aparelho.
              </Texto>
            </View>

            {registros && registros.length === 0 ? (
              <EstadoVazio
                titulo="Nada sincronizado ainda"
                texto="Quando a agenda for sincronizada, cada tentativa aparece aqui: quando foi, quem pediu e como terminou."
              />
            ) : null}

            {registros && registros.length > 0 ? (
              <View
                style={{
                  backgroundColor: cores.superficie,
                  borderColor: cores.linha,
                  borderWidth: 1,
                  borderRadius: raio.cartao,
                  borderCurve: 'continuous',
                  paddingHorizontal: espaco.md,
                }}
              >
                {registros.map((registro, indice) => (
                  <ItemDeLista
                    key={`${registro.quando}-${indice}`}
                    titulo={`${formatarDiaEHora(new Date(registro.quando))} · ${registro.origem}`}
                    subtitulo={descricaoDoRegistro(registro)}
                    direita={
                      <Selo
                        texto={registro.ok ? 'ok' : 'falhou'}
                        tom={registro.ok ? 'papel' : 'alerta'}
                      />
                    }
                    divisor={indice < registros.length - 1}
                    tabular
                  />
                ))}
              </View>
            ) : null}
          </Animated.ScrollView>
        }
      >
        <Cabecalho
          flutuante
          titulo="Histórico"
          rolou={rolou}
          aoVoltar={() => navigation.goBack()}
        />
      </ComVidro>
    </View>
  );
}
