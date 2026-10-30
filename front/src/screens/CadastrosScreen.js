import React from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import {
  BarraAbas,
  ComVidro,
  ItemDeLista,
  Texto,
  useEspacoDaBarra,
} from '../components';
import { useTema, espaco, margemTela, raio } from '../theme';

// Aba Cadastros da recepcao: junta o que a clinica mantem e muda pouco
// (medicos, horarios de atendimento e especialidades). So abre caminho;
// cada lista continua na propria rota.

const CADASTROS = [
  {
    rota: 'Medicos',
    titulo: 'Profissionais',
    texto: 'Profissionais, especialidade e acesso ao app',
    icone: 'briefcase',
  },
  {
    rota: 'Horarios',
    titulo: 'Horários de atendimento',
    texto: 'Dias e faixas em que cada profissional atende',
    icone: 'clock',
  },
  {
    rota: 'Especialidades',
    titulo: 'Especialidades',
    texto: 'Áreas que aparecem no agendamento',
    icone: 'award',
  },
];

export default function CadastrosScreen({ navigation }) {
  const { cores } = useTema();
  const insets = useSafeAreaInsets();
  const espacoDaBarra = useEspacoDaBarra();

  return (
    <View style={{ flex: 1, backgroundColor: cores.papel }}>
      <ComVidro
        conteudo={
          <Animated.ScrollView
            contentContainerStyle={{
              paddingTop: insets.top + espaco.xs + espaco.md,
              paddingHorizontal: margemTela + 2,
              paddingBottom: espacoDaBarra,
              gap: espaco.lg,
            }}
          >
            <View style={{ gap: 4 }}>
              <Texto variante="tituloGrande" accessibilityRole="header">
                Cadastros
              </Texto>
              <Texto variante="rotulo" cor="apoio">
                O que a clínica mantém e muda pouco.
              </Texto>
            </View>

            <View
              style={{
                backgroundColor: cores.superficie,
                borderColor: cores.linha,
                borderWidth: 1,
                borderRadius: raio.cartao,
                borderCurve: 'continuous',
                paddingHorizontal: espaco.md,
              }}
            >
              {CADASTROS.map((item, indice) => (
                <ItemDeLista
                  key={item.rota}
                  titulo={item.titulo}
                  subtitulo={item.texto}
                  esquerda={
                    <View
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: raio.campo,
                        backgroundColor: cores.salviaSuave,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Feather name={item.icone} size={20} color={cores.sobreSalviaSuave} />
                    </View>
                  }
                  seta
                  divisor={indice < CADASTROS.length - 1}
                  onPress={() => navigation.navigate(item.rota)}
                />
              ))}
            </View>
          </Animated.ScrollView>
        }
      >
        <BarraAbas navigation={navigation} atual="Cadastros" />
      </ComVidro>
    </View>
  );
}
