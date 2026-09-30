import React, { useEffect, useState, useRef, useCallback } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import {
  NavigationContainer,
  createNavigationContainerRef,
} from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import LoginScreen from "../screens/LoginScreen";
import LoginBiometricoScreen from "../screens/LoginBiometricoScreen";
import HomeScreen from "../screens/HomeScreen";
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
import ComoChegarScreen from "../screens/ComoChegarScreen";
import SinaisVitaisScreen from "../screens/SinaisVitaisScreen";

import { estaLogado } from "../services/sessao";
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
const ROTAS_DE_ENTRADA = ["Login", "LoginBiometrico"];

export default function AppNavigator() {
  // null = ainda verificando o cofre. Sem esse estado o app pisca a tela de
  // Login para quem ja estava autenticado.
  const [logado, setLogado] = useState(null);

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

  if (logado === null) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4B7776" />
      </View>
    );
  }

  return (
    <NavigationContainer
      ref={navigationRef}
      onReady={aoFicarPronto}
      onStateChange={irParaDestino}
    >
      <Stack.Navigator
        initialRouteName={logado ? "LoginBiometrico" : "Login"}
        screenOptions={{ headerShown: false }}
      >
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen
          name="LoginBiometrico"
          component={LoginBiometricoScreen}
        />
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Medicos" component={MedicosScreen} />
        <Stack.Screen name="CadastroMedico" component={CadastroMedicoScreen} />
        <Stack.Screen name="Pacientes" component={PacientesScreen} />
        <Stack.Screen
          name="CadastroPaciente"
          component={CadastroPacienteScreen}
        />
        <Stack.Screen name="Horarios" component={HorariosScreen} />
        <Stack.Screen
          name="CadastroHorario"
          component={CadastroHorarioScreen}
        />
        <Stack.Screen name="Consultas" component={ConsultasScreen} />
        <Stack.Screen name="Agendar" component={AgendarConsultaScreen} />
        <Stack.Screen
          name="DetalheConsulta"
          component={DetalheConsultaScreen}
        />
        <Stack.Screen name="Especialidades" component={EspecialidadesScreen} />
        <Stack.Screen name="ComoChegar" component={ComoChegarScreen} />
        <Stack.Screen name="SinaisVitais" component={SinaisVitaisScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F5F5F2",
  },
});
