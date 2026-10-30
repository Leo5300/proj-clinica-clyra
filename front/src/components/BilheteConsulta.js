// Bilhete da consulta: a data em destaque, que se sobrepoe a borda do topo no Detalhe. dia; mes ("nov"); diaDaSemana ("ter"); horario ("14:30 – 15:00"); detalhe ("30 min · presencial"); area; plano (opcional: faixa na cor do perfil, como o verde do paciente; sem ele, a cor da area); aoComoChegar (mostra o link); style.
//
// Faixa de 112 na cor da area com o numeral, picote tracejado com dois
// entalhes na cor do papel e, a direita, horario e detalhes.
import React from 'react';
import { View } from 'react-native';
import Svg, { Line } from 'react-native-svg';
import Numeral from './Numeral';
import Texto from './Texto';
import Botao from './Botao';
import { useTema, espaco, planoDaArea } from '../theme';

const RAIO = 22;
const FAIXA = 112;
const ENTALHE = 22;

export default function BilheteConsulta({
  dia,
  mes,
  diaDaSemana,
  horario,
  detalhe,
  area,
  plano: planoDoPerfil,
  aoComoChegar,
  style,
}) {
  const { cores, sombras } = useTema();
  const plano = planoDoPerfil ?? planoDaArea(area, cores);

  const entalhe = {
    position: 'absolute',
    left: FAIXA - ENTALHE / 2,
    width: ENTALHE,
    height: ENTALHE,
    borderRadius: ENTALHE / 2,
    backgroundColor: cores.papel,
    borderWidth: 1,
    borderColor: cores.linha,
  };

  return (
    <View style={[{ borderRadius: RAIO, boxShadow: sombras.flutuante }, style]}>
      <View
        style={{
          flexDirection: 'row',
          borderRadius: RAIO,
          borderCurve: 'continuous',
          overflow: 'hidden',
          backgroundColor: cores.superficie,
        }}
      >
        <View
          accessible
          accessibilityLabel={`Dia ${dia} de ${mes}, ${diaDaSemana}`}
          style={{
            width: FAIXA,
            minHeight: 128,
            backgroundColor: plano.fundo,
            alignItems: 'center',
            justifyContent: 'center',
            paddingVertical: espaco.md,
          }}
        >
          <Numeral valor={dia} tamanho={72} cor={plano.texto} />
          <Texto variante="rotuloForte" cor={plano.texto} maxFontSizeMultiplier={1.3}>
            {mes} · {diaDaSemana}
          </Texto>
        </View>

        <View
          style={{
            flex: 1,
            justifyContent: 'center',
            gap: 2,
            paddingVertical: espaco.md,
            paddingLeft: espaco.md + 4,
            paddingRight: espaco.md,
          }}
        >
          <Texto variante="tituloMedio" tabular>
            {horario}
          </Texto>
          {detalhe ? (
            <Texto variante="legenda" cor="tinta2">
              {detalhe}
            </Texto>
          ) : null}
          {aoComoChegar ? (
            <Botao
              variante="texto"
              compacto
              titulo="Como chegar"
              onPress={aoComoChegar}
              style={{ alignSelf: 'flex-start' }}
            />
          ) : null}
        </View>
      </View>

      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: FAIXA - 1,
          top: ENTALHE / 2 + 4,
          bottom: ENTALHE / 2 + 4,
          width: 2,
        }}
      >
        <Svg width={2} height="100%">
          <Line
            x1="1"
            y1="0"
            x2="1"
            y2="100%"
            stroke={cores.linhaForte}
            strokeWidth={2}
            strokeDasharray="5 5"
          />
        </Svg>
      </View>
      <View pointerEvents="none" style={[entalhe, { top: -ENTALHE / 2 }]} />
      <View pointerEvents="none" style={[entalhe, { bottom: -ENTALHE / 2 }]} />
    </View>
  );
}
