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
// npm install @expo/vector-icons  (já vem com o Expo na maioria dos projetos)
// npx expo install expo-local-authentication expo-secure-store

// TODO: quando tivermos mais telas, mover para front/src/config/api.js
const API_BASE_URL = 'http://localhost:8080/api';

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

// TODO: salvar o arquivo do logo em front/assets/logo-clyra.png
// (exportar do arquivo de identidade visual em PNG com fundo transparente)
const logo = require('../../assets/imgs/logo-CLYRA.jpeg');

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [loading, setLoading] = useState(false);
  const [bioLoading, setBioLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleLogin = async () => {
    if (!email || !senha) {
      setError('Preencha e-mail e senha.');
      return;
    }

    setError(null);
    setLoading(true);

    // O Spring Boot (back/) nao esta no ar e nao ha previsao de subir no
    // curto prazo -- toda a squad testa sobre o mock (json-server). Login
    // provisorio: aceita qualquer email/senha e vai direto pra Home.
    // Decisao registrada no README, em "Decisoes tecnicas".
    //
    // Quando a autenticacao de verdade entrar (Aula 4), reativar o bloco
    // abaixo e remover o navigation.replace direto:
    //
    // try {
    //   const res = await fetch(`${API_BASE_URL}/auth/login`, {
    //     method: 'POST',
    //     headers: { 'Content-Type': 'application/json' },
    //     body: JSON.stringify({ email, senha }),
    //   });
    //   if (!res.ok) throw new Error('Credenciais inválidas.');
    //   const data = await res.json();
    //   // TODO: salvar data.token e data.deviceToken com expo-secure-store
    //   navigation.replace('Home');
    // } catch (e) {
    //   setError('E-mail ou senha incorretos.');
    // } finally {
    //   setLoading(false);
    // }

    setTimeout(() => {
      setLoading(false);
      navigation.replace('Home');
    }, 300);
  };

  const handleBiometricLogin = async () => {
    setError(null);
    setBioLoading(true);

    // Mesmo motivo do handleLogin: sem Spring Boot no ar, biometria tambem
    // vai direto pra Home. Exemplo de uso real do expo-local-authentication
    // fica comentado pra quando a autenticacao entrar de verdade:
    //
    // const LocalAuthentication = require('expo-local-authentication');
    // const hasHardware = await LocalAuthentication.hasHardwareAsync();
    // const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    // if (!hasHardware || !isEnrolled) {
    //   setError('Biometria não configurada neste aparelho.');
    //   setBioLoading(false);
    //   return;
    // }
    // const result = await LocalAuthentication.authenticateAsync({
    //   promptMessage: 'Entrar na Clyra',
    // });
    // if (!result.success) {
    //   setBioLoading(false);
    //   return;
    // }
    // const deviceToken = null; // TODO: ler do SecureStore
    // const res = await fetch(`${API_BASE_URL}/auth/login/biometria`, {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ pacienteId: 1, deviceToken }),
    // });
    // if (!res.ok) throw new Error('Biometria não reconhecida.');

    setTimeout(() => {
      setBioLoading(false);
      navigation.replace('Home');
    }, 300);
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
              placeholder="voce@email.com"
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
              secureTextEntry
              value={senha}
              onChangeText={setSenha}
            />
          </View>

          <TouchableOpacity style={styles.btnPrimary} onPress={handleLogin} disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.btnPrimaryText}>Entrar</Text>
            )}
          </TouchableOpacity>

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OU</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity style={styles.btnOutline} onPress={handleBiometricLogin} disabled={bioLoading}>
            {bioLoading ? (
              <ActivityIndicator color={colors.ink} />
            ) : (
              <>
                <MaterialCommunityIcons name="fingerprint" size={20} color={colors.ink} />
                <Text style={styles.btnOutlineText}>Entrar com biometria</Text>
              </>
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
  btnPrimaryText: { color: '#fff', fontWeight: '600', fontSize: 14.5 },

  dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText: {
    marginHorizontal: 12,
    fontSize: 10.5,
    fontWeight: '600',
    letterSpacing: 1,
    color: colors.muted,
  },

  btnOutline: {
    flexDirection: 'row',
    gap: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingVertical: 14,
    backgroundColor: colors.surface,
  },
  btnOutlineText: { color: colors.ink, fontWeight: '600', fontSize: 14 },

  footRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 26 },
  footText: { color: colors.muted, fontSize: 12.5 },
  footLink: { color: colors.sage, fontWeight: '600', fontSize: 12.5 },
});