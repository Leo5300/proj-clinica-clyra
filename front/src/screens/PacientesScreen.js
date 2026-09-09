import React, { useState, useCallback } from "react";
import {
  SafeAreaView,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import { buscarPacientes, excluirPaciente } from "../services/api";

const colors = {
  bg: "#F5F5F2",
  surface: "#FFFFFF",
  border: "#E2E1DB",
  ink: "#4A5560",
  muted: "#8B909A",
  sage: "#4B7776",
  danger: "#B0555F",
};

export default function PacientesScreen({ navigation }) {
  const [pacientes, setPacientes] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);

  const carregarPacientes = useCallback(async () => {
    try {
      setErro(null);
      const dados = await buscarPacientes();
      setPacientes(dados);
    } catch (e) {
      setErro("Não foi possível carregar os pacientes agora.");
    } finally {
      setCarregando(false);
    }
  }, []);

  // A lista precisa consultar novamente o servidor ao voltar do formulário.
  useFocusEffect(
    useCallback(() => {
      carregarPacientes();
    }, [carregarPacientes]),
  );

  const confirmarExclusao = (paciente) => {
    Alert.alert("Excluir paciente", `Deseja excluir ${paciente.nome}?`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Excluir",
        style: "destructive",
        onPress: () => excluir(paciente.id),
      },
    ]);
  };

  const excluir = async (id) => {
    try {
      await excluirPaciente(id);

      // O servidor permanece como fonte da verdade após a exclusão.
      await carregarPacientes();
    } catch (e) {
      Alert.alert("Erro", "Não foi possível excluir o paciente agora.");
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Feather name="arrow-left" size={22} color={colors.ink} />
        </TouchableOpacity>

        <Text style={styles.title}>Pacientes</Text>

        <TouchableOpacity onPress={() => navigation.navigate("Cadastro")}>
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
          <TouchableOpacity style={styles.retryBtn} onPress={carregarPacientes}>
            <Text style={styles.retryText}>Tentar novamente</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={pacientes}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          Apague
          esse
          trecho
          e
          coloque:renderItem={({ item }) => (
            <View style={styles.card}>
              <TouchableOpacity
                style={styles.cardInfo}
                onPress={() =>
                  navigation.navigate("Cadastro", { paciente: item })
                }
              >
                <Text style={styles.nome}>{item.nome}</Text>
                <Text style={styles.cpf}>CPF {item.cpf}</Text>
                <Text style={styles.detalhe}>{item.email}</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => confirmarExclusao(item)}>
                <Feather name="trash-2" size={18} color={colors.danger} />
              </TouchableOpacity>
            </View>
          )}
          ListEmptyComponent={
            <Text style={styles.emptyText}>Nenhum paciente cadastrado.</Text>
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  title: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.ink,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  errorText: {
    color: colors.muted,
    fontSize: 14,
    textAlign: "center",
    marginBottom: 14,
  },
  retryBtn: {
    backgroundColor: colors.sage,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  retryText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 13,
  },
  list: {
    padding: 20,
    paddingBottom: 40,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
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
    fontWeight: "700",
    color: colors.ink,
  },
  cpf: {
    fontSize: 13,
    color: colors.sage,
    marginTop: 2,
  },
  detalhe: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 6,
  },
  emptyText: {
    textAlign: "center",
    color: colors.muted,
    marginTop: 40,
  },
});
