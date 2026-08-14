// src/components/BotaoMenu.js
import React from 'react';
import { 
  TouchableOpacity, // Usamos TouchableOpacity para criar um botão customizável
  Text, 
  Image,
  View, 
  StyleSheet, 
  Dimensions 
} from 'react-native';

// Obter a largura da tela para calcular o tamanho do botão
const screenWidth = Dimensions.get('window').width;

// Define a largura base do botão (exemplo: 90% da tela)
// NOTA: Se o BotaoMenu estiver em um contêiner com padding, a largura será 
// 90% da largura da tela menos os paddings.
const BUTTON_WIDTH_PERCENTAGE = 0.9;
const buttonWidth = screenWidth * BUTTON_WIDTH_PERCENTAGE; 

// A altura será 80% da largura do botão
const buttonHeight = buttonWidth * 0.5; 

// Este é um componente reutilizável
const BotaoMenu = ({ icone, titulo, onPress }) => {
  return (
    // TouchableOpacity permite que o botão seja pressionável
    <TouchableOpacity
      style={styles.botao}
      onPress={onPress}
      activeOpacity={0.7} // Define a opacidade ao ser pressionado
    >
      {/* Verifica se um ícone foi passado e o renderiza */}
      {icone && (
        <Image
          source={icone}
          style={styles.icone}
          resizeMode="contain"
        />
      )}
      <Text style={styles.titulo}>{titulo}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  botao: {
    // 1. Largura e Altura com base nas dimensões calculadas
    width: buttonWidth,
    height: buttonHeight,
    
    // 2. Borda Arredondada
    borderRadius: 15, // Ajuste o raio conforme desejar
    
    // 3. Centraliza o conteúdo (ícone e texto) verticalmente e horizontalmente
    justifyContent: 'center',
    alignItems: 'center',
    
    // Estilos Visuais
    backgroundColor: '#007AFF', // Cor de fundo do botão (Exemplo: Azul)
    padding: 10,
    marginVertical: 5, // Espaçamento vertical entre botões
    alignSelf: 'center', // Centraliza o botão na tela se ele for menor que o contêiner
    
    // Adiciona uma sombra básica (opcional)
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5, // Para Android
  },
  icone: {
    // Define o tamanho do ícone em relação à altura total do botão
    width: '40%', 
    height: '40%', 
    marginBottom: 5,
  },
  titulo: {
    color: '#fff',
    fontSize: 14,
    textAlign: 'center',
    fontWeight: 'bold',
  },
});

export default BotaoMenu;