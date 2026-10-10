import React, { useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
  StyleSheet,
} from 'react-native';
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
import { cancelarTodosOsLembretes } from '../services/lembretes';
import { ROTULO_DO_PERFIL, CORES_DO_PERFIL } from '../navigation/permissoes';

// Quem esta logado: foto, nome, e-mail de acesso e perfil. Daqui saem a
// troca de senha, os dados do paciente e o "Sair da conta".

// TODO: mover para front/src/theme quando o ThemeContext existir.
const colors = {
  bg: '#F5F5F2',
  surface: '#FFFFFF',
  border: '#E2E1DB',
  ink: '#4A5560',
  muted: '#8B909A',
  sage: '#4B7776',
  sageSoft: '#E3EEEA',
  danger: '#B0555F',
};

const AREA_DE_TOQUE = { top: 11, bottom: 11, left: 11, right: 11 };

function iniciais(nome) {
  const partes = String(nome ?? '').trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return '?';

  const primeira = partes[0][0];
  const ultima = partes.length > 1 ? partes[partes.length - 1][0] : '';
  return `${primeira}${ultima}`.toUpperCase();
}

function Acao({ icone, texto, cor = colors.ink, onPress }) {
  return (
    <TouchableOpacity style={styles.acao} onPress={onPress}>
      <Feather name={icone} size={18} color={cor} />
      <Text style={[styles.acaoTexto, { color: cor }]}>{texto}</Text>
      <Feather name="chevron-right" size={18} color={colors.muted} />
    </TouchableOpacity>
  );
}

export default function PerfilScreen({ navigation }) {
  const { usuario } = useUsuario();
  const [salvandoFoto, setSalvandoFoto] = useState(false);

  const perfil = usuario?.perfil;
  // Recepcao e um acesso da clinica, sem cadastro de pessoa: sem foto.
  const temFoto = perfil === 'medico' || perfil === 'paciente';
  const cores = CORES_DO_PERFIL[perfil] ?? CORES_DO_PERFIL.paciente;

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
        'Erro',
        e instanceof ErroDaApi && e.mensagem
          ? e.mensagem
          : 'Não foi possível salvar a foto agora.',
      );
    } finally {
      setSalvandoFoto(false);
    }
  };

  const sair = async () => {
    // Outra pessoa pode usar este aparelho: os avisos de consulta de quem
    // saiu nao podem continuar chegando aqui.
    await cancelarTodosOsLembretes();
    await limparSessao();
    irParaLogin();
  };

  const confirmarSaida = () => {
    Alert.alert('Sair da conta?', 'Você vai precisar entrar de novo.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sair', style: 'destructive', onPress: sair },
    ]);
  };

  if (!usuario) {
    return (
      <SafeAreaView style={[styles.safe, styles.center]}>
        <ActivityIndicator color={colors.sage} size="large" />
      </SafeAreaView>
    );
  }

  const avatar = usuario.fotoUri ? (
    <Image source={{ uri: usuario.fotoUri }} style={styles.avatar} />
  ) : (
    <View style={[styles.avatar, styles.avatarIniciais]}>
      <Text style={styles.avatarTexto}>{iniciais(usuario.nome)}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Voltar"
          hitSlop={AREA_DE_TOQUE}
        >
          <Feather name="arrow-left" size={22} color={colors.ink} />
        </TouchableOpacity>
        <Text style={styles.title}>Meu perfil</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.topo}>
          {temFoto ? (
            <TouchableOpacity
              onPress={trocarFoto}
              disabled={salvandoFoto}
              accessibilityRole="button"
              accessibilityLabel="Trocar foto"
            >
              {avatar}
              <View style={styles.camera}>
                {salvandoFoto ? (
                  <ActivityIndicator color={colors.sage} size="small" />
                ) : (
                  <Feather name="camera" size={14} color={colors.sage} />
                )}
              </View>
            </TouchableOpacity>
          ) : (
            avatar
          )}

          <Text style={styles.nome}>{usuario.nome}</Text>
          <Text style={styles.email}>{usuario.email}</Text>

          <View style={[styles.selo, { backgroundColor: cores.fundo }]}>
            <Text style={[styles.seloTexto, { color: cores.cor }]}>
              {ROTULO_DO_PERFIL[perfil]}
            </Text>
          </View>
        </View>

        <View style={styles.card}>
          {perfil === 'paciente' && (
            <Acao
              icone="file-text"
              texto="Meus dados"
              onPress={() =>
                navigation.navigate('CadastroPaciente', {
                  modo: 'meusDados',
                  pacienteId: usuario.vinculoId,
                })
              }
            />
          )}

          <Acao
            icone="key"
            texto="Trocar senha"
            onPress={() => navigation.navigate('TrocarSenha')}
          />

          <Acao
            icone="log-out"
            texto="Sair da conta"
            cor={colors.danger}
            onPress={confirmarSaida}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  center: { justifyContent: 'center', alignItems: 'center' },
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

  topo: { alignItems: 'center', marginBottom: 24 },
  avatar: { width: 110, height: 110, borderRadius: 55 },
  avatarIniciais: {
    backgroundColor: colors.sageSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarTexto: { fontSize: 34, fontWeight: '700', color: colors.sage },
  camera: {
    position: 'absolute',
    right: 2,
    bottom: 2,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nome: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.ink,
    marginTop: 14,
  },
  email: { fontSize: 13, color: colors.muted, marginTop: 2 },
  selo: {
    borderRadius: 10,
    paddingVertical: 4,
    paddingHorizontal: 10,
    marginTop: 10,
  },
  seloTexto: { fontSize: 12, fontWeight: '600' },

  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: 16,
  },
  acao: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 52,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  acaoTexto: { flex: 1, fontSize: 14, fontWeight: '600' },
});
