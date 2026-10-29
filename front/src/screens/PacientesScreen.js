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
import {
  buscarPacientes,
  excluirPaciente,
  SessaoExpirada,
  SemPermissao,
  ErroDaApi,
} from "../services/api";
import { useUsuario } from "../services/sessao";

const colors = {
  bg: "#F5F5F2",
  surface: "#FFFFFF",
  border: "#E2E1DB",
  ink: "#4A5560",
  muted: "#8B909A",
  sage: "#4B7776",
  danger: "#B0555F",
};

// Icones de 18-22 px: o hitSlop leva a area de toque aos 44 px minimos.
const AREA_DE_TOQUE = { top: 11, bottom: 11, left: 11, right: 11 };

// "1990-04-12" -> "12/04/1990"
function dataParaExibir(iso) {
  const [ano, mes, dia] = String(iso ?? "").split("-");
  return ano && mes && dia ? `${dia}/${mes}/${ano}` : "";
}

export default function PacientesScreen({ navigation }) {
  // Recepcao cadastra e exclui. O medico so consulta os pacientes que tem
  // consulta com ele -- o servidor ja devolve so esses, sem CPF, e-mail
  // nem endereco.
  const { usuario } = useUsuario();
  const ehMedico = usuario?.perfil === "medico";

  const [pacientes, setPacientes] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);

  const irParaLogin = useCallback(() => {
    navigation.reset({ index: 0, routes: [{ name: "Login" }] });
  }, [navigation]);

  const carregarPacientes = useCallback(async () => {
    try {
      setErro(null);
      const dados = await buscarPacientes();
      setPacientes(dados);
    } catch (e) {
      if (e instanceof SessaoExpirada) {
        irParaLogin();
        return;
      }

      setErro(
        e instanceof SemPermissao
          ? e.mensagem ?? "Você não tem permissão para isso."
          : "Não foi possível carregar os pacientes agora.",
      );
    } finally {
      setCarregando(false);
    }
  }, [irParaLogin]);

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
      if (e instanceof SessaoExpirada) {
        irParaLogin();
        return;
      }

      // 409: o servidor diz o que impede (consulta marcada) e o que fazer.
      if (e instanceof ErroDaApi && e.mensagem) {
        Alert.alert("Não foi possível excluir", e.mensagem);
        return;
      }

      Alert.alert("Erro", "Não foi possível excluir o paciente agora.");
    }
  };

  const abrir = (paciente) => {
    navigation.navigate(
      "CadastroPaciente",
      ehMedico ? { paciente, somenteLeitura: true } : { paciente },
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

        <Text style={styles.title}>
          {ehMedico ? "Meus pacientes" : "Pacientes"}
        </Text>

        {ehMedico ? (
          <View style={styles.headerSpacer} />
        ) : (
          <TouchableOpacity
            onPress={() => navigation.navigate("CadastroPaciente")}
            accessibilityRole="button"
            accessibilityLabel="Cadastrar paciente"
            hitSlop={AREA_DE_TOQUE}
          >
            <Feather name="plus" size={22} color={colors.ink} />
          </TouchableOpacity>
        )}
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
          renderItem={({ item }) => (
            <View style={styles.card}>
              <TouchableOpacity
                style={styles.cardInfo}
                onPress={() => abrir(item)}
              >
                <Text style={styles.nome}>{item.nome}</Text>
                {ehMedico ? (
                  <>
                    {item.dataNascimento ? (
                      <Text style={styles.cpf}>
                        Nascimento {dataParaExibir(item.dataNascimento)}
                      </Text>
                    ) : null}
                    {item.telefone ? (
                      <Text style={styles.detalhe}>{item.telefone}</Text>
                    ) : null}
                  </>
                ) : (
                  <>
                    <Text style={styles.cpf}>CPF {item.cpf}</Text>
                    <Text style={styles.detalhe}>{item.email}</Text>
                  </>
                )}
              </TouchableOpacity>

              {!ehMedico && (
                <TouchableOpacity
                  onPress={() => confirmarExclusao(item)}
                  accessibilityRole="button"
                  accessibilityLabel={`Excluir ${item.nome}`}
                  hitSlop={AREA_DE_TOQUE}
                >
                  <Feather name="trash-2" size={18} color={colors.danger} />
                </TouchableOpacity>
              )}
            </View>
          )}
          ListEmptyComponent={
            <Text style={styles.emptyText}>
              {ehMedico
                ? "Você ainda não tem pacientes com consulta marcada."
                : "Nenhum paciente cadastrado."}
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
  headerSpacer: {
    width: 22,
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
    paddingHorizontal: 20,
  },
});
