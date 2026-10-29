import React, { useState, useCallback } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import {
  buscarEspecialidades,
  excluirEspecialidade,
  SessaoExpirada,
  SemPermissao,
  ErroDaApi,
} from '../services/api';

// TODO: mover para front/src/theme quando o ThemeContext existir
// Mesma paleta usada nas outras telas.
const colors = {
  bg: '#F5F5F2',
  surface: '#FFFFFF',
  border: '#E2E1DB',
  ink: '#4A5560',
  muted: '#8B909A',
  sage: '#4B7776',
  danger: '#B0555F',
};

// Icones de 18-22 px: o hitSlop leva a area de toque aos 44 px minimos.
const AREA_DE_TOQUE = { top: 11, bottom: 11, left: 11, right: 11 };

export default function EspecialidadesScreen({ navigation }) {
  // Cada estado representa uma dimensão independente da tela:
  // dados, carregamento e erro podem existir separadamente.
  const [especialidades, setEspecialidades] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);

  const irParaLogin = useCallback(() => {
    navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
  }, [navigation]);

  const carregarEspecialidades = useCallback(async () => {
    try {
      setErro(null);
      const dados = await buscarEspecialidades();
      setEspecialidades(dados);
    } catch (e) {
      if (e instanceof SessaoExpirada) {
        irParaLogin();
        return;
      }

      setErro(
        e instanceof SemPermissao
          ? e.mensagem ?? 'Você não tem permissão para isso.'
          : 'Não foi possível carregar as especialidades agora.',
      );
    } finally {
      setCarregando(false);
    }
  }, [irParaLogin]);

  // A tela precisa recarregar quando voltar do cadastro/edição.
  useFocusEffect(
    useCallback(() => {
      carregarEspecialidades();
    }, [carregarEspecialidades]),
  );

  const excluir = async (id) => {
    try {
      await excluirEspecialidade(id);

      // O servidor e a fonte da verdade: recarrega a lista dele.
      await carregarEspecialidades();
    } catch (e) {
      if (e instanceof SessaoExpirada) {
        irParaLogin();
        return;
      }

      Alert.alert(
        'Não foi possível excluir',
        e instanceof ErroDaApi && e.mensagem
          ? e.mensagem
          : 'Não foi possível excluir a especialidade agora.',
      );
    }
  };

  const confirmarExclusao = (especialidade) => {
    Alert.alert(
      'Excluir especialidade',
      `Deseja excluir ${especialidade.nome}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: () => excluir(especialidade.id),
        },
      ],
    );
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

        <Text style={styles.title}>Especialidades</Text>

        <TouchableOpacity
          onPress={() => navigation.navigate('CadastroEspecialidade')}
          accessibilityRole="button"
          accessibilityLabel="Cadastrar especialidade"
          hitSlop={AREA_DE_TOQUE}
        >
          <Feather name="plus" size={22} color={colors.ink} />
        </TouchableOpacity>
      </View>

      {carregando ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.sage} size="large" />
        </View>
      ) : erro ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{erro}</Text>

          <TouchableOpacity
            style={styles.retryBtn}
            onPress={carregarEspecialidades}
          >
            <Text style={styles.retryText}>Tentar novamente</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={especialidades}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <TouchableOpacity
                style={styles.cardInfo}
                onPress={() =>
                  navigation.navigate('CadastroEspecialidade', {
                    especialidade: item,
                  })
                }
              >
                <Text style={styles.nome}>{item.nome}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => confirmarExclusao(item)}
                accessibilityRole="button"
                accessibilityLabel={`Excluir ${item.nome}`}
                hitSlop={AREA_DE_TOQUE}
              >
                <Feather name="trash-2" size={18} color={colors.danger} />
              </TouchableOpacity>
            </View>
          )}
          ListEmptyComponent={
            <Text style={styles.emptyText}>
              Nenhuma especialidade cadastrada. Toque em + para cadastrar.
            </Text>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },

  title: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.ink,
  },

  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },

  errorText: {
    color: colors.muted,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 14,
  },

  retryBtn: {
    backgroundColor: colors.sage,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
  },

  retryText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 13,
  },

  list: {
    padding: 20,
    paddingBottom: 40,
  },

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
  },

  cardInfo: {
    flex: 1,
    marginRight: 12,
  },

  nome: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.ink,
  },

  emptyText: {
    textAlign: 'center',
    color: colors.muted,
    marginTop: 40,
  },
});
