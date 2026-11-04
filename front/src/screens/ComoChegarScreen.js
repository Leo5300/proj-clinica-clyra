import React, { useState, useCallback, useMemo } from 'react';
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  StyleSheet,
} from 'react-native';
import { useTema, fontes } from '../theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import {
  CLINICA,
  obterPosicaoAtual,
  distanciaKm,
  formatarDistancia,
  estimarMinutos,
} from '../services/localizacao';

export default function ComoChegarScreen({ navigation }) {
  const { cores } = useTema();
  const styles = useMemo(() => criarEstilos(cores), [cores]);
  // Estados separados, mesmo padrao das listas da Aula 3: carregando,
  // erro e dados sao dimensoes independentes. Aqui ha um quarto caso --
  // permissao negada -- que NAO e erro: e resposta do usuario, e merece
  // tratamento proprio.
  const [posicao, setPosicao] = useState(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState(null);
  const [permissaoNegada, setPermissaoNegada] = useState(null);

  const localizar = useCallback(async () => {
    setErro(null);
    setPermissaoNegada(null);
    setCarregando(true);

    try {
      const atual = await obterPosicaoAtual();
      setPosicao(atual);
    } catch (e) {
      if (e.name === 'PermissaoNegada') {
        // Guardamos o canAskAgain para decidir QUAL saida oferecer:
        // tentar de novo, ou mandar para os ajustes do aparelho.
        setPermissaoNegada({
          podePerguntarDeNovo: e.canAskAgain,
        });
      } else {
        setErro('Não foi possível obter sua localização agora.');
      }
    } finally {
      // finally sempre: sem ele a tela fica presa em "Localizando..."
      // quando algo da errado.
      setCarregando(false);
    }
  }, []);

  const distancia = posicao
    ? distanciaKm(posicao, CLINICA)
    : null;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Feather name="chevron-left" size={26} color={cores.tinta} />
        </TouchableOpacity>

        <Text style={styles.title}>Como chegar</Text>

        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* O endereco vem PRIMEIRO e fica sempre visivel, independente do
            GPS. Permissao negada nao pode virar tela vazia: o usuario que
            recusou localizacao continua precisando saber onde fica a
            clinica. Periferico e enriquecimento, nunca requisito. */}
        <View style={styles.card}>
          <Text style={styles.cardEyebrow}>
            Endereço da clínica
          </Text>

          <Text style={styles.cardTitle}>
            {CLINICA.nome}
          </Text>

          <Text style={styles.cardText}>
            {CLINICA.endereco}
          </Text>

          <Text style={styles.cardText}>
            {CLINICA.telefone}
          </Text>
        </View>

        {carregando && (
          <View style={styles.card}>
            {/* A primeira leitura demora: o aparelho precisa fixar
                posicao. Sem indicador, parece que o app travou. */}
            <ActivityIndicator color={cores.link} />

            <Text style={styles.loadingText}>
              Localizando você...
            </Text>
          </View>
        )}

        {permissaoNegada && (
          <View style={styles.card}>
            <Text style={styles.cardEyebrow}>
              Localização não liberada
            </Text>

            {permissaoNegada.podePerguntarDeNovo ? (
              <>
                <Text style={styles.cardText}>
                  Precisamos da sua localização apenas para calcular a
                  distância até a clínica. Ela não é enviada a lugar
                  nenhum.
                </Text>

                <TouchableOpacity
                  style={styles.botao}
                  onPress={localizar}
                >
                  <Text style={styles.botaoTexto}>
                    Permitir localização
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                {/* canAskAgain === false: pedir de novo NAO faz nada, o
                    sistema nem mostra a caixa. O unico caminho real e
                    levar o usuario aos ajustes do aparelho. Sem isto, o
                    botao "permitir" vira um botao que nao faz nada e o
                    usuario fica preso sem entender por que. */}
                <Text style={styles.cardText}>
                  A permissão foi negada definitivamente. Para liberar, é
                  preciso alterar nos ajustes do aparelho.
                </Text>

                <TouchableOpacity
                  style={styles.botao}
                  onPress={() => Linking.openSettings()}
                >
                  <Text style={styles.botaoTexto}>
                    Abrir os ajustes do aparelho
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        )}

        {erro && (
          <View style={styles.card}>
            <Text style={styles.erroTexto}>
              {erro}
            </Text>

            <TouchableOpacity
              style={styles.botao}
              onPress={localizar}
            >
              <Text style={styles.botaoTexto}>
                Tentar de novo
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {posicao && distancia !== null && (
          <View style={styles.card}>
            <Text style={styles.cardEyebrow}>
              Distância
            </Text>

            <Text style={styles.destaque}>
              {formatarDistancia(distancia)}
            </Text>

            <Text style={styles.cardText}>
              Cerca de {estimarMinutos(distancia)} min
            </Text>

            {/* A precisao informada pelo aparelho vai para a tela porque
                muda a leitura do numero: +- 5 m e +- 2000 m nao sao a
                mesma informacao. */}
            <Text style={styles.cardMuted}>
              Precisão do GPS: ± {Math.round(posicao.precisaoM)} m
            </Text>

            {/* Prometer precisao que nao se tem e falha de UX. O aviso
                nao e detalhe: e o que impede o usuario de tratar a
                estimativa como tempo de percurso real. */}
            <Text style={styles.aviso}>
              Distância em linha reta. O tempo é uma estimativa e não
              considera o trajeto real nem o trânsito.
            </Text>
          </View>
        )}

        {!posicao && !carregando && !permissaoNegada && !erro && (
          <TouchableOpacity
            style={styles.botao}
            onPress={localizar}
          >
            <Text style={styles.botaoTexto}>
              Calcular distância até a clínica
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const criarEstilos = (cores) =>
  StyleSheet.create({
    safe: {
      flex: 1,
      backgroundColor: cores.papel,
    },

    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingVertical: 14,
    },

    title: {
      fontSize: 17,
      fontFamily: fontes.textoForte,
      color: cores.tinta,
    },

    headerSpacer: {
      width: 22,
    },

    content: {
      padding: 20,
      paddingBottom: 40,
    },

    card: {
      backgroundColor: cores.superficie,
      borderWidth: 1,
      borderColor: cores.linha,
      borderRadius: 14,
      padding: 16,
      marginBottom: 16,
    },

    cardEyebrow: {
      fontSize: 12,
      fontFamily: fontes.textoSemi,
      color: cores.apoio,
      marginBottom: 6,
    },

    cardTitle: {
      fontSize: 16,
      fontFamily: fontes.textoForte,
      color: cores.tinta,
      marginBottom: 4,
    },

    cardText: {
      fontFamily: fontes.texto,
      fontSize: 14,
      color: cores.tinta,
      marginBottom: 4,
      lineHeight: 20,
    },

    cardMuted: {
      fontFamily: fontes.texto,
      fontSize: 12,
      color: cores.apoio,
      marginTop: 6,
    },

    destaque: {
      fontSize: 28,
      fontFamily: fontes.textoForte,
      color: cores.link,
      marginBottom: 2,
    },

    aviso: {
      fontFamily: fontes.texto,
      fontSize: 12,
      color: cores.apoio,
      marginTop: 10,
      fontStyle: 'italic',
      lineHeight: 17,
    },

    loadingText: {
      fontFamily: fontes.texto,
      fontSize: 13,
      color: cores.apoio,
      textAlign: 'center',
      marginTop: 8,
    },

    erroTexto: {
      fontFamily: fontes.texto,
      fontSize: 14,
      color: cores.alerta,
      marginBottom: 10,
    },

    botao: {
      backgroundColor: cores.acao,
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: 'center',
      marginTop: 8,
    },

    botaoTexto: {
      color: cores.sobreAcao,
      fontFamily: fontes.textoForte,
      fontSize: 14,
    },
  });