import React, { useState, useEffect, useRef } from 'react';
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { criarServicoBle, MODO_SIMULADO } from '../services/bluetooth';
import { registrarSinaisVitais, SessaoExpirada } from '../services/api';

// Esta tela NAO conhece a biblioteca de Bluetooth, nem identificadores de
// servico, nem o formato em que o aparelho manda o valor. Ela so conhece
// o service de bluetooth.js -- por isso roda igual nos modos simulado e
// real.

// TODO: mover para front/src/theme quando o ThemeContext existir.
const colors = {
  bg: '#F5F5F2',
  surface: '#FFFFFF',
  border: '#E2E1DB',
  ink: '#4A5560',
  muted: '#8B909A',
  sage: '#4B7776',
  danger: '#B0555F',
};

// Escanear gasta bateria dos dois lados: a busca precisa ter fim.
const DURACAO_BUSCA_MS = 8000;

// O monitor manda uma leitura a cada 1 a 2 segundos. Passar disso sem
// nada novo significa que a conexao provavelmente caiu.
const LIMITE_SEM_LEITURA_MS = 5000;

// Guarda so as ultimas leituras: suficiente para a media, sem crescer
// sem limite se a tela ficar aberta muito tempo.
const MAX_LEITURAS = 30;

// Faixa plausivel para digitacao manual. Fora disso e quase certo erro de
// digitacao, e registro medico errado e pior que registro nenhum.
const BPM_MINIMO = 20;
const BPM_MAXIMO = 250;

