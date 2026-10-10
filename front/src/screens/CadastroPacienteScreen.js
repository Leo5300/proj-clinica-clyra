import React, { useState, useEffect } from 'react';
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
import {
  criarPaciente,
  atualizarPaciente,
  buscarPaciente,
  SessaoExpirada,
  SemPermissao,
  ErroDaApi,
} from '../services/api';
import { consultarCep } from '../services/viacep';
import { brParaIso } from '../services/datas';

// Uma tela, tres modos:
//   recepcao (padrao)          -> cadastro e edicao completos;
//   somenteLeitura (medico)    -> so o que o servidor manda ao medico,
//                                 sem editar nada;
//   modo: 'meusDados' (paciente) -> contato e endereco editaveis; nome,
//                                 CPF e nascimento so pela recepcao.

const colors = {
  bg: '#F5F5F2',
  surface: '#FFFFFF',
  surfaceAlt: '#ECEBE6',
  border: '#E2E1DB',
  ink: '#4A5560',
  muted: '#8B909A',
  sage: '#4B7776',
  lavender: '#9A8BB6',
  lavenderSoft: '#EFE9F3',
  danger: '#B0555F',
};

const AREA_DE_TOQUE = { top: 11, bottom: 11, left: 11, right: 11 };

// "1990-04-12" -> "12/04/1990". O servidor guarda AAAA-MM-DD; a pessoa
// le e digita dd/mm/aaaa.
function isoParaBr(iso) {
  const [ano, mes, dia] = String(iso ?? '').split('-');
  return ano && mes && dia ? `${dia}/${mes}/${ano}` : '';
}

function mascararData(texto) {
  const d = texto.replace(/\D/g, '').slice(0, 8);

  return d
    .replace(/^(\d{2})(\d)/, '$1/$2')
    .replace(/^(\d{2})\/(\d{2})(\d)/, '$1/$2/$3');
}

function Campo({ label, erro, travado, ...inputProps }) {
  return (
    <View style={styles.campo}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, travado && styles.inputTravado]}
        placeholderTextColor={colors.muted}
        editable={!travado}
        {...inputProps}
      />
      {erro && <Text style={styles.erroCampo}>{erro}</Text>}
    </View>
  );
}

