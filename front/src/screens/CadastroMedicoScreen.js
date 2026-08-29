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
import { criarMedico, atualizarMedico } from '../services/api';

// TODO: mover para front/src/theme quando o ThemeContext existir
// (feature/design-system). Mesma paleta usada na MedicosScreen.
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
      <TextInput style={styles.input} placeholderTextColor={colors.muted} {...inputProps} />
    </View>
  );
}

export default function CadastroMedicoScreen({ navigation, route }) {
  // Se veio um medico em route.params, e edicao (PUT); sem ele, e cadastro (POST).
  const medico = route.params?.medico;

  const [nome, setNome] = useState(medico?.nome ?? '');
  const [especialidade, setEspecialidade] = useState(medico?.especialidade ?? '');
  const [crm, setCrm] = useState(medico?.crm ?? '');
  const [email, setEmail] = useState(medico?.email ?? '');
  const [telefone, setTelefone] = useState(medico?.telefone ?? '');
  const [endereco, setEndereco] = useState(medico?.endereco ?? '');
  const [salvando, setSalvando] = useState(false);

  // O mock aceita corpo vazio e cria um registro fantasma so com id. Validar
  // aqui antes de disparar a requisicao evita esse tipo de lixo no banco.
  const validar = () => {
    if (!nome.trim() || !especialidade.trim() || !crm.trim()) {
      Alert.alert('Campos obrigatórios', 'Preencha ao menos nome, especialidade e CRM.');
      return false;
    }
    return true;
  };

  const salvar = async () => {
    if (!validar()) return;

    const dados = {
      nome: nome.trim(),
      especialidade: especialidade.trim(),
      crm: crm.trim(),
      email: email.trim(),
      telefone: telefone.trim(),
      endereco: endereco.trim(),
    };

    setSalvando(true);
    try {
      if (medico) {
        await atualizarMedico(medico.id, dados);
      } else {
        await criarMedico(dados);
      }
      // Alert e goBack so depois da confirmacao do servidor -- se a
      // requisicao falhar, o usuario continua na tela com os dados digitados.
      Alert.alert(
        'Sucesso',
        medico ? 'Médico atualizado.' : 'Médico cadastrado.',
        [{ text: 'OK', onPress: () => navigation.goBack() }],
      );
    } catch (e) {
      Alert.alert('Erro', 'Não foi possível salvar o médico agora.');
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
        <Text style={styles.title}>{medico ? 'Editar médico' : 'Novo médico'}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.form}>
        <Campo label="Nome" value={nome} onChangeText={setNome} />
        <Campo label="Especialidade" value={especialidade} onChangeText={setEspecialidade} />
        <Campo label="CRM" value={crm} onChangeText={setCrm} />
        <Campo label="E-mail" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
        <Campo label="Telefone" value={telefone} onChangeText={setTelefone} keyboardType="phone-pad" />
        <Campo label="Endereço" value={endereco} onChangeText={setEndereco} />

        <TouchableOpacity
          style={[styles.salvarBtn, salvando && styles.salvarBtnDisabled]}
          onPress={salvar}
          disabled={salvando}
        >
          <Text style={styles.salvarText}>{salvando ? 'Salvando...' : 'Salvar'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  title: { fontSize: 17, fontWeight: '700', color: colors.ink },
  headerSpacer: { width: 22 },

  form: { padding: 20, paddingBottom: 40 },
  campo: { marginBottom: 16 },
  label: { fontSize: 12, fontWeight: '600', color: colors.muted, marginBottom: 6 },
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
  salvarBtnDisabled: { opacity: 0.6 },
  salvarText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
