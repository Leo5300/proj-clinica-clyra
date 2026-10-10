import React, { useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import {
  criarEspecialidade,
  atualizarEspecialidade,
  SessaoExpirada,
  ErroDaApi,
} from '../services/api';

// Cadastro e edicao (route.params.especialidade) de especialidade. So a
// recepcao chega aqui; o servidor confere o perfil de novo ao gravar.

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

export default function CadastroEspecialidadeScreen({ navigation, route }) {
  const especialidade = route.params?.especialidade;

  const [nome, setNome] = useState(especialidade?.nome ?? '');
  const [erro, setErro] = useState(null);
  const [salvando, setSalvando] = useState(false);

  const salvar = async () => {
    if (!nome.trim()) {
      setErro('Informe o nome da especialidade.');
      return;
    }

    setErro(null);
    setSalvando(true);

    try {
      const dados = { nome: nome.trim() };

      if (especialidade) {
        await atualizarEspecialidade(especialidade.id, dados);
      } else {
        await criarEspecialidade(dados);
      }

      // So volta depois da confirmacao do servidor; a lista recarrega ao
      // receber o foco.
      navigation.goBack();
    } catch (e) {
      if (e instanceof SessaoExpirada) {
        navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
        return;
      }

      setErro(
        e instanceof ErroDaApi && e.mensagem
          ? e.mensagem
          : 'Não foi possível salvar a especialidade agora.',
      );
    } finally {
      setSalvando(false);
    }
  };

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
        <Text style={styles.title}>
          {especialidade ? 'Editar especialidade' : 'Nova especialidade'}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.form}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.campo}>
          <Text style={styles.label}>Nome</Text>
          <TextInput
            style={styles.input}
            value={nome}
            onChangeText={(valor) => {
              setNome(valor);
              setErro(null);
            }}
            placeholder="Ex.: Cardiologia"
            placeholderTextColor={colors.muted}
          />
          {erro && <Text style={styles.erroCampo}>{erro}</Text>}
        </View>

        <TouchableOpacity
          style={[styles.botao, salvando && styles.botaoDesabilitado]}
          onPress={salvar}
          disabled={salvando}
        >
          <Text style={styles.botaoTexto}>
            {salvando ? 'Salvando...' : 'Salvar'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
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

  botao: {
    backgroundColor: colors.sage,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  botaoDesabilitado: { opacity: 0.6 },
  botaoTexto: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
