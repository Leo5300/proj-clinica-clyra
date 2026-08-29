import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import LoginScreen from '../screens/LoginScreen';
import HomeScreen from '../screens/HomeScreen';
import MedicosScreen from '../screens/MedicosScreen';
import CadastroMedicoScreen from '../screens/CadastroMedicoScreen';

// npx expo install @react-navigation/native @react-navigation/native-stack
//                  react-native-screens react-native-safe-area-context

const Stack = createNativeStackNavigator();

// TODO: conforme as telas forem chegando (Agendar, Consultas, Perfil, Mapa,
// Cadastro), só adicionar um <Stack.Screen> pra cada uma aqui. Os "name"
// precisam bater com o que usamos em navigation.navigate('X') dentro das telas.
export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Login"
        screenOptions={{ headerShown: false }}
      >
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Medicos" component={MedicosScreen} />
        <Stack.Screen name="CadastroMedico" component={CadastroMedicoScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}