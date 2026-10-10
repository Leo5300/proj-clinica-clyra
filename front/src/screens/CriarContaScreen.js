import React, { useState } from 'react';
import {
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { registrarPaciente, ErroDaApi } from '../services/api';
import { salvarSessao } from '../services/sessao';
import { brParaIso } from '../services/datas';

// Autocadastro: so cria conta de PACIENTE. Medico e recepcao recebem o
// acesso da clinica. As validacoes daqui sao as mesmas do servidor, para a
// pessoa corrigir antes de enviar -- mas quem decide e o servidor.

// TODO: mover para front/src/theme quando o ThemeContext existir.
const colors = {
  bg: '#F5F5F2',
  surface: '#FFFFFF',
  border: '#E2E1DB',
  ink: '#4A5560',
  muted: '#8B909A',
  sage: '#4B7776',
  sageSoft: '#E3EEEA',
  danger: '#B0555F',
};

const AREA_DE_TOQUE = { top: 11, bottom: 11, left: 11, right: 11 };

const apenasDigitos = (texto) => texto.replace(/\D/g, '');

// 000.000.000-00, montado enquanto a pessoa digita.
function mascararCpf(texto) {
  const d = apenasDigitos(texto).slice(0, 11);

  return d
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1-$2');
}

// dd/mm/aaaa, montado enquanto a pessoa digita.
function mascararData(texto) {
  const d = apenasDigitos(texto).slice(0, 8);

  return d
    .replace(/^(\d{2})(\d)/, '$1/$2')
    .replace(/^(\d{2})\/(\d{2})(\d)/, '$1/$2/$3');
}

// Digitos verificadores, como no servidor. Todos iguais passam na conta,
// mas nao sao CPF de ninguem.
function cpfValido(cpf) {
  const d = apenasDigitos(cpf);

  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;

  const numeros = d.split('').map(Number);
  const verificador = (quantidade) => {
    let soma = 0;

    for (let i = 0; i < quantidade; i += 1) {
      soma += numeros[i] * (quantidade + 1 - i);
    }

    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  };

  return verificador(9) === numeros[9] && verificador(10) === numeros[10];
}

function Campo({ label, erro, children }) {
  return (
    <View style={styles.campo}>
      <Text style={styles.label}>{label}</Text>
      {children}
      {erro && <Text style={styles.erroCampo}>{erro}</Text>}
    </View>
  );
}

export default function CriarContaScreen({ navigation }) {
  const [nome, setNome] = useState('');
  const [cpf, setCpf] = useState('');
  const [nascimento, setNascimento] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [aceite, setAceite] = useState(false);

  const [erros, setErros] = useState({});
  const [erroServidor, setErroServidor] = useState(null);
  const [criando, setCriando] = useState(false);

  // Mexer no campo apaga o erro dele: a mensagem nao fica la depois de
  // corrigida.
  const alterar = (campo, setter) => (valor) => {
    setter(valor);
    setErros((atuais) => ({ ...atuais, [campo]: null }));
  };

  const voltarAoLogin = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }

    navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
  };

  const validar = () => {
    const novos = {};
    const nascimentoIso = brParaIso(nascimento);

    if (!nome.trim()) {
      novos.nome = 'Informe seu nome completo.';
    }

    if (!cpfValido(cpf)) {
      novos.cpf = 'CPF inválido. Confira os números.';
    }

    if (!nascimentoIso) {
      novos.nascimento = 'Informe uma data válida, no formato dd/mm/aaaa.';
    } else {
      const [ano, mes, dia] = nascimentoIso.split('-').map(Number);

      if (new Date(ano, mes - 1, dia) > new Date()) {
        novos.nascimento = 'A data de nascimento não pode estar no futuro.';
      }
    }

    if (!email.trim().includes('@')) {
      novos.email = 'Informe um e-mail válido.';
    }

    if (senha.length < 8) {
      novos.senha = 'A senha precisa ter pelo menos 8 caracteres.';
    }

    if (confirmacao !== senha) {
      novos.confirmacao = 'As duas senhas não conferem.';
    }

    setErros(novos);
    return Object.keys(novos).length === 0 ? nascimentoIso : null;
  };

  const criarConta = async () => {
    setErroServidor(null);

    const nascimentoIso = validar();
    if (!nascimentoIso) return;

    setCriando(true);

    try {
      const dados = await registrarPaciente({
        nome: nome.trim(),
        cpf,
        dataNascimento: nascimentoIso,
        email: email.trim(),
        senha,
        aceiteTermos: aceite,
      });

      await salvarSessao(dados.token, dados.usuario);

      navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
    } catch (e) {
      // 400 e 409 trazem a mensagem do servidor, que diz o que fazer
      // (ex.: "Procure a recepção").
      if (e instanceof ErroDaApi && e.mensagem) {
        setErroServidor(e.mensagem);
      } else {
        setErroServidor(
          'Não foi possível criar a conta agora. Verifique se a API está no ar.',
        );
      }
    } finally {
      setCriando(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={voltarAoLogin}
          accessibilityRole="button"
          accessibilityLabel="Voltar"
          hitSlop={AREA_DE_TOQUE}
        >
          <Feather name="arrow-left" size={22} color={colors.ink} />
        </TouchableOpacity>
        <Text style={styles.title}>Criar conta</Text>
        <View style={styles.headerSpacer} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.form}
          keyboardShouldPersistTaps="handled"
        >
          {erroServidor && (
            <View style={styles.erroTopo}>
              <Feather name="alert-circle" size={14} color={colors.danger} />
              <Text style={styles.erroTopoTexto}>{erroServidor}</Text>
            </View>
          )}

          <Campo label="Nome completo" erro={erros.nome}>
            <TextInput
              style={styles.input}
              value={nome}
              onChangeText={alterar('nome', setNome)}
              autoCapitalize="words"
            />
          </Campo>

          <Campo label="CPF" erro={erros.cpf}>
            <TextInput
              style={styles.input}
              value={cpf}
              onChangeText={alterar('cpf', (v) => setCpf(mascararCpf(v)))}
              keyboardType="numeric"
              placeholder="000.000.000-00"
              placeholderTextColor={colors.muted}
              maxLength={14}
            />
          </Campo>

          <Campo label="Data de nascimento" erro={erros.nascimento}>
            <TextInput
              style={styles.input}
              value={nascimento}
              onChangeText={alterar('nascimento', (v) =>
                setNascimento(mascararData(v)),
              )}
              keyboardType="numeric"
              placeholder="dd/mm/aaaa"
              placeholderTextColor={colors.muted}
              maxLength={10}
            />
          </Campo>

          <Campo label="E-mail" erro={erros.email}>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={alterar('email', setEmail)}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholder="voce@exemplo.com"
              placeholderTextColor={colors.muted}
            />
          </Campo>

          <Campo label="Senha" erro={erros.senha}>
            <View style={styles.senhaLinha}>
              <TextInput
                style={[styles.input, styles.senhaInput]}
                value={senha}
                onChangeText={alterar('senha', setSenha)}
                secureTextEntry={!mostrarSenha}
                autoCapitalize="none"
                placeholder="Pelo menos 8 caracteres"
                placeholderTextColor={colors.muted}
              />
              <TouchableOpacity
                style={styles.olho}
                onPress={() => setMostrarSenha((atual) => !atual)}
                accessibilityRole="button"
                accessibilityLabel={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}
                hitSlop={AREA_DE_TOQUE}
              >
                <Feather
                  name={mostrarSenha ? 'eye-off' : 'eye'}
                  size={18}
                  color={colors.muted}
                />
              </TouchableOpacity>
            </View>
          </Campo>

          <Campo label="Confirmar senha" erro={erros.confirmacao}>
            <TextInput
              style={styles.input}
              value={confirmacao}
              onChangeText={alterar('confirmacao', setConfirmacao)}
              secureTextEntry={!mostrarSenha}
              autoCapitalize="none"
            />
          </Campo>

          <TouchableOpacity
            style={styles.aceite}
            onPress={() => setAceite((atual) => !atual)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: aceite }}
          >
            <Feather
              name={aceite ? 'check-square' : 'square'}
              size={20}
              color={aceite ? colors.sage : colors.muted}
            />
            <Text style={styles.aceiteTexto}>
              Concordo com o uso dos meus dados para o atendimento na clínica,
              conforme a LGPD.
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.botao,
              (!aceite || criando) && styles.botaoDesabilitado,
            ]}
            onPress={criarConta}
            disabled={!aceite || criando}
          >
            <Text style={styles.botaoTexto}>
              {criando ? 'Criando conta...' : 'Criar conta'}
            </Text>
          </TouchableOpacity>

          <View style={styles.rodape}>
            <Text style={styles.rodapeTexto}>Já tem conta? </Text>
            <TouchableOpacity onPress={voltarAoLogin}>
              <Text style={styles.rodapeLink}>Entrar</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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

  erroTopo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  erroTopoTexto: { flex: 1, fontSize: 13, color: colors.danger, lineHeight: 18 },

  campo: { marginBottom: 16 },
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
  erroCampo: { fontSize: 12, color: colors.danger, marginTop: 6 },

  senhaLinha: { flexDirection: 'row', alignItems: 'center' },
  senhaInput: { flex: 1, paddingRight: 44 },
  olho: { position: 'absolute', right: 14 },

  aceite: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginTop: 4,
    marginBottom: 8,
    paddingVertical: 6,
  },
  aceiteTexto: { flex: 1, fontSize: 13, color: colors.ink, lineHeight: 19 },

  botao: {
    backgroundColor: colors.sage,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 12,
  },
  botaoDesabilitado: { opacity: 0.6 },
  botaoTexto: { color: '#fff', fontWeight: '700', fontSize: 14 },

  rodape: { flexDirection: 'row', justifyContent: 'center', marginTop: 22 },
  rodapeTexto: { color: colors.muted, fontSize: 13 },
  rodapeLink: { color: colors.sage, fontWeight: '600', fontSize: 13 },
});
