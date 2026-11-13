import React from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import {
  Cabecalho,
  ComVidro,
  ItemDeLista,
  Texto,
  useRolagem,
} from '../components';
import { useTema, espaco, margemTela, raio, toque } from '../theme';

// Aberta pelo "+" da recepcao: os atalhos para criar (consulta, paciente,
// profissional) e o que a clinica mantem e muda pouco (horarios e
// especialidades). So abre caminho; cada cadastro continua na propria rota.

const NOVOS = [
  {
    rota: 'Agendar',
    titulo: 'Nova consulta',
    texto: 'Escolha o paciente, o profissional e o horário',
    icone: 'calendar',
  },
  {
    rota: 'CadastroPaciente',
    titulo: 'Novo paciente',
    texto: 'Dados pessoais e acesso ao app',
    icone: 'user-plus',
  },
  {
    rota: 'CadastroMedico',
    titulo: 'Novo profissional',
    texto: 'Especialidade, registro e acesso ao app',
    icone: 'briefcase',
  },
];

const CADASTROS = [
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

const DA_AGENDA = [
  {
    rota: 'SincronizarAgenda',
    titulo: 'Verificar agenda',
    texto: 'Procura horários sobrepostos na agenda de cada profissional',
    icone: 'refresh-cw',
  },
];

function Grupo({ titulo, itens, navigation }) {
  const { cores } = useTema();

  return (
    <View style={{ gap: espaco.xs }}>
      <Texto variante="secao" accessibilityRole="header">
        {titulo}
      </Texto>
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
        {itens.map((item, indice) => (
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
                  backgroundColor: cores.lavandaSuave,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Feather name={item.icone} size={20} color={cores.sobreLavandaSuave} />
              </View>
            }
            seta
            divisor={indice < itens.length - 1}
            onPress={() => navigation.navigate(item.rota)}
          />
        ))}
      </View>
    </View>
  );
}

export default function CadastrosScreen({ navigation }) {
  const { cores } = useTema();
  const insets = useSafeAreaInsets();
  const { aoRolar, rolou } = useRolagem(50);

  return (
    <View style={{ flex: 1, backgroundColor: cores.papel }}>
      <ComVidro
        conteudo={
          <Animated.ScrollView
            onScroll={aoRolar}
            scrollEventThrottle={16}
            contentContainerStyle={{
              paddingTop: insets.top + espaco.xs + toque.minimo + espaco.lg,
              paddingHorizontal: margemTela + 2,
              paddingBottom: insets.bottom + espaco.xl,
              gap: espaco.lg,
            }}
          >
            <View style={{ gap: 4 }}>
              <Texto variante="tituloGrande" accessibilityRole="header">
                Cadastros
              </Texto>
              <Texto variante="rotulo" cor="apoio">
                Crie uma consulta ou um cadastro novo.
              </Texto>
            </View>

            <Grupo titulo="Novo" itens={NOVOS} navigation={navigation} />
            <Grupo titulo="Da clínica" itens={CADASTROS} navigation={navigation} />
            <Grupo titulo="Agenda" itens={DA_AGENDA} navigation={navigation} />
          </Animated.ScrollView>
        }
      >
        <Cabecalho
          flutuante
          titulo="Cadastros"
          rolou={rolou}
          aoVoltar={() => navigation.goBack()}
        />
      </ComVidro>
    </View>
  );
}
