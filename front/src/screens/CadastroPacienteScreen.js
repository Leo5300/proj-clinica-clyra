import React, { useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Image,
  StyleSheet,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { criarPaciente, atualizarPaciente } from '../services/api';
import { consultarCep } from '../services/viacep';

const colors = {
  bg: '#F5F5F2',
  surface: '#FFFFFF',
  border: '#E2E1DB',
  ink: '#4A5560',
  muted: '#8B909A',
  sage: '#4B7776',
  lavender: '#9A8BB6',
  lavenderSoft: '#EFE9F3',
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

  // Mesmo padrao do medico: em modo edicao comeca com a foto que o
  // paciente ja tem, senao a primeira gravacao apagaria a foto dele.
  const [fotoUri, setFotoUri] = useState(paciente?.fotoUri ?? null);

  // O serviço preenche estes campos, mas eles continuam editáveis à mão.
  const [cep, setCep] = useState(paciente?.cep ?? '');
  const [logradouro, setLogradouro] = useState(
    paciente?.logradouro ?? '',
  );
  const [bairro, setBairro] = useState(paciente?.bairro ?? '');
  const [cidade, setCidade] = useState(paciente?.cidade ?? '');
  const [uf, setUf] = useState(paciente?.uf ?? '');

  const [salvando, setSalvando] = useState(false);
  const [buscandoCep, setBuscandoCep] = useState(false);

  // Uma falha no ViaCEP não pode impedir o cadastro manual.
  const [avisoCep, setAvisoCep] = useState(null);

  // A consulta acontece ao sair do campo para não chamar o serviço
  // externo a cada número digitado.
  const buscarEnderecoPorCep = async () => {
    const apenasNumeros = cep.replace(/\D/g, '');

    if (apenasNumeros.length === 0) {
      setAvisoCep(null);
      return;
    }

    if (apenasNumeros.length !== 8) {
      setAvisoCep('CEP deve ter 8 dígitos.');
      return;
    }

    setAvisoCep(null);
    setBuscandoCep(true);

    try {
      const endereco = await consultarCep(apenasNumeros);

      setLogradouro(endereco.logradouro);
      setBairro(endereco.bairro);
      setCidade(endereco.cidade);
      setUf(endereco.uf);
    } catch (e) {
      setAvisoCep(
        `${e.message} Você pode preencher o endereço manualmente.`,
      );

      // O console recebe apenas o erro técnico, sem dados do paciente.
      console.log('Falha na consulta de CEP:', e.message);
    } finally {
      setBuscandoCep(false);
    }
  };

  // Mesma logica do cadastro de medico: pedir a permissao antes de
  // qualquer coisa. O usuario pode negar, e isso e resposta valida,
  // nao bug.
  const escolherFoto = async () => {
    const permissao =
      await ImagePicker.requestCameraPermissionsAsync();

    if (!permissao.granted) {
      Alert.alert(
        'Câmera não liberada',
        'Sem permissão de câmera não é possível tirar a foto. Você pode cadastrar o paciente normalmente sem ela.',
      );
      return;
    }

    const resultado = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.6,
    });

    // Fechar a camera sem fotografar e normal, nao pode quebrar o
    // formulario.
    if (resultado.canceled) {
      return;
    }

    setFotoUri(resultado.assets[0].uri);
  };

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
      cep: cep.trim(),
      logradouro: logradouro.trim(),
      bairro: bairro.trim(),
      cidade: cidade.trim(),
      uf: uf.trim(),
      // Mesma divida tecnica consciente do medico: e a URI local do
      // cache do aparelho, nao a imagem em si. Subir a imagem de
      // verdade exige POST com upload de arquivo, fora do escopo desta
      // aula.
      fotoUri,
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
        <View style={styles.fotoBloco}>
          <TouchableOpacity
            style={styles.avatarWrap}
            onPress={escolherFoto}
          >
            {fotoUri ? (
              <Image
                source={{ uri: fotoUri }}
                style={styles.avatar}
              />
            ) : (
              <View style={[styles.avatar, styles.avatarVazio]}>
                <Feather
                  name="camera"
                  size={26}
                  color={colors.muted}
                />
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={escolherFoto}>
            <Text style={styles.fotoLink}>
              {fotoUri ? 'Trocar foto' : 'Adicionar foto'}
            </Text>
          </TouchableOpacity>

          {fotoUri && (
            <TouchableOpacity onPress={() => setFotoUri(null)}>
              <Text style={styles.fotoRemover}>Remover foto</Text>
            </TouchableOpacity>
          )}

          <Text style={styles.fotoOpcional}>
            A foto é opcional.
          </Text>
        </View>

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

        <Text style={styles.secao}>Endereço</Text>

        <View style={styles.campo}>
          <Text style={styles.label}>CEP</Text>

          <View style={styles.cepLinha}>
            <TextInput
              style={[styles.input, styles.cepInput]}
              placeholderTextColor={colors.muted}
              value={cep}
              onChangeText={setCep}
              onBlur={buscarEnderecoPorCep}
              keyboardType="numeric"
              maxLength={9}
              placeholder="00000-000"
            />

            {buscandoCep && (
              <ActivityIndicator
                color={colors.sage}
                style={styles.cepSpinner}
              />
            )}
          </View>
        </View>

        {avisoCep && (
          <View style={styles.aviso}>
            <Feather
              name="info"
              size={14}
              color={colors.lavender}
            />
            <Text style={styles.avisoTexto}>{avisoCep}</Text>
          </View>
        )}

        <Campo
          label="Logradouro"
          value={logradouro}
          onChangeText={setLogradouro}
        />

        <Campo
          label="Bairro"
          value={bairro}
          onChangeText={setBairro}
        />

        <Campo
          label="Cidade"
          value={cidade}
          onChangeText={setCidade}
        />

        <Campo
          label="UF"
          value={uf}
          onChangeText={setUf}
          maxLength={2}
          autoCapitalize="characters"
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

        <Text style={styles.creditos}>
          Dados de endereço fornecidos por ViaCEP.
        </Text>
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
  fotoBloco: { alignItems: 'center', marginBottom: 24 },
  avatarWrap: { marginBottom: 8 },
  avatar: { width: 110, height: 110, borderRadius: 55 },
  avatarVazio: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fotoLink: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.sage,
    marginBottom: 4,
  },
  fotoRemover: { fontSize: 12, color: colors.muted, marginBottom: 4 },
  fotoOpcional: { fontSize: 11, color: colors.muted },
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
  secao: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: colors.muted,
    marginTop: 8,
    marginBottom: 14,
  },
  cepLinha: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cepInput: {
    flex: 1,
  },
  cepSpinner: {
    marginLeft: 12,
  },
  aviso: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: colors.lavenderSoft,
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    marginTop: -4,
  },
  avisoTexto: {
    flex: 1,
    fontSize: 12,
    color: colors.ink,
    lineHeight: 17,
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
  creditos: {
    fontSize: 10,
    color: colors.muted,
    textAlign: 'center',
    marginTop: 16,
  },
});