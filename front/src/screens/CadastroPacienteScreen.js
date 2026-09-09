import React, { useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  StyleSheet,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { criarPaciente, atualizarPaciente } from '../services/api';

const colors = {
  bg: '#F5F5F2',
  surface: '#FFFFFF',
  border: '#E2E1DB',
  ink: '#4A5560',
  muted: '#8B909A',
  sage: '#4B7776',
};

function Campo({ label, ...inputProps }) {
  return (
    <View style={styles.campo}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        placeholderTextColor={colors.muted}
        {...inputProps}
      />
    </View>
  );
}

export default function CadastroPacienteScreen({ navigation, route }) {
  // A presença do paciente diferencia a edição do novo cadastro.
  const paciente = route.params?.paciente;

  const [nome, setNome] = useState(paciente?.nome ?? '');
  const [cpf, setCpf] = useState(paciente?.cpf ?? '');
  const [dataNascimento, setDataNascimento] = useState(
    paciente?.dataNascimento ?? '',
  );
  const [telefone, setTelefone] = useState(paciente?.telefone ?? '');
  const [email, setEmail] = useState(paciente?.email ?? '');
  const [salvando, setSalvando] = useState(false);

  // O json-server aceita dados incompletos, então o aplicativo protege o mock.
  const validar = () => {
    if (!nome.trim() || !cpf.trim() || !dataNascimento.trim()) {
      Alert.alert(
        'Campos obrigatórios',
        'Preencha nome, CPF e data de nascimento.',
      );
      return false;
    }

    return true;
  };

  const salvar = async () => {
    if (!validar()) return;

    const dados = {
      nome: nome.trim(),
      cpf: cpf.trim(),
      dataNascimento: dataNascimento.trim(),
      telefone: telefone.trim(),
      email: email.trim(),
    };

    setSalvando(true);

    try {
      if (paciente) {
        await atualizarPaciente(paciente.id, dados);
      } else {
        await criarPaciente(dados);
      }

      // A navegação só acontece depois que o servidor confirma a gravação.
      Alert.alert(
        'Sucesso',
        paciente ? 'Paciente atualizado.' : 'Paciente cadastrado.',
        [{ text: 'OK', onPress: () => navigation.goBack() }],
      );
    } catch (e) {
      Alert.alert(
        'Erro',
        'Não foi possível salvar o paciente agora.',
      );
    } finally {
      setSalvando(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Feather name="arrow-left" size={22} color={colors.ink} />
        </TouchableOpacity>

        <Text style={styles.title}>
          {paciente ? 'Editar paciente' : 'Novo paciente'}
        </Text>

        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.form}>
        <Campo
          label="Nome"
          value={nome}
          onChangeText={setNome}
        />

        <Campo
          label="CPF"
          value={cpf}
          onChangeText={setCpf}
          keyboardType="numeric"
          placeholder="000.000.000-00"
        />

        <Campo
          label="Data de nascimento"
          value={dataNascimento}
          onChangeText={setDataNascimento}
          placeholder="AAAA-MM-DD"
        />

        <Campo
          label="Telefone"
          value={telefone}
          onChangeText={setTelefone}
          keyboardType="phone-pad"
        />

        <Campo
          label="E-mail"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <TouchableOpacity
          style={[
            styles.salvarBtn,
            salvando && styles.salvarBtnDisabled,
          ]}
          onPress={salvar}
          disabled={salvando}
        >
          <Text style={styles.salvarText}>
            {salvando ? 'Salvando...' : 'Salvar'}
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
  headerSpacer: {
    width: 22,
  },
  form: {
    padding: 20,
    paddingBottom: 40,
  },
  campo: {
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.muted,
    marginBottom: 6,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: colors.ink,
  },
  salvarBtn: {
    backgroundColor: colors.sage,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  salvarBtnDisabled: {
    opacity: 0.6,
  },
  salvarText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
});