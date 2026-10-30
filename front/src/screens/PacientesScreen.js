import React, { useState, useCallback } from "react";
import { Alert, TextInput, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import {
  buscarConsultas,
  buscarMedicos,
  buscarPacientes,
  excluirPaciente,
  SessaoExpirada,
  SemPermissao,
  ErroDaApi,
} from "../services/api";
import { useUsuario } from "../services/sessao";
import {
  Avatar,
  Botao,
  BotaoExcluir,
  ItemDeLista,
  Numeral,
  PlanoTopo,
  TelaDeLista,
  Texto,
  Vidro,
  ehAba,
} from "../components";
import {
  useTema,
  espaco,
  margemTela,
  raio,
  toque,
  estilosDeTexto,
  corDaArea,
} from "../theme";
import { dataDaConsulta } from "../services/lembretes";
import { nomeDoMes } from "../services/datas";
import TopoDaEquipe from "./home/TopoDaEquipe";

// Busca sem diferenciar maiusculas nem acentos ("joao" acha "João").
function normalizar(texto) {
  const minusculo = String(texto ?? "").toLowerCase();
  try {
    return minusculo.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  } catch (e) {
    return minusculo;
  }
}

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
  const { cores } = useTema();
  const insets = useSafeAreaInsets();

  const [pacientes, setPacientes] = useState([]);
  // id do paciente -> { quando, medico }: o ultimo atendimento, derivado
  // das consultas (a API nao tem esse campo).
  const [ultimos, setUltimos] = useState({});
  const [busca, setBusca] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);

  const irParaLogin = useCallback(() => {
    navigation.reset({ index: 0, routes: [{ name: "Login" }] });
  }, [navigation]);

  const carregarPacientes = useCallback(async () => {
    try {
      setErro(null);
      // O ultimo atendimento e um extra: se falhar, a lista sai sem ele.
      const [dados, consultas, medicos] = await Promise.all([
        buscarPacientes(),
        buscarConsultas().catch(() => []),
        buscarMedicos().catch(() => []),
      ]);
      setPacientes(dados);

      const agora = new Date();
      const porId = Object.fromEntries(medicos.map((m) => [String(m.id), m]));
      const mapa = {};
      consultas.forEach((c) => {
        const quando = dataDaConsulta(c);
        if (quando > agora) return;
        const atual = mapa[String(c.pacienteId)];
        if (!atual || quando > atual.quando) {
          mapa[String(c.pacienteId)] = { quando, medico: porId[String(c.medicoId)] };
        }
      });
      setUltimos(mapa);
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

  const termo = normalizar(busca.trim());
  const digitos = busca.replace(/\D/g, "");
  const encontrados = pacientes.filter(
    (p) =>
      !termo ||
      normalizar(p.nome).includes(termo) ||
      (digitos && String(p.cpf ?? "").replace(/\D/g, "").includes(digitos)),
  );

  const linhaDoUltimo = (ultimo) => {
    const area = ultimo.medico?.area;
    const texto = [
      `${ultimo.quando.getDate()} ${nomeDoMes(ultimo.quando)}`,
      ultimo.medico?.nome,
      area,
    ]
      .filter(Boolean)
      .join(" · ");

    return (
      <>
        {area ? <Texto variante="legenda" cor={corDaArea(area, cores)}>● </Texto> : null}
        {texto}
      </>
    );
  };

  const renderItem = ({ item }) => {
    const ultimo = ultimos[String(item.id)];
    const base = ehMedico
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
        subtitulo={ultimo ? linhaDoUltimo(ultimo) : base || null}
        esquerda={<Avatar nome={item.nome} fotoUri={item.fotoUri} />}
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

  const topo = (
    <PlanoTopo
      fundo={cores.lavandaMaisClara}
      corTexto={cores.sobrePlano}
      style={{
        paddingTop: insets.top + espaco.xs,
        paddingHorizontal: margemTela + 2,
        paddingBottom: espaco.lg,
        gap: espaco.md,
      }}
    >
      <TopoDaEquipe usuario={usuario} navigation={navigation} corTexto={cores.sobrePlano} />
      <View style={{ gap: espaco.xs }}>
        <Texto variante="rotulo" cor={cores.sobrePlano2}>
          {ehMedico ? "Quem tem consulta com você" : "Cadastrados"}
        </Texto>
        <View
          accessible
          accessibilityRole="header"
          accessibilityLabel={`${pacientes.length} pacientes`}
          style={{ flexDirection: "row", alignItems: "flex-end", gap: espaco.sm }}
        >
          <Numeral valor={carregando ? "–" : pacientes.length} tamanho="grande" cor={cores.sobrePlano} />
          <Texto variante="titulo" cor={cores.sobrePlano} style={{ marginBottom: 12 }}>
            {pacientes.length === 1 ? "paciente" : "pacientes"}
          </Texto>
        </View>
      </View>
      <Vidro raio={raio.capsula}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: espaco.xs,
            minHeight: toque.minimo,
            paddingHorizontal: espaco.md,
          }}
        >
          <Feather name="search" size={18} color={cores.apoio} />
          <TextInput
            value={busca}
            onChangeText={setBusca}
            placeholder="Buscar paciente"
            placeholderTextColor={cores.apoio}
            accessibilityLabel="Buscar paciente por nome ou CPF"
            autoCorrect={false}
            style={[estilosDeTexto.corpo, { flex: 1, color: cores.tinta, paddingVertical: 10 }]}
          />
        </View>
      </Vidro>
    </PlanoTopo>
  );

  const cabecalhoDaLista = (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
      <Texto variante="titulo" accessibilityRole="header">
        {ehMedico ? "Meus pacientes" : "Pacientes"}
      </Texto>
      {ehMedico ? null : (
        <Botao
          variante="texto"
          compacto
          titulo="Novo paciente"
          onPress={() => navigation.navigate("CadastroPaciente")}
        />
      )}
    </View>
  );

  return (
    <TelaDeLista
      titulo={ehMedico ? "Meus pacientes" : "Pacientes"}
      navigation={navigation}
      abaAtual={comoAba ? "Pacientes" : null}
      topo={topo}
      cabecalhoDaLista={cabecalhoDaLista}
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
      dados={encontrados}
      keyExtractor={(item) => String(item.id)}
      renderItem={renderItem}
      vazio={
        busca.trim() && pacientes.length > 0
          ? { titulo: "Nenhum paciente encontrado", texto: "Confira o nome ou o CPF." }
          : ehMedico
          ? {
              ilustracao: true,
              titulo: "Nenhum paciente ainda",
              texto: "Quem marcar consulta com você aparece aqui.",
            }
          : {
              ilustracao: true,
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
