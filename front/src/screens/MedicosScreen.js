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
import { buscarMedicos, excluirMedico } from '../services/api';

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

  // useFocusEffect (nao useEffect) para a lista recarregar toda vez que a
  // tela volta ao foco -- inclusive ao voltar do formulario de cadastro/edicao.
  useFocusEffect(
    useCallback(() => {
      carregarMedicos();
    }, [carregarMedicos]),
  );

  const confirmarExclusao = (medico) => {
    Alert.alert(
      'Excluir médico',
      `Deseja excluir ${medico.nome}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Excluir', style: 'destructive', onPress: () => excluir(medico.id) },
      ],
    );
  };

  const excluir = async (id) => {
    try {
      await excluirMedico(id);
      // O servidor e a fonte da verdade: recarrega a lista dele em vez de
      // so remover o item do array local.
      carregarMedicos();
    } catch (e) {
      Alert.alert('Erro', 'Não foi possível excluir o médico agora.');
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Feather name="arrow-left" size={22} color={colors.ink} />
        </TouchableOpacity>
        <Text style={styles.title}>Médicos</Text>
        <TouchableOpacity onPress={() => navigation.navigate('CadastroMedico')}>
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
              <TouchableOpacity
                style={styles.cardInfo}
                onPress={() => navigation.navigate('CadastroMedico', { medico: item })}
              >
                <Text style={styles.nome}>{item.nome}</Text>
                <Text style={styles.especialidade}>{item.especialidade}</Text>
                <Text style={styles.detalhe}>CRM {item.crm}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => confirmarExclusao(item)}>
                <Feather name="trash-2" size={18} color={colors.muted} />
              </TouchableOpacity>
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
  cardInfo: { flex: 1, marginRight: 12 },
  nome: { fontSize: 15, fontWeight: '700', color: colors.ink },
  especialidade: { fontSize: 13, color: colors.sage, marginTop: 2 },
  detalhe: { fontSize: 12, color: colors.muted, marginTop: 6 },
  emptyText: { textAlign: 'center', color: colors.muted, marginTop: 40 },
});
