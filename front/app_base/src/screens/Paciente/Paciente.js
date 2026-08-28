// src/screens/Op2Screen.js
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const Op2Screen = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Detalhes da Opção 2</Text>
      <Text>Esta seção foca em Integração com APIs, incluindo Requisições HTTP/HTTPS e Consumo de Web Services [16].</Text>
      {/* O uso de Hooks, como o useState, é fundamental para adicionar interatividade e gerenciar dados [9, 17] */}
    </View>
  );
};
const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, justifyContent: 'space-around' },
  heading: { fontSize: 28, marginBottom: 40, textAlign: 'center' }
});

export default Op2Screen;