import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useTema, fontes } from '../theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TopoDeTela } from '../components';
import { Feather } from '@expo/vector-icons';
import {
  buscarMedicos,
  criarHorario,
  atualizarHorario,
  SessaoExpirada,
  SemPermissao,
  ErroDaApi,
} from '../services/api';
import { useUsuario } from '../services/sessao';

const diasSemana = [
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
];

export default function CadastroHorarioScreen({ navigation, route }) {
  const { cores } = useTema();
  const styles = useMemo(() => criarEstilos(cores), [cores]);
  const horario = route?.params?.horario;

  // O medico cadastra so na propria agenda: nao escolhe medico, e o
  // servidor grava o medicoId dele de qualquer forma.
  const { usuario } = useUsuario();
  const ehMedico = usuario?.perfil === 'medico';

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
    if (usuario && !ehMedico) {
      carregarMedicos();
    }
  }, [usuario, ehMedico]);

  const carregarMedicos = async () => {
    try {
      setCarregandoMedicos(true);

      const dados = await buscarMedicos();
      setMedicos(dados);
    } catch (e) {
      if (e instanceof SessaoExpirada) {
        navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
        return;
      }

      Alert.alert(
        'Erro',
        'Não foi possível carregar os profissionais agora.',
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

    if (!medicoId && !ehMedico) {
      Alert.alert('Atenção', 'Selecione um profissional.');
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

  // Id como texto: medicos cadastrados pela API tem id que nao e numero.
  const dados = {
    medicoId: ehMedico ? usuario.vinculoId : medicoId,
    diaSemana,
    horaInicio,
    horaFim,
  };

  // O servidor confere sobreposicao e faixa valida; a tela so mostra o
  // que ele respondeu. Alert nativo, nunca window.alert (nao existe no
  // aparelho).
  try {
    setSalvando(true);

    if (horario) {
      await atualizarHorario(horario.id, dados);
    } else {
      await criarHorario(dados);
    }

    Alert.alert(
      horario ? 'Horário atualizado' : 'Horário cadastrado',
      `${diaSemana}, das ${horaInicio} às ${horaFim}.`,
      [{ text: 'OK', onPress: () => navigation.goBack() }],
    );
  } catch (e) {
    if (e instanceof SessaoExpirada) {
      navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
      return;
    }

    if (e instanceof SemPermissao) {
      Alert.alert(
        'Sem permissão',
        e.mensagem ?? 'Você não tem permissão para isso.',
      );
      return;
    }

    Alert.alert(
      'Não foi possível salvar o horário',
      e instanceof ErroDaApi && e.mensagem
        ? e.mensagem
        : 'Confira a internet do celular e tente de novo.',
    );
  } finally {
    setSalvando(false);
  }
};


  const medicoSelecionado = medicos.find(
    (medico) => String(medico.id) === medicoId,
  );

  return (
    <SafeAreaView style={styles.safe} edges={['left', 'right', 'bottom']}>
      <TopoDeTela
        titulo={horario ? 'Editar horário' : 'Novo horário'}
        aoVoltar={() => navigation.goBack()}
      />

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

        <Text style={styles.label}>Profissional</Text>

        {ehMedico ? (
          <Text style={styles.medicoSelecionadoText}>
            Profissional: {usuario.nome}
          </Text>
        ) : carregandoMedicos ? (
          <View style={styles.loadingMedicos}>
            <ActivityIndicator
              size="small"
              color={cores.link}
            />

            <Text style={styles.loadingText}>
              Carregando profissionais...
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
                      color={cores.selTexto}
                    />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {!ehMedico && medicoSelecionado && (
          <Text style={styles.medicoSelecionadoText}>
            Profissional selecionado: {medicoSelecionado.nome} (ID:{' '}
            {medicoSelecionado.id})
          </Text>
        )}

        <Text style={styles.label}>Horário inicial</Text>

        <TextInput
          style={styles.input}
          value={horaInicio}
          onChangeText={setHoraInicio}
          placeholder="Ex.: 08:00"
          placeholderTextColor={cores.desativado}
          keyboardType="numbers-and-punctuation"
          maxLength={5}
        />

        <Text style={styles.label}>Horário final</Text>

        <TextInput
          style={styles.input}
          value={horaFim}
          onChangeText={setHoraFim}
          placeholder="Ex.: 12:00"
          placeholderTextColor={cores.desativado}
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

const criarEstilos = (cores) =>
  StyleSheet.create({
    safe: {
      flex: 1,
      backgroundColor: cores.papel,
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
      fontFamily: fontes.textoForte,
      color: cores.tinta,
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
      fontFamily: fontes.textoSemi,
      color: cores.tinta,
      marginBottom: 8,
      marginTop: 14,
    },

    diasContainer: {
      gap: 8,
    },

    diaButton: {
      backgroundColor: cores.superficie,
      borderWidth: 1,
      borderColor: cores.linha,
      borderRadius: 10,
      paddingVertical: 12,
      paddingHorizontal: 14,
    },

    diaButtonSelecionado: {
      backgroundColor: cores.acao,
      borderColor: cores.acao,
    },

    diaButtonText: {
      fontFamily: fontes.texto,
      color: cores.tinta,
      fontSize: 13,
    },

    diaButtonTextSelecionado: {
      color: cores.sobreAcao,
      fontFamily: fontes.textoSemi,
    },

    loadingMedicos: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: cores.superficie,
      borderWidth: 1,
      borderColor: cores.linha,
      borderRadius: 10,
      padding: 14,
    },

    loadingText: {
      fontFamily: fontes.texto,
      marginLeft: 10,
      color: cores.apoio,
      fontSize: 13,
    },

    medicosContainer: {
      gap: 8,
    },

    medicoButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: cores.superficie,
      borderWidth: 1,
      borderColor: cores.linha,
      borderRadius: 10,
      padding: 14,
    },

    medicoButtonSelecionado: {
      backgroundColor: cores.acao,
      borderColor: cores.acao,
    },

    medicoInfo: {
      flex: 1,
    },

    medicoNome: {
      color: cores.tinta,
      fontSize: 14,
      fontFamily: fontes.textoSemi,
    },

    medicoNomeSelecionado: {
      color: cores.sobreAcao,
    },

    medicoId: {
      fontFamily: fontes.texto,
      color: cores.apoio,
      fontSize: 12,
      marginTop: 4,
    },

    medicoIdSelecionado: {
      color: cores.sobreAcao,
    },

    medicoSelecionadoText: {
      fontFamily: fontes.texto,
      color: cores.link,
      fontSize: 12,
      marginTop: 8,
    },

    input: {
      fontFamily: fontes.texto,
      backgroundColor: cores.superficie,
      borderWidth: 1,
      borderColor: cores.linha,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 14,
      color: cores.tinta,
    },

    saveButton: {
      backgroundColor: cores.acao,
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: 'center',
      marginTop: 28,
    },

    saveButtonDisabled: {
      opacity: 0.6,
    },

    saveText: {
      color: cores.sobreAcao,
      fontSize: 14,
      fontFamily: fontes.textoForte,
    },
  });

