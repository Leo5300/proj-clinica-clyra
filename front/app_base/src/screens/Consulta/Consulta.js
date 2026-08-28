// src/screens/Op3Screen.js
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const Op3Screen = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Detalhes da Opção 3</Text>
      <Text>Esta seção explora Recursos Mobile como Notificações Locais, Push Notifications, Processamento Multithreads e Mapas [18].</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  heading: { fontSize: 22, marginBottom: 15 }
});

export default Op3Screen;