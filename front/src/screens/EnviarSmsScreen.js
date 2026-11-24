import React, { useCallback, useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { buscarPaciente, ErroDaApi, SessaoExpirada } from '../services/api';
import {
  TIPOS_DE_AVISO,
  avaliarTexto,
  normalizarNumero,
  textoPadrao,
} from '../services/sms';
import {
  Botao,
  Cabecalho,
  Campo,
  ComVidro,
  Esqueleto,
  EstadoErro,
  Texto,
  useRolagem,
} from '../components';
import { useTema, espaco, margemTela, raio, toque } from '../theme';

// Tela de envio de SMS ao paciente (Aula 13), so da recepcao. Abre a partir
// de uma consulta: lembrete, confirmacao, remarcacao ou cancelamento.
//
// Os dois caminhos ficam lado a lado, cada um dizendo quem envia e quem
// paga. A tela nunca diz "enviado": pelo aparelho o app nao fica sabendo,
// e pelo servidor o SMS so entra na fila.

// Caixa de cada caminho.
function Cartao({ children }) {
  const { cores } = useTema();

  return (
    <View
      style={{
        backgroundColor: cores.superficie,
        borderColor: cores.linha,
        borderWidth: 1,
        borderRadius: raio.cartao,
        borderCurve: 'continuous',
        padding: espaco.md,
        gap: espaco.sm,
      }}
    >
      {children}
    </View>
  );
}

export default function EnviarSmsScreen({ navigation, route }) {
  const { pacienteId, tipo, data, hora } = route.params ?? {};
  const { cores } = useTema();
  const insets = useSafeAreaInsets();
  const { aoRolar, rolou } = useRolagem(50);

  const tipoValido = Boolean(TIPOS_DE_AVISO[tipo]);
  const modelo = tipoValido ? textoPadrao(tipo, { data, hora }) : '';

  const [paciente, setPaciente] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erroCarga, setErroCarga] = useState(null);
  const [texto, setTexto] = useState(modelo);

  const irParaLogin = useCallback(() => {
    navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
  }, [navigation]);

  const carregar = useCallback(async () => {
    setErroCarga(null);

    try {
      setPaciente(await buscarPaciente(pacienteId));
    } catch (e) {
      if (e instanceof SessaoExpirada) {
        irParaLogin();
        return;
      }

      setErroCarga(
        e instanceof ErroDaApi && e.mensagem
          ? e.mensagem
          : 'Não foi possível carregar o paciente. Confira a internet e tente de novo.',
      );
    } finally {
      setCarregando(false);
    }
  }, [pacienteId, irParaLogin]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const avaliacao = avaliarTexto(texto);
  // O mesmo numero que o servidor vai usar: o do cadastro, normalizado.
  const numero = normalizarNumero(paciente?.telefone);

  const renderConteudo = () => {
    if (carregando) {
      return (
        <View
          style={{ gap: espaco.md }}
          accessibilityState={{ busy: true }}
          accessibilityLabel="Carregando o paciente"
        >
          <Esqueleto largura={220} altura={30} raio={8} />
          <Esqueleto altura={140} raio={20} />
        </View>
      );
    }

    if (!tipoValido) {
      return <EstadoErro texto="Este tipo de aviso não existe." />;
    }

    if (erroCarga || !paciente) {
      return <EstadoErro texto={erroCarga ?? undefined} aoTentar={carregar} />;
    }

    return (
      <>
        <View style={{ gap: 4 }}>
          <Texto variante="tituloGrande" accessibilityRole="header">
            {TIPOS_DE_AVISO[tipo]} por SMS
          </Texto>
          <Texto variante="rotulo" cor="apoio" selectable>
            Para {paciente.nome} · {paciente.telefone || 'sem telefone no cadastro'}
          </Texto>
          {numero ? null : (
            <Texto testID="aviso-telefone" variante="legenda" cor="alerta">
              O telefone do cadastro não é um celular, e SMS só chega em celular. Corrija o
              cadastro do paciente antes de enviar.
            </Texto>
          )}
        </View>

        <View style={{ gap: espaco.xs }}>
          <Campo
            rotulo="Mensagem"
            value={texto}
            onChangeText={setTexto}
            multiline
            testID="campo-mensagem"
          />
          <Texto
            testID="contador-sms"
            variante="legenda"
            cor={avaliacao.segmentos > 1 ? 'alerta' : 'apoio'}
            tabular
            accessibilityLiveRegion="polite"
          >
            {avaliacao.caracteres} caracteres ·{' '}
            {avaliacao.segmentos === 1 ? '1 mensagem' : `${avaliacao.segmentos} mensagens`}
          </Texto>
          {avaliacao.alerta ? (
            <Texto variante="legendaForte" cor="alerta">
              {avaliacao.alerta}
            </Texto>
          ) : null}
          {avaliacao.avisoDeAcento ? (
            <Texto variante="legenda" cor="atencao">
              {avaliacao.avisoDeAcento}
            </Texto>
          ) : null}
          {texto !== modelo ? (
            <Botao
              titulo="Voltar ao texto padrão"
              variante="texto"
              compacto
              onPress={() => setTexto(modelo)}
            />
          ) : null}
        </View>
      </>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: cores.papel }} testID="tela-enviar-sms">
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ComVidro
          conteudo={
            <Animated.ScrollView
              onScroll={aoRolar}
              scrollEventThrottle={16}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{
                paddingTop: insets.top + espaco.xs + toque.minimo + espaco.lg,
                paddingHorizontal: margemTela + 2,
                paddingBottom: insets.bottom + espaco.xl,
                gap: espaco.lg,
              }}
            >
              {renderConteudo()}
            </Animated.ScrollView>
          }
        >
          <Cabecalho
            flutuante
            titulo="Avisar por SMS"
            rolou={rolou}
            aoVoltar={() => navigation.goBack()}
          />
        </ComVidro>
      </KeyboardAvoidingView>
    </View>
  );
}
