import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useTema, fontes } from '../theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as LocalAuthentication from 'expo-local-authentication';
import {
  obterToken,
  obterUsuario,
  limparSessao,
} from '../services/sessao';

export default function LoginBiometricoScreen({ navigation }) {
  const { cores } = useTema();
  const styles = useMemo(() => criarEstilos(cores), [cores]);
  const [temHardware, setTemHardware] = useState(false);
  const [temBiometriaCadastrada, setTemBiometriaCadastrada] =
    useState(false);
  const [verificando, setVerificando] = useState(true);
  const [autenticando, setAutenticando] = useState(false);
  const [aviso, setAviso] = useState('');
  const [usuario, setUsuario] = useState(null);

  // Equipe (recepcao e medico) ve dados de muitos pacientes: num aparelho
  // sem biometria, reabrir a sessao sem senha deixaria esses dados com
  // quem pegar o celular. Paciente so ve os proprios dados.
  const [equipeSemBiometria, setEquipeSemBiometria] = useState(false);

  const irParaLoginComSenha = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: 'Login' }],
    });
  };

  // Destino depois de confirmar quem e: senha temporaria ainda nao trocada
  // vai primeiro para a troca.
  const irParaDestino = (quem) => {
    if (quem?.trocarSenha) {
      navigation.reset({
        index: 0,
        routes: [{ name: 'TrocarSenha', params: { obrigatorio: true } }],
      });
      return;
    }

    navigation.reset({
      index: 0,
      routes: [{ name: 'Home' }],
    });
  };

  useEffect(() => {
    const verificar = async () => {
      const token = await obterToken();
      const quem = await obterUsuario();

      // Sem o perfil guardado (sessao de uma versao antiga do app), nao ha
      // como decidir o fluxo: volta ao login com senha.
      if (!token || !quem) {
        await limparSessao();
        irParaLoginComSenha();
        return;
      }

      setUsuario(quem);

      const hardware = await LocalAuthentication.hasHardwareAsync();
      const cadastrada =
        await LocalAuthentication.isEnrolledAsync();

      setTemHardware(hardware);
      setTemBiometriaCadastrada(cadastrada);
      setVerificando(false);

      if (!hardware || !cadastrada) {
        if (quem.perfil === 'paciente') {
          irParaDestino(quem);
        } else {
          setEquipeSemBiometria(true);
        }
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
        irParaDestino(usuario);
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
    await limparSessao();

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
            color={cores.link}
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

        {equipeSemBiometria ? (
          <Text style={styles.subtitle}>
            Este aparelho não tem biometria cadastrada. Por segurança, a
            equipe da clínica entra com e-mail e senha.
          </Text>
        ) : (
          <>
            <Text style={styles.title}>
              Login biométrico
            </Text>

            <Text style={styles.subtitle}>
              Confirme sua identidade para acessar a agenda da clínica.
            </Text>
          </>
        )}

        {temHardware && temBiometriaCadastrada && (
          <TouchableOpacity
            style={[
              styles.biometriaBtn,
              autenticando && styles.btnDisabled,
            ]}
            onPress={autenticar}
            disabled={autenticando}
          >
            <MaterialCommunityIcons
              name="fingerprint"
              size={24}
              color={cores.sobreAcao}
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

const criarEstilos = (cores) =>
  StyleSheet.create({
    safe: {
      flex: 1,
      backgroundColor: cores.papel,
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
      fontFamily: fontes.textoForte,
      color: cores.tinta,
      marginBottom: 8,
    },

    subtitle: {
      fontFamily: fontes.texto,
      fontSize: 14,
      color: cores.apoio,
      textAlign: 'center',
      lineHeight: 20,
      marginBottom: 28,
    },

    biometriaBtn: {
      width: '100%',
      backgroundColor: cores.acao,
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
      color: cores.sobreAcao,
      fontSize: 14,
      fontFamily: fontes.textoForte,
    },

    aviso: {
      fontFamily: fontes.texto,
      color: cores.alerta,
      fontSize: 12,
      textAlign: 'center',
      marginTop: 16,
    },

    senhaBtn: {
      marginTop: 24,
      padding: 10,
    },

    senhaText: {
      color: cores.link,
      fontSize: 13,
      fontFamily: fontes.textoSemi,
    },

    loading: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },

    loadingText: {
      fontFamily: fontes.texto,
      marginTop: 12,
      color: cores.apoio,
      fontSize: 13,
    },
  });
