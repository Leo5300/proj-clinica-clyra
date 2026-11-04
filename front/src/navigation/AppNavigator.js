import React, { useEffect, useState, useRef, useCallback } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import {
  NavigationContainer,
  createNavigationContainerRef,
  DefaultTheme,
  DarkTheme,
} from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useFonts } from "expo-font";

import LoginScreen from "../screens/LoginScreen";
import LoginBiometricoScreen from "../screens/LoginBiometricoScreen";
import CriarContaScreen from "../screens/CriarContaScreen";
import TrocarSenhaScreen from "../screens/TrocarSenhaScreen";
import HomeScreen from "../screens/HomeScreen";
import PerfilScreen from "../screens/PerfilScreen";
import MedicosScreen from "../screens/MedicosScreen";
import CadastroMedicoScreen from "../screens/CadastroMedicoScreen";
import PacientesScreen from "../screens/PacientesScreen";
import CadastroPacienteScreen from "../screens/CadastroPacienteScreen";
import HorariosScreen from "../screens/HorariosScreen";
import CadastroHorarioScreen from "../screens/CadastroHorarioScreen";
import ConsultasScreen from "../screens/ConsultasScreen";
import AgendarConsultaScreen from "../screens/AgendarConsultaScreen";
import DetalheConsultaScreen from "../screens/DetalheConsultaScreen";
import EspecialidadesScreen from "../screens/EspecialidadesScreen";
import CadastroEspecialidadeScreen from "../screens/CadastroEspecialidadeScreen";
import ComoChegarScreen from "../screens/ComoChegarScreen";
import SinaisVitaisScreen from "../screens/SinaisVitaisScreen";
import CadastrosScreen from "../screens/CadastrosScreen";
import SemAcessoScreen from "../screens/SemAcessoScreen";

import { estaLogado, useUsuario } from "../services/sessao";
import { useTema, arquivosDeFonte } from "../theme";
import AvisoDeSessao from "../components/AvisoDeSessao";
import { podeAcessar } from "./permissoes";
import {
  ouvirToqueEmLembrete,
  obterToqueQueAbriuOApp,
} from "../services/lembretes";

const Stack = createNativeStackNavigator();

// Ref do NavigationContainer: permite navegar de FORA das telas -- e de
// fora das telas que chega o toque num lembrete.
const navigationRef = createNavigationContainerRef();

// Um toque em lembrete nunca pula a autenticacao. Enquanto o usuario
// estiver numa destas telas, o destino fica guardado e so e aberto depois
// que ele entrar (biometria ou senha).
const ROTAS_DE_ENTRADA = ["Login", "LoginBiometrico", "CriarConta", "TrocarSenha"];

// Envolve uma tela: so renderiza se o perfil logado pode abrir a rota.
// Fica fora do componente de proposito -- criado dentro do AppNavigator,
// seria um componente novo a cada render e a tela seria desmontada.
// Esconder a tela e experiencia de uso; quem protege os dados e o servidor.
function Carregando() {
  const { cores } = useTema();

  return (
    <View style={[styles.center, { backgroundColor: cores.papel }]}>
      <ActivityIndicator size="large" color={cores.acao} />
    </View>
  );
}

function protegida(Componente, nomeDaRota) {
  function TelaProtegida(props) {
    const { usuario, carregando } = useUsuario();

    if (carregando) {
      return <Carregando />;
    }

    if (!podeAcessar(usuario?.perfil, nomeDaRota)) {
      return <SemAcessoScreen {...props} />;
    }

    return <Componente {...props} />;
  }

  return TelaProtegida;
}

const TELAS = {
  TrocarSenha: protegida(TrocarSenhaScreen, "TrocarSenha"),
  Home: protegida(HomeScreen, "Home"),
  Perfil: protegida(PerfilScreen, "Perfil"),
  Medicos: protegida(MedicosScreen, "Medicos"),
  CadastroMedico: protegida(CadastroMedicoScreen, "CadastroMedico"),
  Pacientes: protegida(PacientesScreen, "Pacientes"),
  CadastroPaciente: protegida(CadastroPacienteScreen, "CadastroPaciente"),
  Horarios: protegida(HorariosScreen, "Horarios"),
  CadastroHorario: protegida(CadastroHorarioScreen, "CadastroHorario"),
  Consultas: protegida(ConsultasScreen, "Consultas"),
  Agendar: protegida(AgendarConsultaScreen, "Agendar"),
  DetalheConsulta: protegida(DetalheConsultaScreen, "DetalheConsulta"),
  Especialidades: protegida(EspecialidadesScreen, "Especialidades"),
  CadastroEspecialidade: protegida(
    CadastroEspecialidadeScreen,
    "CadastroEspecialidade",
  ),
  ComoChegar: protegida(ComoChegarScreen, "ComoChegar"),
  SinaisVitais: protegida(SinaisVitaisScreen, "SinaisVitais"),
  Cadastros: protegida(CadastrosScreen, "Cadastros"),
};

