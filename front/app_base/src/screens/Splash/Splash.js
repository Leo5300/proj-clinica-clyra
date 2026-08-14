import React, { useEffect } from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';

const Logo = require('../../../assets/logo.png')

const Splash = ({ navigation }) => {
  useEffect(() => {
    // Simula o carregamento de recursos ou APIs
    setTimeout(() => {
      // Transiciona para a tela principal/menu
      navigation.replace('Menu');
    }, 3000); // 3 segundos
  }, []);

  return (
    <View style={styles.container}>
      <Image style={styles.logo} source={Logo} />
      <Text>Carregando...</Text>
    </View>
  );
};

// Crie seus estilos usando StyleSheet.create
const styles = StyleSheet.create({
  container: {
    flex: 1,
    // Note que as propriedades de layout e valores são sem aspas (exceto cores)
    justifyContent: 'center', 
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  title: {
    textAlign: 'center',
    fontSize: 16, 
    fontWeight: 'bold', // Use 'bold' como string ou o número (ex: '700')
  },
  logo: {
    // ESSENCIAL para imagens locais: definir width e height
    width: '70%', 
    height: '70%',
    resizeMode: 'contain'    // Você também pode usar valores absolutos: width: 200, height: 200,
  },
});
export default Splash;