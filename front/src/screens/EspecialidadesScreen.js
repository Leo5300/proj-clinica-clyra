import React, { useState, useCallback } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { buscarEspecialidades } from '../services/api';

// TODO: mover para front/src/theme quando o ThemeContext existir
// Mesma paleta usada nas outras telas.
const colors = {
  bg: '#F5F5F2',
  surface: '#FFFFFF',
  border: '#E2E1DB',
  ink: '#4A5560',
  muted: '#8B909A',
  sage: '#4B7776',
};

export default function EspecialidadesScreen({ navigation }) {
  // Cada estado representa uma dimensão independente da tela:
  // dados, carregamento e erro podem existir separadamente.
  const [especialidades, setEspecialidades] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);

  const carregarEspecialidades = useCallback(async () => {
    try {
      setErro(null);
      const dados = await buscarEspecialidades();
      setEspecialidades(dados);
    } catch (e) {
      setErro('Não foi possível carregar as especialidades agora.');
    } finally {
      setCarregando(false);
    }
  }, []);

  // A tela precisa recarregar quando voltar do cadastro/edição.
  useFocusEffect(
    useCallback(() => {
      carregarEspecialidades();
    }, [carregarEspecialidades]),
  );

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Feather name="arrow-left" size={22} color={colors.ink} />
        </TouchableOpacity>

        <Text style={styles.title}>Especialidades</Text>

        <View style={styles.headerSpacer} />
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
              <Text style={styles.nome}>{item.nome}</Text>
            </View>
          )}
          ListEmptyComponent={
            <Text style={styles.emptyText}>
              Nenhuma especialidade cadastrada.
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

  headerSpacer: {
    width: 22,
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
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
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