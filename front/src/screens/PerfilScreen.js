import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  Switch,
  View,
} from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import {
  atualizarMinhaFoto,
  SessaoExpirada,
  ErroDaApi,
} from '../services/api';
import {
  useUsuario,
  atualizarUsuario,
  limparSessao,
} from '../services/sessao';
import {
  cancelarTodosOsLembretes,
  garantirPermissao,
  notificacoesPermitidas,
} from '../services/lembretes';
import { ROTULO_DO_PERFIL } from '../navigation/permissoes';
import {
  Avatar,
  BarraAbas,
  Botao,
  Cabecalho,
  CartaoTinta,
  ComVidro,
  FolhaDecisao,
  ItemDeLista,
  Pressionavel,
  Segmentado,
  Selo,
  Texto,
  ehAba,
  useEspacoDaBarra,
  useRolagem,
} from '../components';
import { useTema, espaco, margemTela, raio, toque } from '../theme';
import { vibrarSelecao } from '../services/haptica';

// Quem esta logado: foto, nome, e-mail de acesso e perfil. Daqui saem a
// troca de senha, os dados do paciente, os ajustes de aparencia, o apoio
// do CVV e o "Sair da conta".

const OPCOES_DE_TEMA = [
  { valor: 'claro', rotulo: 'Claro' },
  { valor: 'escuro', rotulo: 'Escuro' },
  { valor: 'automatico', rotulo: 'Automático' },
];

// Profissional e lavanda; a recepcao e neutra; o paciente usa o selo de
// papel com texto tinta (no perfil dele, a lavanda so diz Psicologia).
const TOM_DO_PERFIL = { recepcao: 'neutro', medico: 'lavanda', paciente: 'papel' };

function Grupo({ titulo, children }) {
  const { cores } = useTema();

  return (
    <View style={{ gap: espaco.xs }}>
      <Texto variante="secao" accessibilityRole="header">
        {titulo}
      </Texto>
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
        {children}
      </View>
    </View>
  );
}

function IconeDeLinha({ nome, cor }) {
  const { cores } = useTema();
  return <Feather name={nome} size={20} color={cor ?? cores.tinta2} />;
}

