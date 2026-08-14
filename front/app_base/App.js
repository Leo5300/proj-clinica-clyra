// App.js (Usando React Navigation como exemplo de estrutura profissional)
import React, { useState } from 'react';
import {View, Text, StyleSheet} from 'react-native'
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

// Importa todos os componentes de tela
import Splash from './src/screens/Splash/Splash';
import MenuScreen from './src/screens/Menu/MenuScreen';
import Medico from './src/screens/Medico/Medico';
//import Op2Screen from './src/screens/Paciente/Paciente';
//import Op3Screen from './src/screens/Consulta/Consulta';
import CadastroEdicaoMedicoScreen from './src/screens/Medico/CadastroEdicaoMedicoScreen';

const Stack = createStackNavigator();

function App() {
  const [medicos, setMedicos] = useState([
    {id:1, "nome":"João de Oliveira", "especialidade":"Cardiologista", "crm": "12345/MG", "email": "joao@clinica.com", "telefone": "(31) 98765-4321", "endereco": "Rua A, 100"},
    {id:2, "nome":"Antônio de Oliveira", "especialidade":"Pediatra", "crm": "23456/MG", "email": "antonio@clinica.com", "telefone": "(31) 99876-5432", "endereco": "Av. B, 200"},
    {id:3, "nome":"Maria da Silva", "especialidade":"Dermatologista", "crm": "34567/SP", "email": "maria@clinica.com", "telefone": "(11) 97654-3210", "endereco": "Rua C, 300"},
    {id:4, "nome":"Beatriz Souza", "especialidade":"Ginecologista", "crm": "45678/RJ", "email": "beatriz@clinica.com", "telefone": "(21) 96543-2109", "endereco": "Av. D, 400"},
    {id:5, "nome":"Carlos Santos", "especialidade":"Neurologista", "crm": "56789/BA", "email": "carlos@clinica.com", "telefone": "(71) 95432-1098", "endereco": "Praça E, 500"},
    // Adicionei mais dados para o agrupamento e expansão funcionar
  ]);
  const [pacientes, setPacientes] = useState([]);
  const [consultas, setConsultas] = useState([]);


  // Função que passa os dados de 'medicos' para a tela 'Op1'
  const MedicoList = (props) => (
    <Medico {...props} medicos={medicos} />
  );
  
  
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Splash">
        {/* A tela de Splash é a primeira, sem cabeçalho */}
        <Stack.Screen name="Splash" component={Splash} options={{ headerShown: false }} />
        {/* A tela Menu é o ponto de partida após o carregamento */}
        <Stack.Screen name="Menu" component={MenuScreen} options={{ title: 'Menu Principal' }} />
        
        
        <Stack.Screen name="Medicos" component={MedicoList} options={{ title: 'Médico(a)s' }} />
        {/*<Stack.Screen name="Pacientes" component={Op2Screen} options={{ title: 'Pacientes' }} />
        <Stack.Screen name="Consultas" component={Op3Screen} options={{ title: 'Consultas' }} /> */}
        <Stack.Screen name="MedicoForm" component={CadastroEdicaoMedicoScreen} options={{ title: 'Gerenciar Médico' }} />
        {/* Adicionei uma tela temporária para as ações do card */}
        <Stack.Screen name="EmConstrucao" component={() => (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <Text style={{ fontSize: 24 }}>Em Construção!</Text>
            </View>
        )} options={{ title: 'Em Construção' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default App; 