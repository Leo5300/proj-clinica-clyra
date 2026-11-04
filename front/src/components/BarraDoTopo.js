// Barra de status da tela com topo colorido: icones claros sobre a tinta e o verde, escuros sobre lavanda, lilas e menta. clara (icones claros). So vale enquanto a tela esta na frente; fora dela, a barra volta a seguir o tema (App.js).
import React from 'react';
import { useIsFocused } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';

export default function BarraDoTopo({ clara }) {
  const focada = useIsFocused();
  return focada ? <StatusBar style={clara ? 'light' : 'dark'} /> : null;
}
