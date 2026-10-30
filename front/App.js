import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './src/navigation/AppNavigator';
import { configurarHandler, prepararCanal } from './src/services/lembretes';
import { TemaProvider, useTema } from './src/theme';

// Uma vez so, fora de qualquer componente: define o que acontece quando
// um lembrete dispara com o app ABERTO. Sem isto ele nao aparece.
configurarHandler();

// Barra de status acompanha o tema escolhido no app, nao so o do sistema.
function BarraDeStatus() {
  const { escuro } = useTema();
  return <StatusBar style={escuro ? 'light' : 'dark'} />;
}

export default function App() {
  useEffect(() => {
    // Canal do Android criado na inicializacao, antes de qualquer
    // lembrete ser agendado.
    prepararCanal();
  }, []);

  return (
    <SafeAreaProvider>
      <TemaProvider>
        <AppNavigator />
        <BarraDeStatus />
      </TemaProvider>
    </SafeAreaProvider>
  );
}
