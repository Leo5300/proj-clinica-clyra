import React, { useState, useCallback, useMemo } from 'react';
import {
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
import { useTema, fontes } from '../theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import {
  criarMedico,
  atualizarMedico,
  gerarAcessoMedico,
  buscarEspecialidades,
  SessaoExpirada,
  ErroDaApi,
} from '../services/api';

const AREA_DE_TOQUE = { top: 11, bottom: 11, left: 11, right: 11 };

function Campo({ label, erro, nota, ...inputProps }) {
  const { cores } = useTema();
  const styles = useMemo(() => criarEstilos(cores), [cores]);
  return (
    <View style={styles.campo}>
      <Text style={styles.label}>{label}</Text>
      <TextInput style={styles.input} placeholderTextColor={cores.desativado} {...inputProps} />
      {nota && <Text style={styles.nota}>{nota}</Text>}
      {erro && <Text style={styles.erroCampo}>{erro}</Text>}
    </View>
  );
}

// A senha temporaria so existe nesta resposta do servidor: depois dela,
// so o hash fica gravado. Por isso o aviso diz que ela nao volta.
function textoDoAcesso(acesso) {
  return `Acesso criado para ${acesso.email}. Senha temporária: ${acesso.senhaTemporaria}. Entregue ao profissional; ele vai criar a própria senha no primeiro acesso. Esta senha não será mostrada de novo.`;
}

