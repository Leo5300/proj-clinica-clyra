import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import {
  buscarMedicos,
  criarHorario,
  atualizarHorario,
} from '../services/api';

const colors = {
  bg: '#F5F5F2',
  surface: '#FFFFFF',
  border: '#E2E1DB',
  ink: '#4A5560',
  muted: '#8B909A',
  sage: '#4B7776',
};

const diasSemana = [
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
];

export default function CadastroHorarioScreen({ navigation, route }) {
  const horario = route?.params?.horario;

  const [diaSemana, setDiaSemana] = useState(horario?.diaSemana || '');
  const [horaInicio, setHoraInicio] = useState(horario?.horaInicio || '');
  const [horaFim, setHoraFim] = useState(horario?.horaFim || '');

  const [medicoId, setMedicoId] = useState(
    horario?.medicoId ? String(horario.medicoId) : '',
  );

  const [medicos, setMedicos] = useState([]);
  const [carregandoMedicos, setCarregandoMedicos] = useState(true);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    carregarMedicos();
  }, []);

  const carregarMedicos = async () => {
    try {
      setCarregandoMedicos(true);

      const dados = await buscarMedicos();
      setMedicos(dados);
    } catch (e) {
      Alert.alert(
        'Erro',
        'Não foi possível carregar os médicos agora.',
      );
    } finally {
      setCarregandoMedicos(false);
    }
  };

  const selecionarMedico = (medico) => {
    setMedicoId(String(medico.id));
  };

  const validarHorario = () => {
    if (!diaSemana) {
      Alert.alert('Atenção', 'Selecione o dia da semana.');
      return false;
    }

    if (!horaInicio || !horaFim) {
      Alert.alert('Atenção', 'Informe o horário inicial e final.');
      return false;
    }

    if (!medicoId) {
      Alert.alert('Atenção', 'Selecione um médico.');
      return false;
    }

    if (horaInicio >= horaFim) {
      Alert.alert(
        'Horário inválido',
        'O horário inicial deve ser menor que o horário final.',
      );
      return false;
    }

    return true;
  };

  