export default function AppNavigator() {
  // null = ainda verificando o cofre. Sem esse estado o app pisca a tela de
  // Login para quem ja estava autenticado.
  const [logado, setLogado] = useState(null);

  // Fontes carregadas antes da primeira tela, no mesmo indicador do
  // cofre: sem lampejo de letra trocada. Falha ao carregar nao trava o
  // app -- ele segue com a fonte do sistema.
  const [fontesProntas, erroDasFontes] = useFonts(arquivosDeFonte);
  const { cores, escuro } = useTema();

  // Consulta a abrir, vinda do toque num lembrete.
  const destinoPendenteRef = useRef(null);

  // Abre a consulta pendente, se ja for possivel: navegador pronto e
  // usuario fora das telas de entrada. Chamada no toque, quando o
  // navegador fica pronto e a cada troca de tela -- e assim que, depois do
  // login, o app segue sozinho para a consulta.
  const irParaDestino = useCallback(() => {
    const destino = destinoPendenteRef.current;
    if (!destino || !navigationRef.isReady()) return;

    const atual = navigationRef.getCurrentRoute()?.name;
    if (!atual || ROTAS_DE_ENTRADA.includes(atual)) return;

    destinoPendenteRef.current = null;
    navigationRef.navigate(destino.tela, {
      consultaId: destino.consultaId,
    });
  }, []);

  // Caminho A: app aberto ou em segundo plano.
  useEffect(() => {
    const inscricao = ouvirToqueEmLembrete((destino) => {
      destinoPendenteRef.current = destino;
      irParaDestino();
    });

    // Ouvinte esquecido e vazamento.
    return () => inscricao.remove();
  }, [irParaDestino]);

  // Caminho B: app FECHADO. O toque abriu o app antes de qualquer ouvinte
  // existir; o sistema guardou a resposta, lida quando o navegador fica
  // pronto.
  const aoFicarPronto = useCallback(async () => {
    const destino = await obterToqueQueAbriuOApp();
    if (destino) destinoPendenteRef.current = destino;
    irParaDestino();
  }, [irParaDestino]);

  useEffect(() => {
    const verificar = async () => {
      setLogado(await estaLogado());
    };
    verificar();
  }, []);

  if (logado === null || (!fontesProntas && !erroDasFontes)) {
    return <Carregando />;
  }

  // Fundo do navegador igual ao papel: sem lampejo branco entre telas.
  const base = escuro ? DarkTheme : DefaultTheme;
  const temaDaNavegacao = {
    ...base,
    colors: { ...base.colors, background: cores.papel, card: cores.papel },
  };

  // Sessao expirada: a tela aberta ja volta ao Login; a folha explica o
  // porque e garante a ida, caso a tela nao tenha ido.
  const irParaLogin = () => {
    if (!navigationRef.isReady()) return;
    if (navigationRef.getCurrentRoute()?.name === "Login") return;
    navigationRef.reset({ index: 0, routes: [{ name: "Login" }] });
  };

  return (
    <>
      <NavigationContainer
        ref={navigationRef}
        theme={temaDaNavegacao}
        onReady={aoFicarPronto}
        onStateChange={irParaDestino}
      >
        <Stack.Navigator
          initialRouteName={logado ? "LoginBiometrico" : "Login"}
          // Abas sao irmas: trocar de aba (viaAba) nunca anima.
          screenOptions={({ route }) => ({
            headerShown: false,
            animation: route.params?.viaAba ? "none" : "default",
          })}
        >
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen
            name="LoginBiometrico"
            component={LoginBiometricoScreen}
          />
          <Stack.Screen name="CriarConta" component={CriarContaScreen} />
          <Stack.Screen name="TrocarSenha" component={TELAS.TrocarSenha} />
          <Stack.Screen name="Home" component={TELAS.Home} />
          <Stack.Screen name="Perfil" component={TELAS.Perfil} />
          <Stack.Screen name="Medicos" component={TELAS.Medicos} />
          <Stack.Screen name="CadastroMedico" component={TELAS.CadastroMedico} />
          <Stack.Screen name="Pacientes" component={TELAS.Pacientes} />
          <Stack.Screen
            name="CadastroPaciente"
            component={TELAS.CadastroPaciente}
          />
          <Stack.Screen name="Horarios" component={TELAS.Horarios} />
          <Stack.Screen
            name="CadastroHorario"
            component={TELAS.CadastroHorario}
          />
          <Stack.Screen name="Consultas" component={TELAS.Consultas} />
          <Stack.Screen name="Agendar" component={TELAS.Agendar} />
          <Stack.Screen
            name="DetalheConsulta"
            component={TELAS.DetalheConsulta}
          />
          <Stack.Screen name="Especialidades" component={TELAS.Especialidades} />
          <Stack.Screen
            name="CadastroEspecialidade"
            component={TELAS.CadastroEspecialidade}
          />
          <Stack.Screen name="ComoChegar" component={TELAS.ComoChegar} />
          <Stack.Screen name="SinaisVitais" component={TELAS.SinaisVitais} />
          <Stack.Screen name="Cadastros" component={TELAS.Cadastros} />
        </Stack.Navigator>
      </NavigationContainer>
      <AvisoDeSessao aoEntrar={irParaLogin} />
    </>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