export default function SinaisVitaisScreen({ navigation, route }) {
  const paciente = route.params?.paciente;

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

  useEffect(() => {
    // O service nasce com a tela e morre com ela. useRef porque ele nao
    // e estado de tela: trocar de service nao deve redesenhar nada.
    servicoRef.current = criarServicoBle();

    // Sair da tela PRECISA liberar o aparelho. Deixar conectado gasta
    // bateria dos dois lados e impede outro celular de conectar.
    return () => {
      clearTimeout(timerBuscaRef.current);
      servicoRef.current?.pararBusca();
      servicoRef.current?.desconectar();
    };
  }, []);

  useEffect(() => {
    // Relogio de 1 segundo, so enquanto conectado: e ele que permite
    // perceber que as leituras pararam de chegar.
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
          // O mesmo aparelho e anunciado varias vezes por segundo. Sem
          // esta checagem a lista enche de repetidos.
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
        // Permissao negada e resposta do usuario, nao bug. Avisar em vez
        // de falhar em silencio -- e sempre deixar a saida manual.
        setErro(
          'Sem permissão de Bluetooth o app não consegue procurar o monitor. Libere a permissão nos ajustes do aparelho ou digite os valores manualmente.',
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
    // Conectar com a busca ainda rodando disputa o radio do celular.
    clearTimeout(timerBuscaRef.current);
    servicoRef.current.pararBusca();
    setProcurando(false);

    setErro(null);
    setConectando(aparelho);

    try {
      await servicoRef.current.conectar(aparelho.id);

      setLeituras([]);
      // Comeca a contar a partir da conexao: se nenhuma leitura chegar,
      // a tela tambem percebe.
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
      // Mensagem que diz O QUE FAZER, nao so "erro".
      setErro(
        `Não foi possível conectar ao ${aparelho.nome}. Confira se ele está ligado e perto do celular e tente de novo — ou digite os valores manualmente.`,
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

    try {
      // So existe para a clinica o que chega ao servidor. Enquanto o
      // valor esta so na memoria desta tela, ele nao e registro medico:
      // fechar o app apaga tudo.
      await registrarSinaisVitais(registro);

      await servicoRef.current?.desconectar();

      Alert.alert(
        'Registrado',
        'Sinais vitais registrados no prontuário.',
        [{ text: 'OK', onPress: () => navigation.goBack() }],
      );
    } catch (e) {
      if (e instanceof SessaoExpirada) {
        navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
        return;
      }

      Alert.alert(
        'Erro',
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
    // Uma leitura isolada de batimento vale pouco: vai a MEDIA, junto com
    // quantas leituras a formaram e quando. Sem isso, quem ler o
    // prontuario depois nao sabe o quanto confiar no numero.
    salvar({
      pacienteId: paciente.id,
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
      Alert.alert(
        'Valor inválido',
        `Informe a frequência cardíaca em bpm, entre ${BPM_MINIMO} e ${BPM_MAXIMO}.`,
      );
      return;
    }

    salvar({
      pacienteId: paciente.id,
      frequenciaCardiaca: valor,
      quantidadeLeituras: 1,
      origem: 'manual',
      aparelho: null,
      registradoEm: new Date().toISOString(),
    });
  };

  const renderConteudo = () => {
    if (modoManual) {
      return (
        <View style={styles.card}>
          <Text style={styles.cardEyebrow}>Digitação manual</Text>

          <Text style={styles.label}>Frequência cardíaca (bpm)</Text>
          <TextInput
            style={styles.input}
            value={bpmManual}
            onChangeText={setBpmManual}
            keyboardType="numeric"
            placeholder="Ex.: 72"
            placeholderTextColor={colors.muted}
            maxLength={3}
          />

          <TouchableOpacity
            style={[styles.botao, importando && styles.botaoDesabilitado]}
            onPress={importarManual}
            disabled={importando}
          >
            <Text style={styles.botaoTexto}>
              {importando ? 'Registrando...' : 'Registrar no prontuário'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setModoManual(false)}>
            <Text style={styles.link}>Voltar para o Bluetooth</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (conectando) {
      return (
        <View style={styles.card}>
          <ActivityIndicator color={colors.sage} />
          <Text style={styles.nota}>
            Conectando a {conectando.nome}... isso leva alguns segundos.
          </Text>
        </View>
      );
    }

    if (conectado) {
      return (
        <View style={styles.card}>
          <Text style={styles.cardEyebrow}>Conectado a {conectado.nome}</Text>

          {sinalPerdido ? (
            <>
              {/* Nao mostrar o ultimo valor como se fosse atual: um numero
                  velho na tela engana quem esta atendendo. */}
              <Text style={[styles.bpm, styles.bpmApagado]}>--</Text>
              <Text style={styles.aviso}>
                Sem leitura há {segundosSemLeitura} s. A conexão pode ter
                caído — aproxime o aparelho ou desconecte e procure de novo.
              </Text>
            </>
          ) : (
            <Text style={styles.bpm}>{ultimaLeitura ?? '--'}</Text>
          )}

          <Text style={styles.unidade}>bpm</Text>

          <Text style={styles.nota}>
            {leituras.length}{' '}
            {leituras.length === 1 ? 'leitura recebida' : 'leituras recebidas'}
          </Text>

          {media !== null && (
            <Text style={styles.nota}>Média: {media} bpm</Text>
          )}

          <TouchableOpacity
            style={[
              styles.botao,
              (leituras.length === 0 || importando) && styles.botaoDesabilitado,
            ]}
            onPress={importarLeituras}
            disabled={leituras.length === 0 || importando}
          >
            <Text style={styles.botaoTexto}>
              {importando ? 'Importando...' : 'Importar para o prontuário'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.botao, styles.botaoSecundario]}
            onPress={desconectar}
            disabled={importando}
          >
            <Text style={styles.botaoSecundarioTexto}>Desconectar</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <>
        <TouchableOpacity
          style={[styles.botao, procurando && styles.botaoDesabilitado]}
          onPress={procurar}
          disabled={procurando}
        >
          <Text style={styles.botaoTexto}>
            {procurando ? 'Procurando...' : 'Procurar aparelhos'}
          </Text>
        </TouchableOpacity>

        {procurando && (
          <ActivityIndicator color={colors.sage} style={styles.indicador} />
        )}

        {aparelhos.map((aparelho) => (
          <TouchableOpacity
            key={aparelho.id}
            style={styles.item}
            onPress={() => conectar(aparelho)}
          >
            <Feather name="bluetooth" size={18} color={colors.sage} />
            <Text style={styles.itemNome}>{aparelho.nome}</Text>
          </TouchableOpacity>
        ))}

        {buscaConcluida && aparelhos.length === 0 && !erro && (
          // "Nenhum aparelho" e um RESULTADO da busca, e precisa dizer o
          // que fazer -- nao pode ser uma tela vazia para sempre.
          <View style={styles.card}>
            <Text style={styles.cardEyebrow}>Nenhum aparelho encontrado</Text>
            <Text style={styles.nota}>
              Confira se o monitor está ligado, com bateria e perto do
              celular, e toque em "Procurar aparelhos" de novo. Se não
              aparecer, digite os valores manualmente.
            </Text>
          </View>
        )}
      </>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Feather name="arrow-left" size={22} color={colors.ink} />
        </TouchableOpacity>
        <Text style={styles.title}>Sinais vitais</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {!paciente ? (
          <Text style={styles.erroTexto}>
            Abra esta tela a partir de um paciente.
          </Text>
        ) : (
          <>
            <View style={styles.pacienteBloco}>
              <Text style={styles.cardEyebrow}>Paciente</Text>
              <Text style={styles.pacienteNome}>{paciente.nome}</Text>
              {MODO_SIMULADO && (
                <Text style={styles.modo}>
                  Modo simulado — aparelhos de teste
                </Text>
              )}
            </View>

            {renderConteudo()}

            {erro && <Text style={styles.erroTexto}>{erro}</Text>}

            {/* Sempre visivel fora do modo manual. Se o Bluetooth falhar,
                a consulta nao pode parar -- isto e requisito, nao
                cortesia. */}
            {!modoManual && (
              <TouchableOpacity
                onPress={() => {
                  clearTimeout(timerBuscaRef.current);
                  servicoRef.current?.pararBusca();
                  setProcurando(false);
                  setModoManual(true);
                }}
              >
                <Text style={styles.link}>Digitar os valores manualmente</Text>
              </TouchableOpacity>
            )}

            <Text style={styles.rodape}>
              Sinal vital é dado de saúde do paciente: entra no prontuário,
              nunca em log.
            </Text>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  title: { fontSize: 17, fontWeight: '700', color: colors.ink },
  headerSpacer: { width: 22 },

  content: { padding: 20, paddingBottom: 40 },

  pacienteBloco: { marginBottom: 16 },
  pacienteNome: { fontSize: 18, fontWeight: '700', color: colors.ink },
  modo: { fontSize: 12, color: colors.muted, marginTop: 4 },

  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 16,
    marginTop: 12,
    alignItems: 'center',
  },
  cardEyebrow: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.muted,
    marginBottom: 6,
  },

  bpm: { fontSize: 56, fontWeight: '700', color: colors.sage },
  bpmApagado: { color: colors.muted },
  unidade: { fontSize: 14, color: colors.muted, marginTop: -6 },

  nota: {
    fontSize: 13,
    color: colors.muted,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 18,
  },
  aviso: {
    fontSize: 13,
    color: colors.danger,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 18,
  },

  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 14,
    marginTop: 10,
  },
  itemNome: { fontSize: 15, fontWeight: '600', color: colors.ink },

  label: {
    alignSelf: 'stretch',
    fontSize: 12,
    fontWeight: '600',
    color: colors.muted,
    marginBottom: 6,
  },
  input: {
    alignSelf: 'stretch',
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.ink,
  },

  botao: {
    alignSelf: 'stretch',
    backgroundColor: colors.sage,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 14,
  },
  botaoDesabilitado: { opacity: 0.6 },
  botaoTexto: { color: '#fff', fontWeight: '700', fontSize: 14 },
  botaoSecundario: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: 10,
  },
  botaoSecundarioTexto: { color: colors.ink, fontWeight: '600', fontSize: 14 },

  indicador: { marginTop: 14 },

  link: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.sage,
    textAlign: 'center',
    marginTop: 20,
  },
  erroTexto: {
    fontSize: 13,
    color: colors.danger,
    marginTop: 14,
    lineHeight: 18,
  },
  rodape: {
    fontSize: 11,
    color: colors.muted,
    textAlign: 'center',
    marginTop: 28,
  },
});
