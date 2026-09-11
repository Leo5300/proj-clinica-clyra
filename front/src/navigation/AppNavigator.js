import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import LoginScreen from '../screens/LoginScreen';
import HomeScreen from '../screens/HomeScreen';
import MedicosScreen from '../screens/MedicosScreen';
import CadastroMedicoScreen from '../screens/CadastroMedicoScreen';
import PacientesScreen from '../screens/PacientesScreen';
import CadastroPacienteScreen from '../screens/CadastroPacienteScreen';
import HorariosScreen from '../screens/HorariosScreen';
import CadastroHorarioScreen from '../screens/CadastroHorarioScreen';

import { estaLogado } from '../services/sessao';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  // null = ainda verificando o cofre. Sem esse estado o app pisca a tela de
  // Login para quem ja estava autenticado.
  const [logado, setLogado] = useState(null);

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
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName={logado ? 'Home' : 'Login'}
        screenOptions={{ headerShown: false }}
      >
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Medicos" component={MedicosScreen} />
        <Stack.Screen name="CadastroMedico" component={CadastroMedicoScreen} />
        <Stack.Screen name="Pacientes" component={PacientesScreen} />
        <Stack.Screen name="CadastroPaciente" component={CadastroPacienteScreen} />
        <Stack.Screen name="Horarios" component={HorariosScreen} />
        <Stack.Screen name="CadastroHorario" component={CadastroHorarioScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F2',
  },
});