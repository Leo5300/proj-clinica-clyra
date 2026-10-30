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
  Numeral,
  PlanoTopo,
  Texto,
  useEspacoDaBarra,
} from '../../components';
import {
  useTema,
  espaco,
  margemTela,
  raio,
  corDaArea,
  topoDoProfissional,
  tomDoAvatar,
} from '../../theme';
import { dataDaConsulta } from '../../services/lembretes';
import { buscarSinaisVitais } from '../../services/api';
import { formatarHorario } from '../../services/datas';
import TopoDaEquipe from './TopoDaEquipe';

// Inicio do profissional: topo lilas (Psicologia) ou menta (Psiquiatria),
// o horario da proxima consulta em numeral grande, o proximo paciente com
// os sinais vitais que existirem e o resto do dia. A agenda vem do
// servidor ja filtrada para o proprio profissional.

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

// "hoje", "ontem", "há 3 dias" -- contando dias de calendario.
function haQuantosDias(data, agora) {
  const inicio = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const dias = Math.round((inicio(agora) - inicio(data)) / (24 * 60 * 60 * 1000));
  if (dias <= 0) return 'hoje';
  if (dias === 1) return 'ontem';
  return `há ${dias} dias`;
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

function ProximoPaciente({ consulta, paciente, numero, area, agora, navigation }) {
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
        <Avatar
          nome={paciente?.nome}
          fotoUri={paciente?.fotoUri}
          tamanho={52}
          tom={tomDoAvatar(area)}
        />
        <View style={{ flex: 1, gap: 2 }}>
          <Texto variante="secao">{paciente?.nome ?? 'Paciente'}</Texto>
          <Texto variante="legenda" cor="apoio">
            {numero === 1 ? 'Primeira consulta com você' : `${numero}ª consulta com você`}
          </Texto>
        </View>
      </View>

      <View
        style={{
          backgroundColor: cores.superficie2,
          borderRadius: raio.campo,
          paddingVertical: espaco.sm,
          paddingHorizontal: espaco.md,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: espaco.sm,
          minHeight: 48,
        }}
      >
        <Texto variante="rotulo" cor="tinta2">
          Último bpm
        </Texto>
        {carregando ? (
          <Esqueleto largura={110} altura={18} raio={5} />
        ) : sinal ? (
          <Texto variante="tituloMedio" tabular selectable>
            {sinal.frequenciaCardiaca} · {haQuantosDias(new Date(sinal.registradoEm), agora)}
          </Texto>
        ) : (
          <Texto variante="legenda" cor="apoio">
            Sem registro ainda
          </Texto>
        )}
      </View>

      <View style={{ gap: 4 }}>
        <Botao
          titulo="Registrar sinais vitais"
          icone="activity"
          onPress={() =>
            navigation.navigate('SinaisVitais', {
              paciente: { id: consulta.pacienteId, nome: paciente?.nome ?? 'Paciente' },
              consultaId: String(consulta.id),
            })
          }
        />
        <Botao
          titulo="Ver consulta"
          variante="texto"
          compacto
          style={{ alignSelf: 'center' }}
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
  medicos,
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

  // O proprio cadastro diz a area: ela escolhe a cor do topo.
  const meuCadastro = medicos?.[String(usuario?.vinculoId)];
  const area = meuCadastro?.area;
  const plano = topoDoProfissional(area, cores);
  const primeiroNome = String(usuario?.nome ?? '').trim().split(/\s+/)[0];

  let corpo;
  if (carregando) {
    corpo = <Carregando />;
  } else if (!ok) {
    corpo = <EstadoErro aoTentar={aoTentar} />;
  } else {
    corpo = (
      <>
        {proxima ? (
          <ProximoPaciente
            consulta={proxima}
            paciente={pacientes[String(proxima.pacienteId)]}
            numero={numeroDa(proxima)}
            area={area}
            agora={agora}
            navigation={navigation}
          />
        ) : deHoje.length === 0 ? (
          <EstadoVazio
            ilustracao
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
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: espaco.sm }}>
                      <Texto
                        variante="secao"
                        cor={passou ? 'apoio' : 'tinta'}
                        tabular
                        style={{ width: 56 }}
                      >
                        {formatarHorario(quando)}
                      </Texto>
                      <View
                        style={{
                          width: 3,
                          height: 36,
                          borderRadius: 2,
                          backgroundColor: corDaArea(area, cores),
                          opacity: passou ? 0.4 : 1,
                        }}
                      />
                    </View>
                  }
                  titulo={pacientes[String(c.pacienteId)]?.nome ?? 'Paciente'}
                  subtitulo={meuCadastro?.especialidade}
                  corDoTitulo={passou ? 'tinta2' : 'tinta'}
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
            contentContainerStyle={{ paddingBottom: espacoDaBarra }}
          >
            <PlanoTopo
              fundo={plano.fundo}
              corTexto={plano.texto}
              style={{
                paddingTop: insets.top + espaco.xs,
                paddingHorizontal: margemTela + 2,
                paddingBottom: espaco.lg,
                gap: espaco.md,
              }}
            >
              <TopoDaEquipe
                usuario={usuario}
                navigation={navigation}
                corTexto={plano.texto}
                rotulo={area ? `Profissional · ${area}` : 'Profissional'}
              />
              {ok ? (
                <View style={{ gap: 2 }}>
                  <Texto variante="tituloGrande" cor={plano.texto} accessibilityRole="header">
                    Olá{primeiroNome ? `, ${primeiroNome}` : ''}
                  </Texto>
                  {proxima ? (
                    <>
                      <Texto variante="rotulo" cor={plano.texto2} style={{ marginTop: espaco.xs }}>
                        Próxima às
                      </Texto>
                      <View
                        accessible
                        accessibilityLabel={`${titulo}, ${faltaPara(dataDaConsulta(proxima), agora)}`}
                        style={{ flexDirection: 'row', alignItems: 'flex-end', flexWrap: 'wrap', gap: espaco.sm }}
                      >
                        <Numeral
                          valor={formatarHorario(dataDaConsulta(proxima))}
                          tamanho={80}
                          cor={plano.texto}
                          numberOfLines={1}
                          adjustsFontSizeToFit
                        />
                        <View
                          style={{
                            backgroundColor: cores.sobrePlano,
                            borderRadius: raio.capsula,
                            paddingHorizontal: 9,
                            paddingVertical: 3,
                            marginBottom: 12,
                          }}
                        >
                          <Texto variante="pequeno" cor={cores.sobrePlanoTinta}>
                            {faltaPara(dataDaConsulta(proxima), agora)}
                          </Texto>
                        </View>
                      </View>
                    </>
                  ) : (
                    <Texto variante="secao" cor={plano.texto2}>
                      {titulo}
                    </Texto>
                  )}
                  {aSeguir.length > 1 ? (
                    <Texto variante="rotulo" cor={plano.texto2}>
                      {`${aSeguir.length} pacientes ainda hoje`}
                    </Texto>
                  ) : null}
                </View>
              ) : null}
            </PlanoTopo>
            <View
              style={{
                paddingTop: espaco.lg,
                paddingHorizontal: margemTela + 2,
                gap: espaco.lg,
              }}
            >
              {corpo}
            </View>
          </Animated.ScrollView>
        }
      >
        <BarraAbas navigation={navigation} atual="Home" />
      </ComVidro>
    </View>
  );
}
