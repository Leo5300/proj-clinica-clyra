// Tela de lista de cadastro com os tres estados. titulo; subtitulo; navigation; abaAtual (rota, quando a tela e aba: mostra a barra e nao o voltar); acaoNova { rotulo, onPress } (o "+"); topo (plano colorido de largura inteira no lugar do titulo); cabecalhoDaLista (no abaixo do topo: filtro, busca, "Equipe · Novo profissional"); carregando; erro; aoTentar; dados; renderItem; keyExtractor; vazio { titulo, texto, acao }.
import React from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BarraAbas, { useEspacoDaBarra } from './BarraAbas';
import Botao from './Botao';
import Cabecalho from './Cabecalho';
import Esqueleto from './Esqueleto';
import EstadoErro from './EstadoErro';
import EstadoVazio from './EstadoVazio';
import Texto from './Texto';
import { ComVidro } from './Vidro';
import { useRolagem } from './useRolagem';
import { useEntradaDeLista } from './useEntradaDeLista';
import { useTema, espaco, margemTela, toque } from '../theme';

function Carregando() {
  return (
    <View style={{ gap: espaco.sm }} accessibilityState={{ busy: true }}>
      {[0, 1, 2, 3].map((i) => (
        <View key={i} style={{ gap: 6, paddingVertical: espaco.xs }}>
          <Esqueleto largura="60%" altura={16} raio={5} />
          <Esqueleto largura="40%" altura={12} raio={4} />
        </View>
      ))}
    </View>
  );
}

export default function TelaDeLista({
  titulo,
  subtitulo,
  navigation,
  abaAtual,
  acaoNova,
  topo,
  cabecalhoDaLista,
  carregando,
  erro,
  aoTentar,
  dados,
  renderItem,
  keyExtractor,
  vazio,
}) {
  const { cores } = useTema();
  const insets = useSafeAreaInsets();
  const espacoDaBarra = useEspacoDaBarra();
  const { aoRolar, rolou } = useRolagem(50);
  const entrada = useEntradaDeLista(`lista-${titulo}`, !carregando && !erro);
  const comoAba = Boolean(abaAtual);

  const maisNovo = acaoNova ? (
    // Tinta, nao vidro: o "+" e quase opaco e nao gasta desfoque.
    <Botao
      variante="tinta"
      icone="plus"
      compacto
      accessibilityLabel={acaoNova.rotulo}
      onPress={acaoNova.onPress}
    />
  ) : null;

  const cabecalho = topo ? (
    <View style={{ marginBottom: espaco.xs }}>
      <View style={{ marginHorizontal: -(margemTela + 2) }}>{topo}</View>
      {cabecalhoDaLista ? (
        <View style={{ paddingTop: espaco.md, gap: espaco.md }}>{cabecalhoDaLista}</View>
      ) : null}
    </View>
  ) : (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: espaco.sm,
        marginBottom: espaco.md,
      }}
    >
      <View style={{ flex: 1, gap: 4 }}>
        <Texto variante="tituloGrande" accessibilityRole="header">
          {titulo}
        </Texto>
        {subtitulo ? (
          <Texto variante="rotulo" cor="apoio">
            {subtitulo}
          </Texto>
        ) : null}
      </View>
      {comoAba ? maisNovo : null}
    </View>
  );

  let estado = null;
  if (carregando) estado = <Carregando />;
  else if (erro) estado = <EstadoErro texto={erro} aoTentar={aoTentar} />;
  else if (vazio) estado = <EstadoVazio {...vazio} />;

  return (
    <View style={{ flex: 1, backgroundColor: cores.papel }}>
      <ComVidro
        conteudo={
          <Animated.FlatList
            data={carregando || erro ? [] : dados}
            keyExtractor={keyExtractor}
            renderItem={(info) => (
              <Animated.View entering={entrada(info.index)}>{renderItem(info)}</Animated.View>
            )}
            onScroll={aoRolar}
            scrollEventThrottle={16}
            ListHeaderComponent={cabecalho}
            ListEmptyComponent={estado}
            contentContainerStyle={{
              paddingTop: topo
                ? 0
                : insets.top + espaco.xs + (comoAba ? 0 : toque.minimo + espaco.xs) + espaco.md,
              paddingHorizontal: margemTela + 2,
              paddingBottom: comoAba ? espacoDaBarra : insets.bottom + espaco.xl,
            }}
          />
        }
      >
        {comoAba ? (
          <BarraAbas navigation={navigation} atual={abaAtual} />
        ) : (
          <Cabecalho
            flutuante
            titulo={titulo}
            rolou={rolou}
            aoVoltar={() => navigation.goBack()}
            direita={topo ? null : maisNovo}
          />
        )}
      </ComVidro>
    </View>
  );
}
