import React from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useUsuario } from '../services/sessao';

// Aparece no lugar de uma tela que o perfil nao pode abrir (link antigo,
// toque em lembrete, navegacao feita por engano). Nenhum dado e buscado:
// mesmo que a tela abrisse, o servidor responderia 403.

// TODO: mover para front/src/theme quando o ThemeContext existir.
const colors = {
  bg: '#F5F5F2',
  surface: '#FFFFFF',
  border: '#E2E1DB',
  ink: '#4A5560',
  muted: '#8B909A',
  sage: '#4B7776',
};

export default function SemAcessoScreen({ navigation }) {
  const { usuario } = useUsuario();

  // Sem sessao, o "inicio" e o Login: a Home tambem estaria bloqueada.
  const voltarAoInicio = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: usuario ? 'Home' : 'Login' }],
    });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.icone}>
          <Feather name="lock" size={28} color={colors.sage} />
        </View>

        <Text style={styles.title}>Sem acesso a esta área</Text>

        <Text style={styles.texto}>
          Seu perfil não tem permissão para abrir esta tela.
        </Text>

        <TouchableOpacity style={styles.botao} onPress={voltarAoInicio}>
          <Text style={styles.botaoTexto}>Voltar ao início</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  icone: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  title: { fontSize: 17, fontWeight: '700', color: colors.ink },
  texto: {
    fontSize: 14,
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 8,
  },
  botao: {
    alignSelf: 'stretch',
    backgroundColor: colors.sage,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 24,
  },
  botaoTexto: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
