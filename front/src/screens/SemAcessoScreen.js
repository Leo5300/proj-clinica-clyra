import React from 'react';
import { View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useUsuario } from '../services/sessao';
import { Tela, Texto, Botao } from '../components';
import { useTema, espaco, margemTela } from '../theme';

// Aparece no lugar de uma tela que o perfil nao pode abrir (link antigo,
// toque em lembrete, navegacao feita por engano). Nenhum dado e buscado:
// mesmo que a tela abrisse, o servidor responderia 403.

export default function SemAcessoScreen({ navigation }) {
  const { usuario } = useUsuario();
  const { cores } = useTema();

  // Sem sessao, o "inicio" e o Login: a Home tambem estaria bloqueada.
  const voltarAoInicio = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: usuario ? 'Home' : 'Login' }],
    });
  };

  return (
    <Tela>
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          paddingHorizontal: margemTela,
          gap: espaco.sm,
        }}
      >
        <View
          style={{
            width: 56,
            height: 56,
            borderRadius: 16,
            borderCurve: 'continuous',
            backgroundColor: cores.lavandaSuave,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: espaco.xs,
          }}
        >
          <Feather name="lock" size={24} color={cores.sobreLavandaSuave} />
        </View>

        <Texto variante="titulo" accessibilityRole="header">
          Sem acesso a esta área
        </Texto>

        <Texto variante="corpo" cor="tinta2">
          Seu perfil não tem permissão para abrir esta tela.
        </Texto>

        <Botao
          titulo="Voltar ao início"
          onPress={voltarAoInicio}
          style={{ marginTop: espaco.md }}
        />
      </View>
    </Tela>
  );
}
