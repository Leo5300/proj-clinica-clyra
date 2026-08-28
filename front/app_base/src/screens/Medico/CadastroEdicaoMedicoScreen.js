import React from 'react';
import MedicoForm from '../../components/MedicoForm'; // Ajuste o caminho
import { View } from 'react-native';
import { useRoute } from '@react-navigation/native'; // Hook do React Navigation

const CadastroEdicaoMedicoScreen = ({ route, navigation }) => {
  // A prop 'medico' virá via route.params
  const { medico } = route.params || {};

  const handleSave = (novoDadosMedico) => {
    // Aqui é onde você faria a chamada de API ou atualizaria o estado global
    console.log('Dados a serem salvos/editados:', novoDadosMedico);
    
    // Supondo que você use uma função de contexto ou Redux para atualizar o estado
    // Aqui, apenas chamamos o goBack() após o alerta no MedicoForm.js
  };

  const handleCancel = () => {
    navigation.goBack();
  };

  return (
    <View style={{ flex: 1 }}>
      <MedicoForm
        medico={medico} // Passa o objeto médico (ou undefined/null)
        onSave={handleSave}
        onCancel={handleCancel}
        navigation={navigation}
      />
    </View>
  );
};

export default CadastroEdicaoMedicoScreen;