import React, { useEffect, useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as LocalAuthentication from 'expo-local-authentication';
import { obterToken, limparToken } from '../services/sessao';

const colors = {
  bg: '#F5F5F2',
  surface: '#FFFFFF',
  border: '#E2E1DB',
  ink: '#4A5560',
  muted: '#8B909A',
  sage: '#4B7776',
};

export default function LoginBiometricoScreen({ navigation }) {
  const [temHardware, setTemHardware] = useState(false);
  const [temBiometriaCadastrada, setTemBiometriaCadastrada] =
    useState(false);
  const [verificando, setVerificando] = useState(true);
  const [autenticando, setAutenticando] = useState(false);
  const [aviso, setAviso] = useState('');

  const irParaLoginComSenha = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: 'Login' }],
    });
  };

  const irParaHome = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: 'Home' }],
    });
  };

  useEffect(() => {
    const verificar = async () => {
      const token = await obterToken();

      if (!token) {
        irParaLoginComSenha();
        return;
      }

      const hardware = await LocalAuthentication.hasHardwareAsync();
      const cadastrada =
        await LocalAuthentication.isEnrolledAsync();

      setTemHardware(hardware);
      setTemBiometriaCadastrada(cadastrada);
      setVerificando(false);

      if (!hardware || !cadastrada) {
        irParaHome();
      }
    };

    verificar();
  }, []);

  const autenticar = async () => {
    setAviso('');
    setAutenticando(true);

    try {
      const resultado =
        await LocalAuthentication.authenticateAsync({
          promptMessage:
            'Confirme sua identidade para abrir a agenda da clínica',
          cancelLabel: 'Usar e-mail e senha',
        });

      if (resultado.success) {
        irParaHome();
        return;
      }

      if (
        resultado.error === 'user_cancel' ||
        resultado.error === 'system_cancel' ||
        resultado.error === 'user_fallback'
      ) {
        return;
      }

      setAviso(
        'Não foi possível confirmar sua identidade. Tente novamente.',
      );
    } catch (e) {
      setAviso(
        'Ocorreu um erro ao tentar usar a biometria.',
      );
    } finally {
      setAutenticando(false);
    }
  };

  const entrarComSenha = async () => {
    await limparToken();

    navigation.reset({
      index: 0,
      routes: [{ name: 'Login' }],
    });
  };

  if (verificando) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loading}>
          <ActivityIndicator
            size="large"
            color={colors.sage}
          />
          <Text style={styles.loadingText}>
            Verificando biometria...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Image
          source={require('../../assets/imgs/logo-CLYRA.jpeg')}
          style={styles.logo}
          resizeMode="contain"
        />

        <Text style={styles.title}>
          Login biométrico
        </Text>

        <Text style={styles.subtitle}>
          Confirme sua identidade para acessar a agenda da clínica.
        </Text>

        {temHardware && temBiometriaCadastrada && (
          <TouchableOpacity
            style={[
              styles.biometriaBtn,
              autenticando && styles.btnDisabled,
            ]}
            onPress={autenticar}
            disabled={autenticando}
          >
            <Feather
              name="fingerprint"
              size={24}
              color="#fff"
            />

            <Text style={styles.biometriaText}>
              {autenticando
                ? 'Autenticando...'
                : 'Entrar com biometria'}
            </Text>
          </TouchableOpacity>
        )}

        {aviso ? (
          <Text style={styles.aviso}>
            {aviso}
          </Text>
        ) : null}

        <TouchableOpacity
          onPress={entrarComSenha}
          style={styles.senhaBtn}
        >
          <Text style={styles.senhaText}>
            Entrar com e-mail e senha
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg,
  },

  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },

  logo: {
    width: 180,
    height: 100,
    marginBottom: 20,
  },

  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.ink,
    marginBottom: 8,
  },

  subtitle: {
    fontSize: 14,
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 28,
  },

  biometriaBtn: {
    width: '100%',
    backgroundColor: colors.sage,
    borderRadius: 12,
    paddingVertical: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },

  btnDisabled: {
    opacity: 0.6,
  },

  biometriaText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },

  aviso: {
    color: '#A65B5B',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 16,
  },

  senhaBtn: {
    marginTop: 24,
    padding: 10,
  },

  senhaText: {
    color: colors.sage,
    fontSize: 13,
    fontWeight: '600',
  },

  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  loadingText: {
    marginTop: 12,
    color: colors.muted,
    fontSize: 13,
  },
});
