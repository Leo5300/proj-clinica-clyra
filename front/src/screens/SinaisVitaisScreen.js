import React, { useState, useEffect, useRef } from 'react';
import { ActivityIndicator, ScrollView, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { criarServicoBle, MODO_SIMULADO } from '../services/bluetooth';
import {
  registrarSinaisVitais,
  SessaoExpirada,
  SemPermissao,
  ErroDaApi,
} from '../services/api';
import { useUsuario } from '../services/sessao';
import {
  Botao,
  Cabecalho,
  Campo,
  ItemDeLista,
  Selo,
  SeloSucesso,
  Tela,
  Texto,
} from '../components';
import { useTema, espaco, margemTela, raio, curva } from '../theme';
import { vibrarSucesso } from '../services/haptica';

// Registro de sinais vitais: procurar o monitor, conectar, acompanhar o
// bpm ao vivo e importar a media para o prontuario -- ou digitar o valor.
// Quem pode registrar e para quem e decidido pelo servidor.
//
// Leituras ficam so na memoria da tela: dado de saude nao e gravado no
// aparelho nem impresso em log.

// Quanto tempo a busca fica ativa antes de parar sozinha.
const DURACAO_BUSCA_MS = 8000;

// Sem leitura por mais que isso, a tela avisa que o sinal caiu.
const LIMITE_SEM_LEITURA_MS = 5000;

// Janela de leituras usada na media.
const MAX_LEITURAS = 30;

// Faixa aceita na digitacao manual (o servidor aceita de 20 a 250).
const BPM_MINIMO = 30;
const BPM_MAXIMO = 220;

function Cartao({ children, style }) {
  const { cores } = useTema();

  return (
    <View
      style={[
        {
          backgroundColor: cores.superficie,
          borderColor: cores.linha,
          borderWidth: 1,
          borderRadius: raio.cartaoGrande,
          borderCurve: 'continuous',
          padding: espaco.md + 2,
          gap: espaco.sm,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

// Numero ao vivo com um pulso discreto a cada leitura nova. Com "reduzir
// movimento", so o numero muda.
function BpmAoVivo({ valor, leituras, apagado }) {
  const { movimentoReduzido } = useTema();
  const escala = useSharedValue(1);

  useEffect(() => {
    if (movimentoReduzido || leituras === 0) return;
    escala.set(
      withSequence(
        withTiming(1.05, { duration: 120, easing: curva.saida }),
        withTiming(1, { duration: 240, easing: curva.saida }),
      ),
    );
  }, [leituras]);

  const estilo = useAnimatedStyle(() => ({ transform: [{ scale: escala.get() }] }));

  return (
    <View style={{ alignItems: 'center' }} accessibilityLiveRegion="polite">
      <Animated.View style={estilo}>
        <Texto
          variante="dataGrande"
          cor={apagado ? 'desativado' : 'tinta'}
          tabular
          maxFontSizeMultiplier={1.2}
        >
          {valor ?? '--'}
        </Texto>
      </Animated.View>
      <Texto variante="rotuloForte" cor="apoio">
        bpm
      </Texto>
    </View>
  );
}

export default function SinaisVitaisScreen({ navigation, route }) {
  const paciente = route.params?.paciente;
  const consultaId = route.params?.consultaId ?? null;

  const { usuario } = useUsuario();
  const { cores } = useTema();
  const insets = useSafeAreaInsets();
  const ehPaciente = usuario?.perfil === 'paciente';

  const servicoRef = useRef(null);
  const timerBuscaRef = useRef(null);

  const [procurando, setProcurando] = useState(false);
  const [buscaConcluida, setBuscaConcluida] = useState(false);
  const [aparelhos, setAparelhos] = useState([]);
  const [conectando, setConectando] = useState(null);
  const [conectado, setConectado] = useState(null);
  const [leituras, setLeituras] = useState([]);
  const [ultimaLeituraEm, setUltimaLeituraEm] = useState(null);
  const [agora, setAgora] = useState(Date.now());
  const [erro, setErro] = useState(null);
  const [importando, setImportando] = useState(false);
  const [modoManual, setModoManual] = useState(false);
  const [bpmManual, setBpmManual] = useState('');
  const [erroManual, setErroManual] = useState(null);
  // { bpm, quantidade } depois de salvar.
  const [salvo, setSalvo] = useState(null);

  useEffect(() => {
    servicoRef.current = criarServicoBle();

    // Sair da tela nunca deixa busca rodando nem aparelho conectado.
    return () => {
      clearTimeout(timerBuscaRef.current);
      servicoRef.current?.pararBusca();
      servicoRef.current?.desconectar();
    };
  }, []);

  // Relogio de 1 s enquanto conectado: e o que percebe o sinal caindo.
  useEffect(() => {
    if (!conectado) return undefined;

    const id = setInterval(() => setAgora(Date.now()), 1000);
    return () => clearInterval(id);
  }, [conectado]);

  const encerrarBusca = () => {
    clearTimeout(timerBuscaRef.current);
    servicoRef.current?.pararBusca();
    setProcurando(false);
    setBuscaConcluida(true);
  };

  const procurar = async () => {
    setErro(null);
    setAparelhos([]);
    setBuscaConcluida(false);
    setProcurando(true);

    try {
      await servicoRef.current.procurar(
        (aparelho) => {
          setAparelhos((atuais) =>
            atuais.some((a) => a.id === aparelho.id)
              ? atuais
              : [...atuais, aparelho],
          );
        },
        () => {
          encerrarBusca();
          setErro(
            'A busca por aparelhos falhou. Confira se o Bluetooth do celular está ligado e tente de novo.',
          );
        },
      );
    } catch (e) {
      setProcurando(false);

      if (e.name === 'PermissaoBluetoothNegada') {
        setErro(
          'Sem permissão de Bluetooth o app não consegue procurar o monitor. Libere a permissão nos ajustes do aparelho ou digite o valor manualmente.',
        );
      } else {
        setErro(
          'Não foi possível iniciar a busca. Confira se o Bluetooth do celular está ligado.',
        );
      }
      return;
    }

    timerBuscaRef.current = setTimeout(encerrarBusca, DURACAO_BUSCA_MS);
  };

  const conectar = async (aparelho) => {
    clearTimeout(timerBuscaRef.current);
    servicoRef.current.pararBusca();
    setProcurando(false);

    setErro(null);
    setConectando(aparelho);

    try {
      await servicoRef.current.conectar(aparelho.id);

      setLeituras([]);
      setUltimaLeituraEm(Date.now());
      setAgora(Date.now());
      setConectado(aparelho);

      servicoRef.current.monitorarFrequencia((bpm) => {
        setLeituras((anteriores) => [
          ...anteriores.slice(-(MAX_LEITURAS - 1)),
          bpm,
        ]);
        setUltimaLeituraEm(Date.now());
      });
    } catch (e) {
      setErro(
        `Não foi possível conectar ao ${aparelho.nome}. Confira se ele está ligado e perto do celular e tente de novo — ou digite o valor manualmente.`,
      );
    } finally {
      setConectando(null);
    }
  };

  const desconectar = async () => {
    await servicoRef.current?.desconectar();
    setConectado(null);
    setLeituras([]);
    setUltimaLeituraEm(null);
  };

  const salvar = async (registro) => {
    setImportando(true);
    setErro(null);

    try {
      await registrarSinaisVitais(registro);

      await servicoRef.current?.desconectar();
      setConectado(null);

      vibrarSucesso();
      setSalvo({
        bpm: registro.frequenciaCardiaca,
        quantidade: registro.quantidadeLeituras,
      });
    } catch (e) {
      if (e instanceof SessaoExpirada) {
        navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
        return;
      }

      if (e instanceof SemPermissao || (e instanceof ErroDaApi && e.mensagem)) {
        setErro(e.mensagem ?? 'Você não tem permissão para isso.');
        return;
      }

      setErro(
        'Não foi possível registrar no prontuário agora. Os valores continuam na tela — tente de novo.',
      );
    } finally {
      setImportando(false);
    }
  };

  const media = leituras.length
    ? Math.round(
        leituras.reduce((soma, valor) => soma + valor, 0) / leituras.length,
      )
    : null;

  const ultimaLeitura = leituras.length
    ? leituras[leituras.length - 1]
    : null;

  const segundosSemLeitura = ultimaLeituraEm
    ? Math.floor((agora - ultimaLeituraEm) / 1000)
    : 0;

  const sinalPerdido =
    Boolean(conectado) &&
    Boolean(ultimaLeituraEm) &&
    agora - ultimaLeituraEm > LIMITE_SEM_LEITURA_MS;

  const importarLeituras = () => {
    salvar({
      pacienteId: paciente.id,
      consultaId,
      frequenciaCardiaca: media,
      quantidadeLeituras: leituras.length,
      origem: 'bluetooth',
      aparelho: conectado.nome,
      registradoEm: new Date().toISOString(),
    });
  };

  const importarManual = () => {
    const valor = Number(bpmManual.replace(',', '.'));

    if (!Number.isInteger(valor) || valor < BPM_MINIMO || valor > BPM_MAXIMO) {
      setErroManual(
        `Informe a frequência cardíaca em bpm, entre ${BPM_MINIMO} e ${BPM_MAXIMO}.`,
      );
      return;
    }

    setErroManual(null);
    salvar({
      pacienteId: paciente.id,
      consultaId,
      frequenciaCardiaca: valor,
      quantidadeLeituras: 1,
      origem: 'manual',
      aparelho: null,
      registradoEm: new Date().toISOString(),
    });
  };

  const irParaManual = () => {
    clearTimeout(timerBuscaRef.current);
    servicoRef.current?.pararBusca();
    setProcurando(false);
    setModoManual(true);
  };

  const renderConteudo = () => {
    if (salvo) {
      return (
        <Cartao style={{ alignItems: 'center', paddingVertical: espaco.xl }}>
          <SeloSucesso
            titulo="Salvo no prontuário"
            texto={
              salvo.quantidade > 1
                ? `${salvo.bpm} bpm, média de ${salvo.quantidade} leituras.`
                : `${salvo.bpm} bpm.`
            }
          />
          <Botao
            titulo="Voltar"
            onPress={() => navigation.goBack()}
            style={{ alignSelf: 'stretch', marginTop: espaco.xs }}
          />
        </Cartao>
      );
    }

    if (modoManual) {
      return (
        <Cartao>
          <Texto variante="secao">Digitar o valor</Texto>
          <Campo
            rotulo="Frequência cardíaca (bpm)"
            value={bpmManual}
            onChangeText={(texto) => {
              setBpmManual(texto);
              setErroManual(null);
            }}
            keyboardType="number-pad"
            placeholder="Ex.: 72"
            maxLength={3}
            erro={erroManual}
            nota={`Entre ${BPM_MINIMO} e ${BPM_MAXIMO}.`}
            style={{ alignSelf: 'stretch' }}
          />
          <Botao
            titulo="Registrar no prontuário"
            carregando={importando}
            onPress={importarManual}
          />
          <Botao
            variante="texto"
            compacto
            titulo="Voltar para o monitor"
            onPress={() => setModoManual(false)}
          />
        </Cartao>
      );
    }

    if (conectando) {
      return (
        <Cartao style={{ alignItems: 'center' }}>
          <ActivityIndicator color={cores.acao} />
          <Texto variante="rotulo" cor="tinta2" style={{ textAlign: 'center' }}>
            Conectando a {conectando.nome}… isso leva alguns segundos.
          </Texto>
        </Cartao>
      );
    }

    if (conectado) {
      return (
        <Cartao style={{ alignItems: 'center' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: espaco.xs, flexWrap: 'wrap', justifyContent: 'center' }}>
            <Texto variante="rotuloForte">Conectado ao {conectado.nome}</Texto>
            {!sinalPerdido ? <Selo texto="ao vivo" icone="activity" /> : null}
          </View>

          {/* Nao mostrar o ultimo valor como se fosse atual: um numero
              velho na tela engana quem esta atendendo. */}
          <BpmAoVivo
            valor={sinalPerdido ? null : ultimaLeitura}
            leituras={leituras.length}
            apagado={sinalPerdido}
          />

          {sinalPerdido ? (
            <Texto variante="legenda" cor="atencao" style={{ textAlign: 'center' }}>
              Sem leitura há {segundosSemLeitura} s. A conexão pode ter caído —
              aproxime o aparelho ou desconecte e procure de novo.
            </Texto>
          ) : null}

          <Texto variante="legenda" cor="apoio" tabular style={{ textAlign: 'center' }}>
            {leituras.length}{' '}
            {leituras.length === 1 ? 'leitura recebida' : 'leituras recebidas'}
            {media !== null ? ` · média ${media} bpm` : ''}
          </Texto>

          <Botao
            titulo="Importar a média para o prontuário"
            desativado={leituras.length === 0}
            carregando={importando}
            onPress={importarLeituras}
            style={{ alignSelf: 'stretch' }}
          />
          <Botao
            titulo="Desconectar"
            variante="contorno"
            desativado={importando}
            onPress={desconectar}
            style={{ alignSelf: 'stretch' }}
          />
        </Cartao>
      );
    }

    return (
      <Cartao>
        <View style={{ flexDirection: 'row', gap: espaco.sm, alignItems: 'flex-start' }}>
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: raio.campo,
              backgroundColor: cores.salviaSuave,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Feather name="bluetooth" size={20} color={cores.sobreSalviaSuave} />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Texto variante="corpoForte">Ler do monitor cardíaco</Texto>
            <Texto variante="legenda" cor="apoio">
              Ligue o monitor e deixe perto do celular. A leitura vai direto
              para o prontuário.
            </Texto>
          </View>
        </View>

        {procurando ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: espaco.sm }}>
            <ActivityIndicator color={cores.acao} />
            <View>
              <Texto variante="rotuloForte">Procurando aparelhos…</Texto>
              <Texto variante="legenda" cor="apoio">
                Leva alguns segundos.
              </Texto>
            </View>
          </View>
        ) : (
          <Botao titulo="Procurar monitor" icone="search" onPress={procurar} />
        )}

        {aparelhos.length > 0 ? (
          <View>
            <Texto variante="legenda" cor="apoio">
              {aparelhos.length === 1
                ? '1 aparelho encontrado'
                : `${aparelhos.length} aparelhos encontrados`}
            </Texto>
            {aparelhos.map((aparelho, indice) => (
              <ItemDeLista
                key={aparelho.id}
                titulo={aparelho.nome}
                subtitulo="Toque para conectar"
                esquerda={<Feather name="bluetooth" size={20} color={cores.link} />}
                seta
                divisor={indice < aparelhos.length - 1}
                accessibilityLabel={`Conectar ao ${aparelho.nome}`}
                onPress={() => conectar(aparelho)}
              />
            ))}
          </View>
        ) : null}

        {buscaConcluida && aparelhos.length === 0 && !erro ? (
          <View style={{ gap: 2 }}>
            <Texto variante="rotuloForte">Nenhum aparelho encontrado</Texto>
            <Texto variante="legenda" cor="apoio">
              Confira se o monitor está ligado, com bateria e perto do
              celular, e procure de novo. Se não aparecer, digite o valor.
            </Texto>
          </View>
        ) : null}
      </Cartao>
    );
  };

  return (
    <Tela>
      <Cabecalho titulo="Sinais vitais" aoVoltar={() => navigation.goBack()} />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingHorizontal: margemTela + 2,
          paddingTop: espaco.xs,
          paddingBottom: insets.bottom + espaco.xl,
          gap: espaco.md,
        }}
      >
        {!paciente ? (
          <Texto variante="corpo" cor="tinta2">
            Abra esta tela a partir de um paciente.
          </Texto>
        ) : (
          <>
            <View style={{ gap: 4 }}>
              {/* O paciente registrando para si nao se ve como "outra
                  pessoa" na tela. */}
              {ehPaciente ? (
                <Texto variante="corpo" cor="tinta2">
                  Envie sua frequência cardíaca antes da consulta.
                </Texto>
              ) : (
                <Texto variante="tituloMedio" selectable>
                  {paciente.nome}
                </Texto>
              )}
              {MODO_SIMULADO ? (
                <Texto variante="legenda" cor="apoio">
                  Modo simulado — aparelhos de teste
                </Texto>
              ) : null}
            </View>

            {renderConteudo()}

            {erro ? (
              <View
                accessibilityRole="alert"
                style={{
                  flexDirection: 'row',
                  gap: espaco.xs,
                  backgroundColor: cores.atencaoSuave,
                  borderRadius: raio.campo,
                  padding: espaco.sm,
                }}
              >
                <Feather name="alert-circle" size={16} color={cores.atencao} style={{ marginTop: 2 }} />
                <Texto variante="legenda" cor="atencao" style={{ flex: 1 }} selectable>
                  {erro}
                </Texto>
              </View>
            ) : null}

            {/* Sempre visivel fora do modo manual. Se o Bluetooth falhar,
                a consulta nao pode parar -- isto e requisito, nao
                cortesia. */}
            {!modoManual && !salvo ? (
              <Botao
                variante="texto"
                compacto
                titulo="Digitar o valor manualmente"
                onPress={irParaManual}
              />
            ) : null}

            <Texto variante="legenda" cor="apoio">
              Sinal vital é dado de saúde: vai só para o prontuário da clínica.
              Nada fica guardado no celular.
            </Texto>
          </>
        )}
      </ScrollView>
    </Tela>
  );
}