export default function CadastroMedicoScreen({ navigation, route }) {
  const { cores } = useTema();
  const styles = useMemo(() => criarEstilos(cores), [cores]);
  // Se veio um medico em route.params, e edicao (PUT); sem ele, e cadastro (POST).
  const medico = route.params?.medico;

  const [nome, setNome] = useState(medico?.nome ?? '');
  // A especialidade e escolhida da lista cadastrada, nunca digitada: o
  // medico guarda so o id, e o nome vem sempre da tela de Especialidades.
  const [especialidadeId, setEspecialidadeId] = useState(
    medico?.especialidadeId ? String(medico.especialidadeId) : null,
  );
  const [especialidades, setEspecialidades] = useState([]);
  const [carregandoEspecialidades, setCarregandoEspecialidades] =
    useState(true);
  const [erroEspecialidades, setErroEspecialidades] = useState(null);
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

  const carregarEspecialidades = useCallback(async () => {
    setErroEspecialidades(null);

    try {
      const lista = await buscarEspecialidades();
      setEspecialidades(
        [...lista].sort((a, b) => String(a.nome).localeCompare(String(b.nome))),
      );
    } catch (e) {
      if (e instanceof SessaoExpirada) {
        navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
        return;
      }

      setErroEspecialidades('Não foi possível carregar as especialidades.');
    } finally {
      setCarregandoEspecialidades(false);
    }
  }, [navigation]);

  // Ao voltar de "Cadastrar especialidade", a nova ja aparece na lista.
  useFocusEffect(
    useCallback(() => {
      carregarEspecialidades();
    }, [carregarEspecialidades]),
  );

  // O servidor confere de novo; validar aqui so poupa a viagem. O e-mail
  // e obrigatorio no cadastro novo porque e o login do medico.
  // O registro e um campo so (crm); o conselho que aparece depende da
  // area da especialidade: Psicologia = CRP, Psiquiatria = CRM.
  const areaEscolhida = especialidades.find(
    (e) => String(e.id) === especialidadeId,
  )?.area;
  const conselho =
    areaEscolhida === 'Psicologia'
      ? 'CRP'
      : areaEscolhida === 'Psiquiatria'
        ? 'CRM'
        : null;

  const validar = () => {
    const novos = {};

    if (!nome.trim()) novos.nome = 'Informe o nome.';
    if (!especialidadeId) novos.especialidade = 'Escolha a especialidade.';
    if (!crm.trim()) novos.crm = `Informe o ${conselho ?? 'registro'}.`;
    if (!medico && !email.trim().includes('@')) {
      novos.email = 'Informe o e-mail do profissional.';
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
      'Sem permissão de câmera não é possível tirar a foto. Você pode cadastrar o profissional normalmente sem ela.',
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
      especialidadeId,
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

        Alert.alert('Sucesso', 'Profissional atualizado.', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      } else {
        const resposta = await criarMedico(dados);

        Alert.alert('Profissional cadastrado', textoDoAcesso(resposta.acesso), [
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
          : 'Não foi possível salvar o profissional agora.',
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
          <Feather name="chevron-left" size={26} color={cores.tinta} />
        </TouchableOpacity>
        <Text style={styles.title}>{medico ? 'Editar profissional' : 'Novo profissional'}</Text>
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
          color={cores.apoio}
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
        <View style={styles.campo}>
          <Text style={styles.label}>Especialidade</Text>

          {carregandoEspecialidades ? (
            <ActivityIndicator color={cores.link} style={styles.indicador} />
          ) : erroEspecialidades ? (
            <TouchableOpacity onPress={carregarEspecialidades}>
              <Text style={styles.erroCampo}>
                {erroEspecialidades} Toque para tentar de novo.
              </Text>
            </TouchableOpacity>
          ) : especialidades.length === 0 ? (
            <TouchableOpacity
              onPress={() => navigation.navigate('CadastroEspecialidade')}
            >
              <Text style={styles.nota}>
                Nenhuma especialidade cadastrada.{' '}
                <Text style={styles.link}>Cadastrar especialidade</Text>
              </Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.opcoes}>
              {especialidades.map((e) => {
                const selecionada = String(e.id) === especialidadeId;

                return (
                  <TouchableOpacity
                    key={String(e.id)}
                    style={[styles.opcao, selecionada && styles.opcaoSelecionada]}
                    onPress={() => {
                      setEspecialidadeId(String(e.id));
                      setErros((atuais) => ({ ...atuais, especialidade: null }));
                    }}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: selecionada }}
                  >
                    <Text
                      style={[
                        styles.opcaoTexto,
                        selecionada && styles.opcaoTextoSelecionado,
                      ]}
                    >
                      {e.nome}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {erros.especialidade && (
            <Text style={styles.erroCampo}>{erros.especialidade}</Text>
          )}
        </View>
        <Campo
          label={conselho ?? 'Registro (CRP ou CRM)'}
          value={crm}
          onChangeText={setCrm}
          erro={erros.crm}
        />
        <Campo
          label="E-mail"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          nota="O profissional usa este e-mail para entrar no app."
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

const criarEstilos = (cores) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: cores.papel },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingVertical: 14,
    },
    title: { fontSize: 17, fontFamily: fontes.textoForte, color: cores.tinta },
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
    backgroundColor: cores.superficie,
    borderWidth: 1,
    borderColor: cores.linha,
    alignItems: 'center',
    justifyContent: 'center',
  },

  fotoLink: {
    fontSize: 13,
    fontFamily: fontes.textoSemi,
    color: cores.link,
    marginBottom: 4,
  },

  fotoRemover: {
    fontFamily: fontes.texto,
    fontSize: 12,
    color: cores.apoio,
    marginBottom: 4,
  },

  fotoOpcional: {
    fontFamily: fontes.texto,
    fontSize: 11,
    color: cores.apoio,
  },
    campo: { marginBottom: 16 },
    label: { fontSize: 12, fontFamily: fontes.textoSemi, color: cores.apoio, marginBottom: 6 },
    input: {
      fontFamily: fontes.texto,
      backgroundColor: cores.superficie,
      borderWidth: 1,
      borderColor: cores.linha,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 14,
      color: cores.tinta,
    },

    salvarBtn: {
      backgroundColor: cores.acao,
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: 'center',
      marginTop: 8,
    },
    salvarBtnDisabled: { opacity: 0.6 },
    salvarText: { color: cores.sobreAcao, fontFamily: fontes.textoForte, fontSize: 14 },
    acessoBtn: {
      backgroundColor: cores.superficie,
      borderWidth: 1,
      borderColor: cores.linha,
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: 'center',
      marginTop: 10,
    },
    acessoText: { color: cores.link, fontFamily: fontes.textoForte, fontSize: 14 },
    nota: { fontFamily: fontes.texto, fontSize: 12, color: cores.apoio, marginTop: 6 },
    link: { color: cores.link, fontFamily: fontes.textoForte },
    indicador: { alignSelf: 'flex-start', marginVertical: 6 },
    opcoes: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    opcao: {
      minHeight: 44,
      justifyContent: 'center',
      backgroundColor: cores.superficie,
      borderWidth: 1,
      borderColor: cores.linha,
      borderRadius: 12,
      paddingHorizontal: 14,
    },
    opcaoSelecionada: {
      backgroundColor: cores.lavandaSuave,
      borderColor: cores.acao,
    },
    opcaoTexto: { fontFamily: fontes.texto, fontSize: 14, color: cores.tinta },
    opcaoTextoSelecionado: { color: cores.link, fontFamily: fontes.textoForte },
    erroCampo: { fontFamily: fontes.texto, fontSize: 12, color: cores.alerta, marginTop: 6 },
  });
