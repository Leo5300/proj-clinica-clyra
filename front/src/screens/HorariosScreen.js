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
import { buscarHorarios, excluirHorario } from '../services/api';

// TODO: mover para front/src/theme quando o ThemeContext existir.
// Mantemos a mesma paleta das telas ja existentes para evitar estilos
// diferentes entre os modulos.
const colors = {
  bg: '#F5F5F2',
  surface: '#FFFFFF',
  border: '#E2E1DB',
  ink: '#4A5560',
  muted: '#8B909A',
  sage: '#4B7776',
};

export default function HorariosScreen({ navigation }) {
  // Cada estado representa uma informacao diferente da tela, permitindo
  // tratar carregamento e erro sem esconder uma lista que ja foi carregada.
  const [horarios, setHorarios] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);

  const carregarHorarios = useCallback(async () => {
    try {
      setErro(null);
      setCarregando(true);

      const dados = await buscarHorarios();
      setHorarios(dados);
    } catch (e) {
      setErro('Nao foi possivel carregar os horarios agora.');
    } finally {
      setCarregando(false);
    }
  }, []);

  // Recarrega ao voltar para a tela para que alteracoes feitas no cadastro
  // ou edicao sejam refletidas sem depender de atualizacao manual.
  useFocusEffect(
    useCallback(() => {
      carregarHorarios();
    }, [carregarHorarios]),
  );

  const confirmarExclusao = (horario) => {
    Alert.alert(
      'Excluir horario',
      `Deseja excluir o horario de ${horario.diaSemana}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: () => excluir(horario.id),
        },
      ],
    );
  };

  const excluir = async (id) => {
    try {
      await excluirHorario(id);

      // O servidor continua sendo a fonte da verdade, entao a lista e
      // atualizada novamente depois da exclusao.
      carregarHorarios();
    } catch (e) {
      Alert.alert('Erro', 'Nao foi possivel excluir o horario agora.');
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Feather name="arrow-left" size={22} color={colors.ink} />
        </TouchableOpacity>

        <Text style={styles.title}>Horarios</Text>

        <TouchableOpacity
          onPress={() => navigation.navigate('CadastroHorario')}
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
            onPress={carregarHorarios}
          >
            <Text style={styles.retryText}>Tentar novamente</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={horarios}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <TouchableOpacity
                style={styles.cardInfo}
                onPress={() =>
                  navigation.navigate('CadastroHorario', {
                    horario: item,
                  })
                }
              >
                <Text style={styles.dia}>{item.diaSemana}</Text>

                <View style={styles.horarioLinha}>
                  <Feather
                    name="clock"
                    size={15}
                    color={colors.sage}
                  />

                  <Text style={styles.horario}>
                    {item.horaInicio} - {item.horaFim}
                  </Text>
                </View>

                <Text style={styles.detalhe}>
                  Medico ID: {item.medicoId}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => confirmarExclusao(item)}>
                <Feather
                  name="trash-2"
                  size={18}
                  color={colors.muted}
                />
              </TouchableOpacity>
            </View>
          )}
          ListEmptyComponent={
            <Text style={styles.emptyText}>
              Nenhum horario cadastrado.
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

  dia: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.ink,
  },

  horarioLinha: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },

  horario: {
    fontSize: 14,
    color: colors.sage,
    marginLeft: 7,
    fontWeight: '600',
  },

  detalhe: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 7,
  },

  emptyText: {
    textAlign: 'center',
    color: colors.muted,
    marginTop: 40,
  },
});