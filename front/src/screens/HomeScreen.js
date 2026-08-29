import React, { useEffect, useState, useCallback } from 'react';
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Image,
  StyleSheet,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
// npm install @expo/vector-icons  (já vem com o Expo na maioria dos projetos)

// TODO: quando tivermos mais telas, mover para front/src/config/api.js
const API_BASE_URL = 'http://localhost:8080/api';

// TODO: quando tivermos mais telas, mover para front/src/theme.js
// Mesma paleta extraída do logo, usada também na tela de Login.
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
};

// TODO: salvar um recorte só do símbolo (sem o texto) em
// front/assets/icone-clyra.png, pra caber no cabeçalho pequeno
const icone = require('../../assets/imgs/icone-clyra.png');

export default function HomeScreen({ navigation }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  // TODO: substituir pelo id do paciente autenticado (context / token salvo no login)
  const pacienteId = 1;

  const fetchHome = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch(`${API_BASE_URL}/home/${pacienteId}`);
      if (!res.ok) throw new Error(`Erro ${res.status}`);
      const json = await res.json();
      setData(json);
    } catch (e) {
      setError('Não foi possível carregar seus dados agora.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [pacienteId]);

  useEffect(() => {
    fetchHome();
  }, [fetchHome]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchHome();
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.safe, styles.center]}>
        <ActivityIndicator color={colors.sage} size="large" />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={[styles.safe, styles.center]}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={fetchHome}>
          <Text style={styles.retryText}>Tentar novamente</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // Cada ação sabe pra onde navegar — evita repetir 4 blocos de JSX quase iguais.
  // Os nomes de rota precisam bater com o Stack/Tab Navigator quando ele existir.
  const quickActions = [
    { key: 'agendar', label: 'Agendar', icon: 'calendar', onPress: () => navigation.navigate('Agendar') },
    { key: 'consultas', label: 'Sessões', icon: 'list', onPress: () => navigation.navigate('Consultas') },
    { key: 'diario', label: 'Diário', icon: 'edit-3', onPress: () => navigation.navigate('Diario') },
    { key: 'perfil', label: 'Perfil', icon: 'user', onPress: () => navigation.navigate('Perfil') },
    { key: 'medicos', label: 'Médicos', icon: 'briefcase', onPress: () => navigation.navigate('Medicos') },
  ];

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.sage} />
        }
      >
        <View style={styles.brandRow}>
          <Image source={icone} style={styles.brandIcon} resizeMode="contain" />
          <View style={styles.avatar} />
        </View>

        <Text style={styles.eyebrow}>{data.saudacao}</Text>
        <Text style={styles.name}>{data.nomePaciente}</Text>

        {data.proximaConsulta ? (
          <View style={styles.apptCard}>
            <Text style={styles.apptEyebrow}>Próxima sessão</Text>
            <Text style={styles.apptDoc}>{data.proximaConsulta.medico}</Text>
            <Text style={styles.apptSpec}>
              {data.proximaConsulta.especialidade} · {data.proximaConsulta.local}
            </Text>
            <View style={styles.apptHr} />
            <View style={styles.apptBottom}>
              <View>
                <Text style={styles.apptWhen}>{data.proximaConsulta.dataHoraFormatada}</Text>
                <Text style={styles.apptRel}>{data.proximaConsulta.relativo}</Text>
                <TouchableOpacity onPress={() => navigation.navigate('Mapa')}>
                  <Text style={styles.apptLink}>Ver no mapa</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.apptCode}>Nº {data.proximaConsulta.protocolo}</Text>
            </View>
          </View>
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>Você não tem sessões agendadas.</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Agendar')}>
              <Text style={styles.apptLink}>Agendar agora</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.quickGrid}>
          {quickActions.map((a) => (
            <TouchableOpacity key={a.key} style={styles.quickItem} onPress={a.onPress}>
              <View style={styles.quickIcon}>
                <Feather name={a.icon} size={18} color={colors.sage} />
              </View>
              <Text style={styles.quickLabel}>{a.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {data.lembretes?.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>Lembretes</Text>
            {data.lembretes.map((l) => (
              <View key={l.id} style={styles.notice}>
                <Feather name="bell" size={15} color={colors.lavender} style={{ marginTop: 1 }} />
                <Text style={styles.noticeText}>{l.mensagem}</Text>
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  center: { justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  content: { padding: 20, paddingBottom: 40 },

  errorText: { color: colors.muted, fontSize: 14, textAlign: 'center', marginBottom: 14 },
  retryBtn: {
    backgroundColor: colors.sage,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  retryText: { color: '#fff', fontWeight: '600', fontSize: 13 },

  brandRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  brandIcon: { width: 32, height: 32 },
  avatar: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border },

  eyebrow: { fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: colors.muted, marginTop: 20 },
  name: { fontSize: 22, fontWeight: '700', color: colors.ink, marginTop: 2 },

  apptCard: {
    marginTop: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 18,
  },
  apptEyebrow: { fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', color: colors.lavender, marginBottom: 8, fontWeight: '600' },
  apptDoc: { fontSize: 18, fontWeight: '700', color: colors.ink },
  apptSpec: { fontSize: 12, color: colors.muted, marginTop: 2, marginBottom: 14 },
  apptHr: { borderTopWidth: 1, borderTopColor: colors.border, marginBottom: 14 },
  apptBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  apptWhen: { fontSize: 18, color: colors.ink, fontWeight: '600' },
  apptRel: { fontSize: 11, color: colors.muted, marginTop: 2 },
  apptLink: { fontSize: 12, color: colors.sage, fontWeight: '600', marginTop: 8 },
  apptCode: { fontSize: 11, color: colors.muted },

  emptyCard: {
    marginTop: 20,
    backgroundColor: colors.sageSoft,
    borderRadius: 14,
    padding: 16,
  },
  emptyText: { fontSize: 13, color: colors.ink, marginBottom: 6 },

  quickGrid: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 22 },
  quickItem: { alignItems: 'center', gap: 8, flex: 1 },
  quickIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickLabel: { fontSize: 10, fontWeight: '600', color: colors.ink, textAlign: 'center' },

  sectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', color: colors.muted, marginTop: 26, marginBottom: 10 },
  notice: { flexDirection: 'row', gap: 10, backgroundColor: colors.lavenderSoft, borderRadius: 12, padding: 13, marginBottom: 8 },
  noticeText: { fontSize: 12, color: colors.ink, lineHeight: 18, flex: 1 },
});