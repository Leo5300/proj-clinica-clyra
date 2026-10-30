import React, { useState, useCallback } from "react";
import { Alert } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import {
  buscarPacientes,
  excluirPaciente,
  SessaoExpirada,
  SemPermissao,
  ErroDaApi,
} from "../services/api";
import { useUsuario } from "../services/sessao";
import {
  Avatar,
  BotaoExcluir,
  ItemDeLista,
  TelaDeLista,
  ehAba,
} from "../components";

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
  const comoAba = ehAba(usuario?.perfil, "Pacientes");

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

  const renderItem = ({ item }) => {
    const subtitulo = ehMedico
      ? [
          item.dataNascimento
            ? `Nascimento ${dataParaExibir(item.dataNascimento)}`
            : null,
          item.telefone,
        ]
          .filter(Boolean)
          .join(" · ")
      : `CPF ${item.cpf}`;

    return (
      <ItemDeLista
        titulo={item.nome}
        subtitulo={subtitulo || null}
        detalhe={ehMedico ? null : item.email}
        esquerda={<Avatar nome={item.nome} fotoUri={item.fotoUri} tom="neutro" />}
        seta={ehMedico}
        accessibilityLabel={`Abrir ${item.nome}`}
        onPress={() => abrir(item)}
        direita={
          ehMedico ? null : (
            <BotaoExcluir
              rotulo={`Excluir ${item.nome}`}
              onPress={() => confirmarExclusao(item)}
            />
          )
        }
      />
    );
  };

  return (
    <TelaDeLista
      titulo={ehMedico ? "Meus pacientes" : "Pacientes"}
      subtitulo={
        ehMedico ? "Quem tem consulta com você." : "Cadastro dos pacientes da clínica."
      }
      navigation={navigation}
      abaAtual={comoAba ? "Pacientes" : null}
      acaoNova={
        ehMedico
          ? null
          : {
              rotulo: "Cadastrar paciente",
              onPress: () => navigation.navigate("CadastroPaciente"),
            }
      }
      carregando={carregando}
      erro={erro}
      aoTentar={carregarPacientes}
      dados={pacientes}
      keyExtractor={(item) => String(item.id)}
      renderItem={renderItem}
      vazio={
        ehMedico
          ? {
              titulo: "Nenhum paciente ainda",
              texto: "Quem marcar consulta com você aparece aqui.",
            }
          : {
              titulo: "Nenhum paciente cadastrado",
              texto: "Cadastre o primeiro para poder agendar.",
              acao: {
                titulo: "Cadastrar paciente",
                onPress: () => navigation.navigate("CadastroPaciente"),
              },
            }
      }
    />
  );
}
