import React, { useEffect, useState } from 'react';
import { RefreshControl, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Avatar,
  BarraAbas,
  Botao,
  ComVidro,
  Esqueleto,
  EstadoErro,
  EstadoVazio,
  ItemDeLista,
  Selo,
  Texto,
  useEspacoDaBarra,
} from '../../components';
import { useTema, espaco, margemTela, raio } from '../../theme';
import { dataDaConsulta } from '../../services/lembretes';
import { buscarSinaisVitais } from '../../services/api';
import {
  formatarDataPorExtenso,
  formatarHorario,
  formatarDiaEMes,
} from '../../services/datas';
import TopoDaEquipe from './TopoDaEquipe';

// Inicio do medico, com acento lavanda: o proximo paciente com os sinais
// vitais que existirem e o resto do dia. A agenda vem do servidor ja
// filtrada para o proprio medico.

function mesmoDia(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

// "em 48 min", "em 2 h"
function faltaPara(data, agora) {
  const minutos = Math.max(0, Math.round((data - agora) / 60000));
  if (minutos < 60) return `em ${minutos} min`;
  return `em ${Math.round(minutos / 60)} h`;
}

// Ultimo registro de sinais vitais do paciente, se houver. Falhar aqui
// nao derruba a tela: o cartao so diz que nao ha registro.
function useUltimoSinal(pacienteId) {
  const [estado, setEstado] = useState({ carregando: true, sinal: null });

  useEffect(() => {
    if (!pacienteId) {
      setEstado({ carregando: false, sinal: null });
      return undefined;
    }

    let ativo = true;
    setEstado({ carregando: true, sinal: null });

    buscarSinaisVitais({ pacienteId })
      .then((sinais) => {
        const ultimo = [...sinais].sort(
          (a, b) => new Date(b.registradoEm) - new Date(a.registradoEm),
        )[0];
        if (ativo) setEstado({ carregando: false, sinal: ultimo ?? null });
      })
      .catch(() => {
        if (ativo) setEstado({ carregando: false, sinal: null });
      });

    return () => {
      ativo = false;
    };
  }, [pacienteId]);

  return estado;
}

function ProximoPaciente({ consulta, paciente, numero, agora, navigation }) {
  const { cores } = useTema();
  const quando = dataDaConsulta(consulta);
  const { carregando, sinal } = useUltimoSinal(consulta.pacienteId);

  return (
    <View
      accessibilityLabel="Próximo paciente"
      style={{
        backgroundColor: cores.superficie,
        borderColor: cores.linha,
        borderWidth: 1,
        borderRadius: raio.cartaoGrande,
        borderCurve: 'continuous',
        padding: espaco.md + 2,
        gap: espaco.md,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: espaco.sm }}>
        <Avatar nome={paciente?.nome} fotoUri={paciente?.fotoUri} tamanho={52} />
        <View style={{ flex: 1, gap: 2 }}>
          <Texto variante="secao">{paciente?.nome ?? 'Paciente'}</Texto>
          <Texto variante="legenda" cor="apoio">
            {numero === 1 ? 'Primeira consulta' : `${numero}ª consulta`}
          </Texto>
        </View>
        <Selo texto={faltaPara(quando, agora)} tom="lavanda" icone="clock" />
      </View>

      <View
        style={{
          backgroundColor: cores.superficie2,
          borderRadius: raio.campo,
          padding: espaco.sm,
          gap: 2,
        }}
      >
        {carregando ? (
          <Esqueleto largura={160} altura={18} raio={5} />
        ) : sinal ? (
          <>
            <Texto variante="legenda" cor="apoio">
              Frequência cardíaca
            </Texto>
            <Texto variante="tituloMedio" tabular selectable>
              {sinal.frequenciaCardiaca} bpm
            </Texto>
            <Texto variante="legenda" cor="apoio" tabular>
              Medido em {formatarDiaEMes(new Date(sinal.registradoEm))}
            </Texto>
          </>
        ) : (
          <Texto variante="legenda" cor="apoio">
            Sem registro de sinais vitais ainda.
          </Texto>
        )}
      </View>

      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Botao
          titulo="Registrar sinais"
          icone="activity"
          style={{ flex: 1 }}
          onPress={() =>
            navigation.navigate('SinaisVitais', {
              paciente: { id: consulta.pacienteId, nome: paciente?.nome ?? 'Paciente' },
              consultaId: String(consulta.id),
            })
          }
        />
        <Botao
          titulo="Ver consulta"
          variante="contorno"
          style={{ flex: 1 }}
          onPress={() =>
            navigation.navigate('DetalheConsulta', { consultaId: String(consulta.id) })
          }
        />
      </View>
    </View>
  );
}

function Carregando() {
  return (
    <View style={{ gap: 14 }} accessibilityState={{ busy: true }}>
      <Esqueleto largura={220} altura={16} raio={5} />
      <Esqueleto largura={200} altura={30} raio={8} />
      <Esqueleto altura={200} raio={raio.cartaoGrande} />
      <Esqueleto altura={52} raio={10} />
      <Esqueleto altura={52} raio={10} />
    </View>
  );
}

export default function HomeMedico({
  navigation,
  usuario,
  consultas,
  pacientes,
  carregando,
  erro,
  atualizando,
  aoAtualizar,
  aoTentar,
}) {
  const { cores } = useTema();
  const insets = useSafeAreaInsets();
  const espacoDaBarra = useEspacoDaBarra();

  const agora = new Date();
  const ordenadas = [...consultas].sort(
    (a, b) => dataDaConsulta(a) - dataDaConsulta(b),
  );
  const deHoje = ordenadas.filter((c) => mesmoDia(dataDaConsulta(c), agora));
  const aSeguir = deHoje.filter((c) => dataDaConsulta(c) > agora);
  const proxima = aSeguir[0];
  const restante = deHoje.filter((c) => c !== proxima);

  // Quantas consultas este paciente ja teve com o medico, contando a
  // proxima: "3ª consulta".
  const numeroDa = (consulta) =>
    ordenadas.filter(
      (c) =>
        String(c.pacienteId) === String(consulta.pacienteId) &&
        dataDaConsulta(c) <= dataDaConsulta(consulta),
    ).length;

  let titulo = 'Nenhuma consulta hoje';
  if (proxima) titulo = `Próxima às ${formatarHorario(dataDaConsulta(proxima))}`;
  else if (deHoje.length > 0) titulo = 'Sem mais consultas hoje';

  const ok = !carregando && usuario && !(erro && consultas.length === 0);

  let corpo;
  if (carregando) {
    corpo = <Carregando />;
  } else if (!ok) {
    corpo = <EstadoErro aoTentar={aoTentar} />;
  } else {
    corpo = (
      <>
        <View style={{ gap: 2 }}>
          <Texto variante="rotulo" cor="sobreLavandaSuave">
            {formatarDataPorExtenso(agora)}
          </Texto>
          <Texto variante="titulo" accessibilityRole="header">
            {titulo}
          </Texto>
          {aSeguir.length > 0 ? (
            <Texto variante="rotulo" cor="apoio">
              {aSeguir.length === 1
                ? '1 paciente ainda hoje'
                : `${aSeguir.length} pacientes ainda hoje`}
            </Texto>
          ) : null}
        </View>

        {proxima ? (
          <ProximoPaciente
            consulta={proxima}
            paciente={pacientes[String(proxima.pacienteId)]}
            numero={numeroDa(proxima)}
            agora={agora}
            navigation={navigation}
          />
        ) : deHoje.length === 0 ? (
          <EstadoVazio
            titulo="Agenda livre hoje"
            texto="Suas próximas consultas aparecem na agenda completa."
            acao={{ titulo: 'Ver agenda completa', onPress: () => navigation.navigate('Consultas') }}
          />
        ) : null}

        {restante.length > 0 ? (
          <View style={{ gap: 2 }}>
            <Texto variante="secao" accessibilityRole="header">
              Restante do dia
            </Texto>
            {restante.map((c, indice) => {
              const quando = dataDaConsulta(c);
              const passou = quando <= agora;
              return (
                <ItemDeLista
                  key={String(c.id)}
                  esquerda={
                    <Texto
                      variante="corpoForte"
                      cor={passou ? 'apoio' : 'tinta'}
                      tabular
                      style={{ width: 56 }}
                    >
                      {formatarHorario(quando)}
                    </Texto>
                  }
                  titulo={pacientes[String(c.pacienteId)]?.nome ?? 'Paciente'}
                  corDoTitulo={passou ? 'tinta2' : 'tinta'}
                  direita={passou ? null : <Selo texto="Agendada" tom="neutro" />}
                  divisor={indice < restante.length - 1}
                  onPress={() =>
                    navigation.navigate('DetalheConsulta', { consultaId: String(c.id) })
                  }
                />
              );
            })}
          </View>
        ) : null}

        {deHoje.length > 0 ? (
          <Botao
            variante="texto"
            compacto
            titulo="Ver agenda completa"
            onPress={() => navigation.navigate('Consultas')}
            style={{ alignSelf: 'flex-start' }}
          />
        ) : null}
      </>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: cores.papel }}>
      <ComVidro
        conteudo={
          <Animated.ScrollView
            refreshControl={
              <RefreshControl
                refreshing={atualizando}
                onRefresh={aoAtualizar}
                tintColor={cores.lavanda}
                progressViewOffset={insets.top}
              />
            }
            contentContainerStyle={{
              paddingTop: insets.top + espaco.xs,
              paddingHorizontal: margemTela + 2,
              paddingBottom: espacoDaBarra,
              gap: espaco.lg,
            }}
          >
            <TopoDaEquipe usuario={usuario} navigation={navigation} />
            {corpo}
          </Animated.ScrollView>
        }
      >
        <BarraAbas navigation={navigation} atual="Home" />
      </ComVidro>
    </View>
  );
}
