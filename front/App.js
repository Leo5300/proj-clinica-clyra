import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import AppNavigator from './src/navigation/AppNavigator';
import { configurarHandler, prepararCanal } from './src/services/lembretes';

// Uma vez so, fora de qualquer componente: define o que acontece quando
// um lembrete dispara com o app ABERTO. Sem isto ele nao aparece.
configurarHandler();

export default function App() {
  useEffect(() => {
    // Canal do Android criado na inicializacao, antes de qualquer
    // lembrete ser agendado.
    prepararCanal();
  }, []);

  return (
    <>
      <AppNavigator />
      <StatusBar style="auto" />
    </>
  );
}