import React, { useState, useEffect, useCallback } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { buscarMedicos } from '../services/api';

// TODO: mover para front/src/theme quando o ThemeContext existir
// (feature/design-system). Mesma paleta usada na HomeScreen.
const colors = {
  bg: '#F5F5F2',
  surface: '#FFFFFF',
  border: '#E2E1DB',
  ink: '#4A5560',
  muted: '#8B909A',
  sage: '#4B7776',
};

export default function MedicosScreen({ navigation }) {
  // carregando, erro e medicos sao dimensoes independentes: e possivel ter a
  // lista na tela e um erro de recarga ao mesmo tempo, entao cada um vive no
  // seu proprio estado em vez de um "status" unico.
  const [medicos, setMedicos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);

  const carregarMedicos = useCallback(async () => {
    try {
      setErro(null);
      const dados = await buscarMedicos();
      setMedicos(dados);
    } catch (e) {
      setErro('Não foi possível carregar os médicos agora.');
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregarMedicos();
  }, [carregarMedicos]);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Feather name="arrow-left" size={22} color={colors.ink} />
        </TouchableOpacity>
        <Text style={styles.title}>Médicos</Text>
        <View style={styles.headerSpacer} />
      </View>

      {carregando ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.sage} size="large" />
        </View>
      ) : erro ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{erro}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={carregarMedicos}>
            <Text style={styles.retryText}>Tentar novamente</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={medicos}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.nome}>{item.nome}</Text>
              <Text style={styles.especialidade}>{item.especialidade}</Text>
              <Text style={styles.detalhe}>CRM {item.crm}</Text>
            </View>
          )}
          ListEmptyComponent={
            <Text style={styles.emptyText}>Nenhum médico cadastrado.</Text>
          }
        />
      )}
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

  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  errorText: { color: colors.muted, fontSize: 14, textAlign: 'center', marginBottom: 14 },
  retryBtn: {
    backgroundColor: colors.sage,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  retryText: { color: '#fff', fontWeight: '600', fontSize: 13 },

  list: { padding: 20, paddingBottom: 40 },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
  },
  nome: { fontSize: 15, fontWeight: '700', color: colors.ink },
  especialidade: { fontSize: 13, color: colors.sage, marginTop: 2 },
  detalhe: { fontSize: 12, color: colors.muted, marginTop: 6 },
  emptyText: { textAlign: 'center', color: colors.muted, marginTop: 40 },
});