const salvar = async () => {
  if (!validarHorario()) return;

  const dados = {
    medicoId: Number(medicoId),
    diaSemana,
    horaInicio,
    horaFim,
  };

  console.log('Tentando salvar horario:', dados);

  try {
    setSalvando(true);

    if (horario) {
      await atualizarHorario(horario.id, dados);

      console.log('Horario atualizado com sucesso.');

      if (typeof window !== 'undefined') {
        window.alert('Horário atualizado com sucesso.');
        navigation.goBack();
      } else {
        Alert.alert(
          'Sucesso',
          'Horário atualizado com sucesso.',
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack(),
            },
          ],
        );
      }
    } else {
      const novoHorario = await criarHorario(dados);

      console.log('Horario cadastrado com sucesso:', novoHorario);

      if (typeof window !== 'undefined') {
        window.alert('Horário cadastrado com sucesso.');
        navigation.goBack();
      } else {
        Alert.alert(
          'Sucesso',
          'Horário cadastrado com sucesso.',
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack(),
            },
          ],
        );
      }
    }
  } catch (e) {
    console.error('Erro ao salvar horario:', e);

    if (typeof window !== 'undefined') {
      window.alert(
        `Não foi possível salvar o horário.\n\n${e.message}`,
      );
    } else {
      Alert.alert(
        'Erro',
        `Não foi possível salvar o horário.\n\n${e.message}`,
      );
    }
  } finally {
    setSalvando(false);
  }
};


  const medicoSelecionado = medicos.find(
    (medico) => String(medico.id) === medicoId,
  );

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Feather name="arrow-left" size={22} color={colors.ink} />
        </TouchableOpacity>

        <Text style={styles.title}>
          {horario ? 'Editar horário' : 'Novo horário'}
        </Text>

        <View style={styles.headerSpace} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.label}>Dia da semana</Text>

        <View style={styles.diasContainer}>
          {diasSemana.map((dia) => (
            <TouchableOpacity
              key={dia}
              style={[
                styles.diaButton,
                diaSemana === dia && styles.diaButtonSelecionado,
              ]}
              onPress={() => setDiaSemana(dia)}
            >
              <Text
                style={[
                  styles.diaButtonText,
                  diaSemana === dia &&
                    styles.diaButtonTextSelecionado,
                ]}
              >
                {dia}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Médico</Text>

        {carregandoMedicos ? (
          <View style={styles.loadingMedicos}>
            <ActivityIndicator
              size="small"
              color={colors.sage}
            />

            <Text style={styles.loadingText}>
              Carregando médicos...
            </Text>
          </View>
        ) : (
          <View style={styles.medicosContainer}>
            {medicos.map((medico) => {
              const selecionado =
                String(medico.id) === medicoId;

              return (
                <TouchableOpacity
                  key={String(medico.id)}
                  style={[
                    styles.medicoButton,
                    selecionado &&
                      styles.medicoButtonSelecionado,
                  ]}
                  onPress={() => selecionarMedico(medico)}
                >
                  <View style={styles.medicoInfo}>
                    <Text
                      style={[
                        styles.medicoNome,
                        selecionado &&
                          styles.medicoNomeSelecionado,
                      ]}
                    >
                      {medico.nome}
                    </Text>

                    <Text
                      style={[
                        styles.medicoId,
                        selecionado &&
                          styles.medicoIdSelecionado,
                      ]}
                    >
                      ID: {medico.id}
                    </Text>
                  </View>

                  {selecionado && (
                    <Feather
                      name="check"
                      size={18}
                      color="#FFFFFF"
                    />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {medicoSelecionado && (
          <Text style={styles.medicoSelecionadoText}>
            Médico selecionado: {medicoSelecionado.nome} (ID:{' '}
            {medicoSelecionado.id})
          </Text>
        )}

        <Text style={styles.label}>Horário inicial</Text>

        <TextInput
          style={styles.input}
          value={horaInicio}
          onChangeText={setHoraInicio}
          placeholder="Ex.: 08:00"
          placeholderTextColor={colors.muted}
          keyboardType="numbers-and-punctuation"
          maxLength={5}
        />

        <Text style={styles.label}>Horário final</Text>

        <TextInput
          style={styles.input}
          value={horaFim}
          onChangeText={setHoraFim}
          placeholder="Ex.: 12:00"
          placeholderTextColor={colors.muted}
          keyboardType="numbers-and-punctuation"
          maxLength={5}
        />

        <TouchableOpacity
          style={[
            styles.saveButton,
            salvando && styles.saveButtonDisabled,
          ]}
          onPress={salvar}
          disabled={salvando}
        >
          <Text style={styles.saveText}>
            {salvando ? 'Salvando...' : 'Salvar horário'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },

  title: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.ink,
  },

  headerSpace: {
    width: 22,
  },

  content: {
    padding: 20,
    paddingBottom: 40,
  },

  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.ink,
    marginBottom: 8,
    marginTop: 14,
  },

  diasContainer: {
    gap: 8,
  },

  diaButton: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },

  diaButtonSelecionado: {
    backgroundColor: colors.sage,
    borderColor: colors.sage,
  },

  diaButtonText: {
    color: colors.ink,
    fontSize: 13,
  },

  diaButtonTextSelecionado: {
    color: '#FFFFFF',
    fontWeight: '600',
  },

  loadingMedicos: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 14,
  },

  loadingText: {
    marginLeft: 10,
    color: colors.muted,
    fontSize: 13,
  },

  medicosContainer: {
    gap: 8,
  },

  medicoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 14,
  },

  medicoButtonSelecionado: {
    backgroundColor: colors.sage,
    borderColor: colors.sage,
  },

  medicoInfo: {
    flex: 1,
  },

  medicoNome: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: '600',
  },

  medicoNomeSelecionado: {
    color: '#FFFFFF',
  },

  medicoId: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 4,
  },

  medicoIdSelecionado: {
    color: '#FFFFFF',
  },

  medicoSelecionadoText: {
    color: colors.sage,
    fontSize: 12,
    marginTop: 8,
  },

  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: colors.ink,
  },

  saveButton: {
    backgroundColor: colors.sage,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 28,
  },

  saveButtonDisabled: {
    opacity: 0.6,
  },

  saveText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});

