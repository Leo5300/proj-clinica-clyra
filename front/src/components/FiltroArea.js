// Filtro por area em capsulas: "Todas", "● Psicologia", "● Psiquiatria". areas (as que existem nos dados); valor (TODAS ou o nome da area); aoMudar(valor); rotuloTodas (padrao "Todas"); sobreTinta (no plano de tinta); style. O ponto de cor vem sempre com o nome escrito.
import React from 'react';
import { ScrollView, View } from 'react-native';
import Pressionavel from './Pressionavel';
import Texto from './Texto';
import { useTema, espaco, raio, toque, margemTela, corDaArea } from '../theme';
import { vibrarSelecao } from '../services/haptica';

export const TODAS = 'todas';

function Capsula({ rotulo, area, selecionada, aoTocar }) {
  const { cores } = useTema();

  return (
    <Pressionavel
      onPress={() => {
        if (selecionada) return;
        vibrarSelecao();
        aoTocar();
      }}
      accessibilityRole="button"
      accessibilityState={{ selected: selecionada }}
      style={{
        minHeight: toque.minimo - 4,
        paddingHorizontal: 14,
        borderRadius: raio.capsula,
        borderWidth: 1,
        borderColor: selecionada ? cores.selFundo : cores.linha,
        backgroundColor: selecionada ? cores.selFundo : cores.superficie,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 7,
      }}
    >
      {area ? (
        <View
          style={{
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: corDaArea(area, cores),
          }}
        />
      ) : null}
      <Texto variante="rotuloForte" cor={selecionada ? cores.selTexto : cores.tinta}>
        {rotulo}
      </Texto>
    </Pressionavel>
  );
}

export default function FiltroArea({
  areas,
  valor,
  aoMudar,
  rotuloTodas = 'Todas',
  style,
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      accessibilityLabel="Filtrar por área"
      contentContainerStyle={{ gap: espaco.xs, paddingHorizontal: margemTela + 2 }}
      style={[{ marginHorizontal: -(margemTela + 2), flexGrow: 0 }, style]}
    >
      <Capsula rotulo={rotuloTodas} selecionada={valor === TODAS} aoTocar={() => aoMudar(TODAS)} />
      {areas.map((area) => (
        <Capsula
          key={area}
          rotulo={area}
          area={area}
          selecionada={valor === area}
          aoTocar={() => aoMudar(area)}
        />
      ))}
    </ScrollView>
  );
}
