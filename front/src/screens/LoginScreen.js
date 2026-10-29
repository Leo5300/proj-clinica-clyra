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
import { salvarSessao } from '../services/sessao';
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

// Atalhos de teste: os logins didaticos do mock (os mesmos que a API
// imprime ao subir). So existem em desenvolvimento -- __DEV__ e false no
// build de producao, entao estes dados nem entram no app publicado.
const ACESSOS_DE_TESTE = __DEV__
  ? [
      { rotulo: 'Recepção', email: 'recepcao@clinica.com', senha: 'clinica123' },
      { rotulo: 'Médico', email: 'joao@clinica.com', senha: 'medico123' },
      { rotulo: 'Paciente', email: 'lucas@exemplo.com', senha: 'paciente123' },
    ]
  : [];

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [entrando, setEntrando] = useState(false);
  const [error, setError] = useState(null);

  // Sem argumentos usa o que foi digitado; os atalhos de teste passam o
  // login direto.
  const entrar = async (emailInformado = email, senhaInformada = senha) => {
    // Campo vazio nao merece uma requisicao -- e nem que a senha saia pela
    // rede a toa.
    if (!emailInformado.trim() || !senhaInformada) {
      setError('Preencha e-mail e senha.');
      return;
    }

    setError(null);
    setEntrando(true);

    try {
      const dados = await autenticar(emailInformado.trim(), senhaInformada);

      await salvarSessao(dados.token, dados.usuario);

      // A senha nao precisa continuar na memoria do app: dagora em diante o
      // que vale e o token.
      setSenha('');

      // reset e nao navigate: o usuario nao pode voltar para o Login com o
      // gesto de voltar depois de autenticado. Senha temporaria (acesso
      // criado pela clinica) obriga a criar a propria antes de qualquer
      // outra tela -- o servidor tambem bloqueia o resto ate la.
      if (dados.usuario?.trocarSenha) {
        navigation.reset({
          index: 0,
          routes: [{ name: 'TrocarSenha', params: { obrigatorio: true } }],
        });
        return;
      }

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
            onPress={() => entrar()}
            disabled={entrando}
          >
            {entrando ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.btnPrimaryText}>Entrar</Text>
            )}
          </TouchableOpacity>

          <View style={styles.footRow}>
            <Text style={styles.footText}>Primeira vez aqui? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('CriarConta')}>
              <Text style={styles.footLink}>Criar conta de paciente</Text>
            </TouchableOpacity>
          </View>

          {/* Conta de equipe nao se cria pelo app: quem cria e a clinica. */}
          <Text style={styles.footNota}>
            Médicos e recepção entram com o acesso fornecido pela clínica.
          </Text>

          {ACESSOS_DE_TESTE.length > 0 && (
            <View style={styles.testeBloco}>
              <Text style={styles.testeTitulo}>
                Acesso rápido (só em desenvolvimento)
              </Text>
              <View style={styles.testeLinha}>
                {ACESSOS_DE_TESTE.map((acesso) => (
                  <TouchableOpacity
                    key={acesso.email}
                    style={styles.testeBotao}
                    onPress={() => entrar(acesso.email, acesso.senha)}
                    disabled={entrando}
                    accessibilityRole="button"
                    accessibilityLabel={`Entrar como ${acesso.rotulo}`}
                  >
                    <Text style={styles.testeBotaoTexto}>{acesso.rotulo}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
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
  footNota: {
    color: colors.muted,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 10,
  },

  testeBloco: {
    marginTop: 28,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  testeTitulo: {
    color: colors.muted,
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 10,
  },
  testeLinha: { flexDirection: 'row', gap: 8 },
  testeBotao: {
    flex: 1,
    minHeight: 44,
    backgroundColor: colors.lavenderSoft,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  testeBotaoTexto: { color: colors.ink, fontWeight: '600', fontSize: 13 },
});