export default function PerfilScreen({ navigation }) {
  const { usuario } = useUsuario();
  const {
    cores,
    modo,
    definirModo,
    reduzirTransparencia,
    definirReduzirTransparencia,
  } = useTema();
  const insets = useSafeAreaInsets();
  const espacoDaBarra = useEspacoDaBarra();
  const { aoRolar, rolou } = useRolagem(60);

  const [salvandoFoto, setSalvandoFoto] = useState(false);
  const [saindo, setSaindo] = useState(false);
  const [confirmandoSaida, setConfirmandoSaida] = useState(false);
  const [lembretes, setLembretes] = useState(null);

  const perfil = usuario?.perfil;
  const comoAba = ehAba(perfil, 'Perfil');
  // Recepcao e um acesso da clinica, sem cadastro de pessoa: sem foto.
  const temFoto = perfil === 'medico' || perfil === 'paciente';

  useEffect(() => {
    if (perfil !== 'paciente') return;
    notificacoesPermitidas().then(setLembretes).catch(() => setLembretes(null));
  }, [perfil]);

  const irParaLogin = () => {
    navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
  };

  // Mesmo padrao do cadastro de paciente: permissao antes de tudo, e
  // negar ou cancelar e resposta valida, nao erro.
  const trocarFoto = async () => {
    const permissao = await ImagePicker.requestCameraPermissionsAsync();

    if (!permissao.granted) {
      Alert.alert(
        'Câmera não liberada',
        'Sem permissão de câmera não é possível tirar a foto. Libere a câmera nos ajustes do aparelho para trocar a foto.',
      );
      return;
    }

    const resultado = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.6,
    });

    if (resultado.canceled) {
      return;
    }

    setSalvandoFoto(true);

    try {
      // A foto e gravada no cadastro, no servidor; o aparelho so guarda o
      // resumo atualizado.
      const me = await atualizarMinhaFoto(resultado.assets[0].uri);
      await atualizarUsuario(me);
    } catch (e) {
      if (e instanceof SessaoExpirada) {
        irParaLogin();
        return;
      }

      Alert.alert(
        'Não foi possível salvar a foto',
        e instanceof ErroDaApi && e.mensagem
          ? e.mensagem
          : 'Tente de novo em instantes.',
      );
    } finally {
      setSalvandoFoto(false);
    }
  };

  const ativarLembretes = async () => {
    try {
      const liberado = await garantirPermissao();
      setLembretes(liberado);
      if (!liberado) {
        Alert.alert(
          'Notificações desligadas',
          'Para receber os lembretes, ative as notificações do app nos ajustes do aparelho.',
          [
            { text: 'Agora não', style: 'cancel' },
            { text: 'Abrir ajustes', onPress: () => Linking.openSettings() },
          ],
        );
      }
    } catch (e) {
      setLembretes(false);
    }
  };

  const ligarParaCvv = () => {
    Linking.openURL('tel:188').catch(() => {});
  };

  const sair = async () => {
    setSaindo(true);
    // Outra pessoa pode usar este aparelho: os avisos de consulta de quem
    // saiu nao podem continuar chegando aqui.
    await cancelarTodosOsLembretes();
    await limparSessao();
    irParaLogin();
  };

  if (!usuario) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: cores.papel }}>
        <ActivityIndicator color={cores.acao} size="large" />
      </View>
    );
  }

  const topo = insets.top + espaco.xs + (comoAba ? 0 : toque.minimo + espaco.xs) + espaco.md;

  const conteudo = (
    <Animated.ScrollView
      onScroll={aoRolar}
      scrollEventThrottle={16}
      contentContainerStyle={{
        paddingTop: topo,
        paddingHorizontal: margemTela + 2,
        paddingBottom: comoAba ? espacoDaBarra : insets.bottom + espaco.xl,
        gap: espaco.lg,
      }}
    >
      <View style={{ alignItems: 'center', gap: espaco.xs }}>
        {temFoto ? (
          <Pressionavel
            onPress={trocarFoto}
            disabled={salvandoFoto}
            accessibilityRole="button"
            accessibilityLabel="Trocar foto"
          >
            <Avatar
              nome={usuario.nome}
              fotoUri={usuario.fotoUri}
              tamanho={96}
              tom={perfil === 'medico' ? 'lavanda' : 'neutro'}
            />
            <View
              style={{
                position: 'absolute',
                right: 0,
                bottom: 0,
                width: 34,
                height: 34,
                borderRadius: 17,
                backgroundColor: cores.superficie,
                borderWidth: 1,
                borderColor: cores.linha,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {salvandoFoto ? (
                <ActivityIndicator color={cores.acao} size="small" />
              ) : (
                <Feather name="camera" size={15} color={cores.link} />
              )}
            </View>
          </Pressionavel>
        ) : (
          <Avatar
            nome={usuario.nome}
            tamanho={96}
            tom={perfil === 'paciente' ? 'verde' : 'lavanda'}
          />
        )}

        <Texto variante="titulo" style={{ textAlign: 'center', marginTop: espaco.xs }}>
          {usuario.nome}
        </Texto>
        <Texto variante="rotulo" cor="apoio" selectable>
          {usuario.email}
        </Texto>
        <Selo
          texto={ROTULO_DO_PERFIL[perfil]}
          tom={TOM_DO_PERFIL[perfil] ?? 'neutro'}
          style={{ alignSelf: 'center' }}
        />
      </View>

      <Grupo titulo="Conta">
        {perfil === 'paciente' && (
          <ItemDeLista
            titulo="Dados pessoais"
            esquerda={<IconeDeLinha nome="file-text" />}
            seta
            onPress={() =>
              navigation.navigate('CadastroPaciente', {
                modo: 'meusDados',
                pacienteId: usuario.vinculoId,
              })
            }
          />
        )}
        <ItemDeLista
          titulo="Trocar senha"
          esquerda={<IconeDeLinha nome="key" />}
          seta
          divisor={false}
          onPress={() => navigation.navigate('TrocarSenha')}
        />
      </Grupo>

      <Grupo titulo="Avisos e aparência">
        {perfil === 'paciente' ? (
          <ItemDeLista
            titulo="Lembretes de consulta"
            subtitulo={
              lembretes
                ? 'Uma hora antes de cada consulta, neste aparelho.'
                : 'Desligados. Toque para ativar.'
            }
            esquerda={<IconeDeLinha nome={lembretes ? 'bell' : 'bell-off'} />}
            direita={
              lembretes ? <Selo texto="Ativos" tom="papel" /> : null
            }
            onPress={lembretes ? undefined : ativarLembretes}
          />
        ) : null}

        <View style={{ paddingVertical: 14, gap: espaco.sm, borderBottomWidth: 1, borderBottomColor: cores.linha }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: espaco.sm }}>
            <IconeDeLinha nome="sun" />
            <Texto variante="corpoForte">Tema</Texto>
          </View>
          <Segmentado
            rotuloDoGrupo="Tema"
            opcoes={OPCOES_DE_TEMA}
            valor={modo}
            aoMudar={definirModo}
          />
        </View>

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: espaco.sm,
            paddingVertical: 14,
            minHeight: toque.minimo + 12,
            borderBottomWidth: 1,
            borderBottomColor: cores.linha,
          }}
        >
          <IconeDeLinha nome="layers" />
          <View style={{ flex: 1, gap: 2 }}>
            <Texto variante="corpoForte">Reduzir transparência</Texto>
            <Texto variante="legenda" cor="apoio">
              Barras sólidas no lugar do vidro.
              {Platform.OS === 'ios'
                ? ' No iPhone, o app também segue o ajuste do aparelho.'
                : ''}
            </Texto>
          </View>
          <Switch
            value={reduzirTransparencia}
            onValueChange={(ligado) => {
              vibrarSelecao();
              definirReduzirTransparencia(ligado);
            }}
            trackColor={{ true: cores.lavanda, false: cores.linhaForte }}
            thumbColor={cores.chave}
            ios_backgroundColor={cores.linhaForte}
            accessibilityLabel="Reduzir transparência"
          />
        </View>

        <ItemDeLista
          titulo="Movimento e tamanho do texto"
          subtitulo="Seguem os ajustes de acessibilidade do aparelho."
          esquerda={<IconeDeLinha nome="type" />}
          divisor={false}
        />
      </Grupo>

      {perfil === 'paciente' ? (
        <View style={{ gap: espaco.xs }}>
          <Texto variante="secao" accessibilityRole="header">
            Apoio
          </Texto>
          <CartaoTinta
            titulo="Precisa conversar agora?"
            texto="O CVV atende 24 horas, por telefone e de graça. Ligue 188."
          >
            <Botao
              titulo="Ligar para o 188"
              icone="phone"
              variante="lavanda"
              accessibilityLabel="Ligar para o CVV, 188"
              onPress={ligarParaCvv}
            />
          </CartaoTinta>
        </View>
      ) : null}

      <ItemDeLista
        titulo="Sair da conta"
        corDoTitulo="alerta"
        esquerda={<IconeDeLinha nome="log-out" cor={cores.alerta} />}
        divisor={false}
        onPress={() => setConfirmandoSaida(true)}
      />
    </Animated.ScrollView>
  );

  return (
    <View style={{ flex: 1, backgroundColor: cores.papel }}>
      <ComVidro conteudo={conteudo}>
        {comoAba ? (
          <BarraAbas navigation={navigation} atual="Perfil" />
        ) : (
          <Cabecalho
            flutuante
            titulo="Perfil"
            rolou={rolou}
            aoVoltar={() => navigation.goBack()}
          />
        )}
      </ComVidro>

      <FolhaDecisao
        visivel={confirmandoSaida}
        aoFechar={() => !saindo && setConfirmandoSaida(false)}
        titulo="Sair da conta?"
        texto="Você vai precisar entrar de novo. Os lembretes deste aparelho serão cancelados."
        acaoPrincipal={{
          titulo: 'Sair',
          variante: 'alerta',
          carregando: saindo,
          onPress: sair,
        }}
        acaoSecundaria={{ titulo: 'Ficar', onPress: () => setConfirmandoSaida(false) }}
      />
    </View>
  );
}
