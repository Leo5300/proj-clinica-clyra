import React, { useState, useMemo } from 'react';
import {
  ScrollView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useTema, fontes } from '../theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import {
  criarEspecialidade,
  atualizarEspecialidade,
  SessaoExpirada,
  ErroDaApi,
} from '../services/api';

// Cadastro e edicao (route.params.especialidade) de especialidade. So a
// recepcao chega aqui; o servidor confere o perfil de novo ao gravar.

// A clinica atende em duas areas; a area decide o conselho do
// profissional (CRP ou CRM).
const AREAS = ['Psicologia', 'Psiquiatria'];

const AREA_DE_TOQUE = { top: 11, bottom: 11, left: 11, right: 11 };

export default function CadastroEspecialidadeScreen({ navigation, route }) {
  const { cores } = useTema();
  const styles = useMemo(() => criarEstilos(cores), [cores]);
  const especialidade = route.params?.especialidade;

  const [nome, setNome] = useState(especialidade?.nome ?? '');
  const [area, setArea] = useState(especialidade?.area ?? null);
  const [erro, setErro] = useState(null);
  const [erroArea, setErroArea] = useState(null);
  const [salvando, setSalvando] = useState(false);

  const salvar = async () => {
    const semNome = !nome.trim();
    setErro(semNome ? 'Informe o nome da especialidade.' : null);
    setErroArea(area ? null : 'Escolha a área.');
    if (semNome || !area) return;

    setSalvando(true);

    try {
      const dados = { nome: nome.trim(), area };

      if (especialidade) {
        await atualizarEspecialidade(especialidade.id, dados);
      } else {
        await criarEspecialidade(dados);
      }

      // So volta depois da confirmacao do servidor; a lista recarrega ao
      // receber o foco.
      navigation.goBack();
    } catch (e) {
      if (e instanceof SessaoExpirada) {
        navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
        return;
      }

      setErro(
        e instanceof ErroDaApi && e.mensagem
          ? e.mensagem
          : 'Não foi possível salvar a especialidade agora.',
      );
    } finally {
      setSalvando(false);
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
        <Text style={styles.title}>
          {especialidade ? 'Editar especialidade' : 'Nova especialidade'}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.form}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.campo}>
          <Text style={styles.label}>Nome</Text>
          <TextInput
            style={styles.input}
            value={nome}
            onChangeText={(valor) => {
              setNome(valor);
              setErro(null);
            }}
            placeholder="Ex.: Psicologia clínica"
            placeholderTextColor={cores.desativado}
          />
          {erro && <Text style={styles.erroCampo}>{erro}</Text>}
        </View>

        <View style={styles.campo}>
          <Text style={styles.label}>Área</Text>
          <View style={styles.opcoes}>
            {AREAS.map((opcao) => {
              const selecionada = area === opcao;

              return (
                <TouchableOpacity
                  key={opcao}
                  style={[styles.opcao, selecionada && styles.opcaoSelecionada]}
                  onPress={() => {
                    setArea(opcao);
                    setErroArea(null);
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
                    {opcao}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {erroArea && <Text style={styles.erroCampo}>{erroArea}</Text>}
        </View>

        <TouchableOpacity
          style={[styles.botao, salvando && styles.botaoDesabilitado]}
          onPress={salvar}
          disabled={salvando}
        >
          <Text style={styles.botaoTexto}>
            {salvando ? 'Salvando...' : 'Salvar'}
          </Text>
        </TouchableOpacity>
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
    campo: { marginBottom: 16 },
    label: {
      fontSize: 12,
      fontFamily: fontes.textoSemi,
      color: cores.apoio,
      marginBottom: 6,
    },
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
    erroCampo: { fontFamily: fontes.texto, fontSize: 12, color: cores.alerta, marginTop: 6 },
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
      backgroundColor: cores.salviaSuave,
      borderColor: cores.acao,
    },
    opcaoTexto: { fontFamily: fontes.texto, fontSize: 14, color: cores.tinta },
    opcaoTextoSelecionado: { color: cores.link, fontFamily: fontes.textoForte },

    botao: {
      backgroundColor: cores.acao,
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: 'center',
      marginTop: 8,
    },
    botaoDesabilitado: { opacity: 0.6 },
    botaoTexto: { color: cores.sobreAcao, fontFamily: fontes.textoForte, fontSize: 14 },
  });
