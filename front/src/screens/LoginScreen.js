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
  Image,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { autenticar } from '../services/api';
import { salvarToken } from '../services/sessao';
// npx expo install expo-secure-store

// TODO: quando tivermos mais telas, mover para front/src/theme.js
// Paleta extraída direto do logo da Clyra — nada de cor genérica.
const colors = {
  bg: '#F5F5F2',
  surface: '#FFFFFF',
  surfaceAlt: '#ECEBE6',
  border: '#E2E1DB',
  ink: '#4A5560',
  muted: '#8B909A',
  sage: '#4B7776',
  sageSoft: '#E3EEEA',
  lavender: '#9A8BB6',
  lavenderSoft: '#EFE9F3',
  danger: '#B0555F',
};

const logo = require('../../assets/imgs/logo-CLYRA.jpeg');

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [entrando, setEntrando] = useState(false);
  const [error, setError] = useState(null);

  const entrar = async () => {
    // Campo vazio nao merece uma requisicao -- e nem que a senha saia pela
    // rede a toa.
    if (!email.trim() || !senha) {
      setError('Preencha e-mail e senha.');
      return;
    }

    setError(null);
    setEntrando(true);

    try {
      const dados = await autenticar(email.trim(), senha);

      await salvarToken(dados.token);

      // A senha nao precisa continuar na memoria do app: dagora em diante o
      // que vale e o token.
      setSenha('');

      // reset e nao navigate: o usuario nao pode voltar para o Login com o
      // gesto de voltar depois de autenticado.
      navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
    } catch (e) {
      if (e.credencialInvalida) {
        setError('E-mail ou senha inválidos.');
      } else {
        setError('Não foi possível entrar. Verifique se a API está no ar.');
      }
    } finally {
      setEntrando(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.brandBlock}>
            <Image source={logo} style={styles.logo} resizeMode="contain" />
          </View>

          {error && <Text style={styles.errorText}>{error}</Text>}

          <View style={styles.field}>
            <Text style={styles.label}>E-mail</Text>
            <TextInput
              style={styles.input}
              placeholder="voce@clinica.com"
              placeholderTextColor={colors.muted}
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Senha</Text>
            <TextInput
              style={styles.input}
              placeholder="••••••••"
              placeholderTextColor={colors.muted}
              // secureTextEntry esconde a senha de quem olha a tela. Ele NAO
              // protege o que trafega na rede -- isso e papel do HTTPS.
              secureTextEntry
              autoCapitalize="none"
              value={senha}
              onChangeText={setSenha}
            />
          </View>

          <TouchableOpacity
            style={[styles.btnPrimary, entrando && styles.btnPrimaryDisabled]}
            onPress={entrar}
            disabled={entrando}
          >
            {entrando ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.btnPrimaryText}>Entrar</Text>
            )}
          </TouchableOpacity>

          <View style={styles.footRow}>
            <Text style={styles.footText}>Ainda não é paciente? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('CadastroPaciente')}>
              <Text style={styles.footLink}>Criar conta</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { flexGrow: 1, padding: 24, justifyContent: 'center' },

  brandBlock: { alignItems: 'center', marginBottom: 36 },
  logo: { width: 200, height: 130 },

  errorText: {
    color: colors.danger,
    fontSize: 12.5,
    textAlign: 'center',
    marginBottom: 14,
  },

  field: { marginBottom: 16 },
  label: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: colors.muted,
    marginBottom: 7,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 13,
    fontSize: 14.5,
    color: colors.ink,
  },

  btnPrimary: {
    backgroundColor: colors.sage,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  btnPrimaryDisabled: { opacity: 0.6 },
  btnPrimaryText: { color: '#fff', fontWeight: '600', fontSize: 14.5 },

  footRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 26 },
  footText: { color: colors.muted, fontSize: 12.5 },
  footLink: { color: colors.sage, fontWeight: '600', fontSize: 12.5 },
});