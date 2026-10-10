import React, { useState } from 'react';
import {
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  StyleSheet,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import {
  trocarSenha,
  SessaoExpirada,
  SemPermissao,
  ErroDaApi,
} from '../services/api';
import { atualizarUsuario } from '../services/sessao';

// Dois caminhos:
//   obrigatorio: true -> primeiro acesso com senha temporaria. Sem voltar:
//     o servidor bloqueia o resto ate a troca.
//   sem parametro     -> troca voluntaria, vinda do Perfil.

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

const AREA_DE_TOQUE = { top: 11, bottom: 11, left: 11, right: 11 };

function Regra({ atendida, texto }) {
  return (
    <View style={styles.regra}>
      <Feather
        name={atendida ? 'check-circle' : 'circle'}
        size={14}
        color={atendida ? colors.sage : colors.muted}
      />
      <Text style={[styles.regraTexto, atendida && styles.regraAtendida]}>
        {texto}
      </Text>
    </View>
  );
}

export default function TrocarSenhaScreen({ navigation, route }) {
  const obrigatorio = route.params?.obrigatorio === true;

  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const [erroAtual, setErroAtual] = useState(null);
  const [erro, setErro] = useState(null);
  const [salvando, setSalvando] = useState(false);

  // As mesmas regras do servidor, visiveis enquanto a pessoa digita.
  const temTamanho = novaSenha.length >= 8;
  const ehDiferente = novaSenha.length > 0 && novaSenha !== senhaAtual;
  const confere = novaSenha.length > 0 && novaSenha === confirmacao;
  const pronto = senhaAtual.length > 0 && temTamanho && ehDiferente && confere;

  const salvar = async () => {
    setErro(null);
    setErroAtual(null);
    setSalvando(true);

    try {
      const me = await trocarSenha(senhaAtual, novaSenha);
      await atualizarUsuario(me);

      if (obrigatorio) {
        navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
        return;
      }

      Alert.alert('Senha alterada', 'Use a nova senha no próximo acesso.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (e) {
      if (e instanceof SessaoExpirada) {
        navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
        return;
      }

      if (e instanceof SemPermissao) {
        setErro(e.mensagem ?? 'Você não tem permissão para isso.');
        return;
      }

      // Senha atual errada aparece embaixo do proprio campo.
      if (e instanceof ErroDaApi && e.mensagem === 'Senha atual incorreta.') {
        setErroAtual(e.mensagem);
        return;
      }

      setErro(
        e instanceof ErroDaApi && e.mensagem
          ? e.mensagem
          : 'Não foi possível salvar a nova senha agora.',
      );
    } finally {
      setSalvando(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        {obrigatorio ? (
          <View style={styles.headerSpacer} />
        ) : (
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            accessibilityRole="button"
            accessibilityLabel="Voltar"
            hitSlop={AREA_DE_TOQUE}
          >
            <Feather name="arrow-left" size={22} color={colors.ink} />
          </TouchableOpacity>
        )}
        <Text style={styles.title}>
          {obrigatorio ? 'Crie sua senha' : 'Trocar senha'}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.form}
          keyboardShouldPersistTaps="handled"
        >
          {obrigatorio && (
            <Text style={styles.intro}>
              Você entrou com uma senha temporária. Crie uma senha só sua para
              continuar.
            </Text>
          )}

          {erro && <Text style={styles.erroTopo}>{erro}</Text>}

          <View style={styles.campo}>
            <Text style={styles.label}>Senha atual</Text>
            <TextInput
              style={styles.input}
              value={senhaAtual}
              onChangeText={(valor) => {
                setSenhaAtual(valor);
                setErroAtual(null);
              }}
              secureTextEntry
              autoCapitalize="none"
            />
            {erroAtual && <Text style={styles.erroCampo}>{erroAtual}</Text>}
          </View>

          <View style={styles.campo}>
            <Text style={styles.label}>Nova senha</Text>
            <TextInput
              style={styles.input}
              value={novaSenha}
              onChangeText={setNovaSenha}
              secureTextEntry
              autoCapitalize="none"
            />
          </View>

          <View style={styles.campo}>
            <Text style={styles.label}>Confirmar nova senha</Text>
            <TextInput
              style={styles.input}
              value={confirmacao}
              onChangeText={setConfirmacao}
              secureTextEntry
              autoCapitalize="none"
            />
          </View>

          <View style={styles.regras}>
            <Regra atendida={temTamanho} texto="Pelo menos 8 caracteres" />
            <Regra atendida={ehDiferente} texto="Diferente da senha atual" />
            <Regra atendida={confere} texto="As duas senhas novas conferem" />
          </View>

          <TouchableOpacity
            style={[
              styles.botao,
              (!pronto || salvando) && styles.botaoDesabilitado,
            ]}
            onPress={salvar}
            disabled={!pronto || salvando}
          >
            <Text style={styles.botaoTexto}>
              {salvando ? 'Salvando...' : 'Salvar nova senha'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
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

  form: { padding: 20, paddingBottom: 40 },
  intro: {
    fontSize: 14,
    color: colors.ink,
    lineHeight: 20,
    marginBottom: 18,
  },
  erroTopo: { fontSize: 13, color: colors.danger, marginBottom: 14 },

  campo: { marginBottom: 16 },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.muted,
    marginBottom: 6,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: colors.ink,
  },
  erroCampo: { fontSize: 12, color: colors.danger, marginTop: 6 },

  regras: { gap: 6, marginBottom: 8 },
  regra: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  regraTexto: { fontSize: 13, color: colors.muted },
  regraAtendida: { color: colors.sage },

  botao: {
    backgroundColor: colors.sage,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 16,
  },
  botaoDesabilitado: { opacity: 0.6 },
  botaoTexto: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
