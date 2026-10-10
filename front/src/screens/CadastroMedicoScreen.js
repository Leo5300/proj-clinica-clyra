import React, { useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Image,
  StyleSheet,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import {
  criarMedico,
  atualizarMedico,
  gerarAcessoMedico,
  SessaoExpirada,
  ErroDaApi,
} from '../services/api';

// TODO: mover para front/src/theme quando o ThemeContext existir
// (feature/design-system). Mesma paleta usada na MedicosScreen.
const colors = {
  bg: '#F5F5F2',
  surface: '#FFFFFF',
  border: '#E2E1DB',
  ink: '#4A5560',
  muted: '#8B909A',
  sage: '#4B7776',
  danger: '#B0555F',
};

const AREA_DE_TOQUE = { top: 11, bottom: 11, left: 11, right: 11 };

function Campo({ label, erro, nota, ...inputProps }) {
  return (
    <View style={styles.campo}>
      <Text style={styles.label}>{label}</Text>
      <TextInput style={styles.input} placeholderTextColor={colors.muted} {...inputProps} />
      {nota && <Text style={styles.nota}>{nota}</Text>}
      {erro && <Text style={styles.erroCampo}>{erro}</Text>}
    </View>
  );
}

// A senha temporaria so existe nesta resposta do servidor: depois dela,
// so o hash fica gravado. Por isso o aviso diz que ela nao volta.
function textoDoAcesso(acesso) {
  return `Acesso criado para ${acesso.email}. Senha temporária: ${acesso.senhaTemporaria}. Entregue ao médico; ele vai criar a própria senha no primeiro acesso. Esta senha não será mostrada de novo.`;
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
  const [fotoUri, setFotoUri] = useState(medico?.fotoUri ?? null);
  const [salvando, setSalvando] = useState(false);
  const [temAcesso, setTemAcesso] = useState(medico?.temAcesso === true);
  const [gerandoAcesso, setGerandoAcesso] = useState(false);
  const [erros, setErros] = useState({});

  const irParaLogin = () => {
    navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
  };

  // O servidor confere de novo; validar aqui so poupa a viagem. O e-mail
  // e obrigatorio no cadastro novo porque e o login do medico.
  const validar = () => {
    const novos = {};

    if (!nome.trim()) novos.nome = 'Informe o nome.';
    if (!especialidade.trim()) novos.especialidade = 'Informe a especialidade.';
    if (!crm.trim()) novos.crm = 'Informe o CRM.';
    if (!medico && !email.trim().includes('@')) {
      novos.email = 'Informe o e-mail do médico.';
    }

    setErros(novos);
    return Object.keys(novos).length === 0;
  };

  const escolherFoto = async () => {
  const permissao =
    await ImagePicker.requestCameraPermissionsAsync();

  if (!permissao.granted) {
    Alert.alert(
      'Câmera não liberada',
      'Sem permissão de câmera não é possível tirar a foto. Você pode cadastrar o médico normalmente sem ela.',
    );
    return;
  }

  const resultado = await ImagePicker.launchCameraAsync({
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.6,
  });

  if (resultado.canceled) {
    return;
  }

  setFotoUri(resultado.assets[0].uri);
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
      fotoUri,
    };

    setSalvando(true);
    try {
      // Alert e goBack so depois da confirmacao do servidor -- se a
      // requisicao falhar, o usuario continua na tela com os dados digitados.
      if (medico) {
        await atualizarMedico(medico.id, dados);

        Alert.alert('Sucesso', 'Médico atualizado.', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      } else {
        const resposta = await criarMedico(dados);

        Alert.alert('Médico cadastrado', textoDoAcesso(resposta.acesso), [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      }
    } catch (e) {
      if (e instanceof SessaoExpirada) {
        irParaLogin();
        return;
      }

      // 409 (e-mail ja usado) e 400 trazem a mensagem do servidor.
      Alert.alert(
        'Erro',
        e instanceof ErroDaApi && e.mensagem
          ? e.mensagem
          : 'Não foi possível salvar o médico agora.',
      );
    } finally {
      setSalvando(false);
    }
  };

  // Medico cadastrado antes dos acessos, ou que esqueceu a senha.
  const gerarAcesso = async () => {
    setGerandoAcesso(true);

    try {
      const resposta = await gerarAcessoMedico(medico.id);

      Alert.alert(
        temAcesso ? 'Nova senha temporária' : 'Acesso criado',
        textoDoAcesso(resposta.acesso),
      );
      setTemAcesso(true);
    } catch (e) {
      if (e instanceof SessaoExpirada) {
        irParaLogin();
        return;
      }

      Alert.alert(
        'Erro',
        e instanceof ErroDaApi && e.mensagem
          ? e.mensagem
          : 'Não foi possível gerar o acesso agora.',
      );
    } finally {
      setGerandoAcesso(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Voltar"
          hitSlop={AREA_DE_TOQUE}
        >
          <Feather name="arrow-left" size={22} color={colors.ink} />
        </TouchableOpacity>
        <Text style={styles.title}>{medico ? 'Editar médico' : 'Novo médico'}</Text>
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
        <Campo label="Nome" value={nome} onChangeText={setNome} erro={erros.nome} />
        <Campo label="Especialidade" value={especialidade} onChangeText={setEspecialidade} erro={erros.especialidade} />
        <Campo label="CRM" value={crm} onChangeText={setCrm} erro={erros.crm} />
        <Campo
          label="E-mail"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          nota="O médico usa este e-mail para entrar no app."
          erro={erros.email}
        />
        <Campo label="Telefone" value={telefone} onChangeText={setTelefone} keyboardType="phone-pad" />
        <Campo label="Endereço" value={endereco} onChangeText={setEndereco} />

        <TouchableOpacity
          style={[styles.salvarBtn, salvando && styles.salvarBtnDisabled]}
          onPress={salvar}
          disabled={salvando}
        >
          <Text style={styles.salvarText}>{salvando ? 'Salvando...' : 'Salvar'}</Text>
        </TouchableOpacity>

        {medico && (
          <TouchableOpacity
            style={[styles.acessoBtn, gerandoAcesso && styles.salvarBtnDisabled]}
            onPress={gerarAcesso}
            disabled={gerandoAcesso || salvando}
          >
            <Text style={styles.acessoText}>
              {gerandoAcesso
                ? 'Gerando...'
                : temAcesso
                  ? 'Gerar nova senha temporária'
                  : 'Criar acesso ao app'}
            </Text>
          </TouchableOpacity>
        )}
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
  fotoBloco: { alignItems: 'center', marginBottom: 24 },

avatarWrap: { marginBottom: 8 },

avatar: {
  width: 110,
  height: 110,
  borderRadius: 55,
},

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

fotoRemover: {
  fontSize: 12,
  color: colors.muted,
  marginBottom: 4,
},

fotoOpcional: {
  fontSize: 11,
  color: colors.muted,
},
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
  acessoBtn: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 10,
  },
  acessoText: { color: colors.sage, fontWeight: '700', fontSize: 14 },
  nota: { fontSize: 12, color: colors.muted, marginTop: 6 },
  erroCampo: { fontSize: 12, color: colors.danger, marginTop: 6 },
});