export default function CadastroPacienteScreen({ navigation, route }) {
  const somenteLeitura = route.params?.somenteLeitura === true;
  const meusDados = route.params?.modo === 'meusDados';

  // A presença do paciente diferencia a edição do novo cadastro.
  const [paciente, setPaciente] = useState(route.params?.paciente ?? null);
  const [carregando, setCarregando] = useState(meusDados);
  const [erroCarga, setErroCarga] = useState(null);

  const [nome, setNome] = useState(paciente?.nome ?? '');
  const [cpf, setCpf] = useState(paciente?.cpf ?? '');
  const [dataNascimento, setDataNascimento] = useState(
    isoParaBr(paciente?.dataNascimento),
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

  const [erros, setErros] = useState({});
  const [salvando, setSalvando] = useState(false);
  const [buscandoCep, setBuscandoCep] = useState(false);

  // Uma falha no ViaCEP não pode impedir o cadastro manual.
  const [avisoCep, setAvisoCep] = useState(null);

  const irParaLogin = () => {
    navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
  };

  const preencher = (dados) => {
    setPaciente(dados);
    setNome(dados.nome ?? '');
    setCpf(dados.cpf ?? '');
    setDataNascimento(isoParaBr(dados.dataNascimento));
    setTelefone(dados.telefone ?? '');
    setEmail(dados.email ?? '');
    setFotoUri(dados.fotoUri ?? null);
    setCep(dados.cep ?? '');
    setLogradouro(dados.logradouro ?? '');
    setBairro(dados.bairro ?? '');
    setCidade(dados.cidade ?? '');
    setUf(dados.uf ?? '');
  };

  // "Meus dados" sempre vem do servidor: o que esta no aparelho pode
  // estar desatualizado (a recepcao pode ter corrigido algo).
  const carregarMeusDados = async () => {
    setCarregando(true);
    setErroCarga(null);

    try {
      preencher(await buscarPaciente(route.params?.pacienteId));
    } catch (e) {
      if (e instanceof SessaoExpirada) {
        irParaLogin();
        return;
      }

      setErroCarga(
        e instanceof SemPermissao
          ? e.mensagem ?? 'Você não tem permissão para isso.'
          : 'Não foi possível carregar seus dados agora.',
      );
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    if (meusDados) carregarMeusDados();
  }, []);

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

  // O servidor aceita dados incompletos da recepção, então o aplicativo
  // protege o cadastro. Erro aparece embaixo do campo.
  const validar = () => {
    const novos = {};

    if (!meusDados) {
      if (!nome.trim()) novos.nome = 'Informe o nome.';
      if (!cpf.trim()) novos.cpf = 'Informe o CPF.';
      if (!brParaIso(dataNascimento)) {
        novos.dataNascimento = 'Informe uma data válida, no formato dd/mm/aaaa.';
      }
    }

    setErros(novos);
    return Object.keys(novos).length === 0;
  };

  const salvar = async () => {
    if (!validar()) return;

    const dados = {
      nome: nome.trim(),
      cpf: cpf.trim(),
      dataNascimento: brParaIso(dataNascimento) ?? paciente?.dataNascimento,
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
        meusDados
          ? 'Seus dados foram atualizados.'
          : paciente
            ? 'Paciente atualizado.'
            : 'Paciente cadastrado.',
        [{ text: 'OK', onPress: () => navigation.goBack() }],
      );
    } catch (e) {
      if (e instanceof SessaoExpirada) {
        irParaLogin();
        return;
      }

      Alert.alert(
        'Erro',
        e instanceof ErroDaApi && e.mensagem
          ? e.mensagem
          : 'Não foi possível salvar o paciente agora.',
      );
    } finally {
      setSalvando(false);
    }
  };

  const titulo = somenteLeitura
    ? 'Paciente'
    : meusDados
      ? 'Meus dados'
      : paciente
        ? 'Editar paciente'
        : 'Novo paciente';

  const renderFoto = () => {
    // Leitura: so a foto (ou o espaco dela), sem camera.
    if (somenteLeitura) {
      return (
        <View style={styles.fotoBloco}>
          {fotoUri ? (
            <Image source={{ uri: fotoUri }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarVazio]}>
              <Feather name="user" size={26} color={colors.muted} />
            </View>
          )}
        </View>
      );
    }

    return (
      <View style={styles.fotoBloco}>
        <TouchableOpacity
          style={styles.avatarWrap}
          onPress={escolherFoto}
          accessibilityRole="button"
          accessibilityLabel={fotoUri ? 'Trocar foto' : 'Adicionar foto'}
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
    );
  };

  const renderSomenteLeitura = () => (
    <>
      {renderFoto()}
      <Campo label="Nome" value={nome} travado />
      {dataNascimento ? (
        <Campo label="Data de nascimento" value={dataNascimento} travado />
      ) : null}
      {telefone ? <Campo label="Telefone" value={telefone} travado /> : null}
    </>
  );

  const renderFormulario = () => (
    <>
      {renderFoto()}

      <Campo
        label="Nome"
        value={nome}
        onChangeText={setNome}
        erro={erros.nome}
        travado={meusDados}
      />

      <Campo
        label="CPF"
        value={cpf}
        onChangeText={setCpf}
        keyboardType="numeric"
        placeholder="000.000.000-00"
        erro={erros.cpf}
        travado={meusDados}
      />

      <Campo
        label="Data de nascimento"
        value={dataNascimento}
        onChangeText={(valor) => setDataNascimento(mascararData(valor))}
        keyboardType="numeric"
        placeholder="dd/mm/aaaa"
        maxLength={10}
        erro={erros.dataNascimento}
        travado={meusDados}
      />

      {meusDados && (
        <Text style={styles.notaTravada}>
          Para alterar estes dados, fale com a recepção.
        </Text>
      )}

      <Campo
        label="Telefone"
        value={telefone}
        onChangeText={setTelefone}
        keyboardType="phone-pad"
      />

      <Campo
        label={meusDados ? 'E-mail de contato' : 'E-mail'}
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
    </>
  );

  const renderConteudo = () => {
    if (carregando) {
      return <ActivityIndicator color={colors.sage} style={styles.indicador} />;
    }

    if (erroCarga) {
      return (
        <View>
          <Text style={styles.erroTexto}>{erroCarga}</Text>
          <TouchableOpacity style={styles.salvarBtn} onPress={carregarMeusDados}>
            <Text style={styles.salvarText}>Tentar novamente</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return somenteLeitura ? renderSomenteLeitura() : renderFormulario();
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

        <Text style={styles.title}>{titulo}</Text>

        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.form}>
        {renderConteudo()}
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
  indicador: { marginTop: 40 },
  erroTexto: { fontSize: 14, color: colors.danger, marginBottom: 6 },
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
  inputTravado: {
    backgroundColor: colors.surfaceAlt,
    color: colors.muted,
  },
  erroCampo: { fontSize: 12, color: colors.danger, marginTop: 6 },
  notaTravada: {
    fontSize: 12,
    color: colors.muted,
    marginTop: -6,
    marginBottom: 16,
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
