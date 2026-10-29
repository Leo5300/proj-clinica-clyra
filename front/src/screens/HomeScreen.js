import React, { useState, useCallback } from 'react';

import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Image,
  StyleSheet,
} from 'react-native';

import { useFocusEffect } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import {
  obterMe,
  buscarConsultas,
  buscarMedicos,
  buscarPacientes,
  SessaoExpirada,
} from '../services/api';
import { atualizarUsuario } from '../services/sessao';
import {
  dataDaConsulta,
  formatarHora,
  sincronizarLembretes,
} from '../services/lembretes';
import { formatarDataCurta, saudacaoPorHorario } from '../services/datas';
import {
  MENU_POR_PERFIL,
  ROTULO_DO_PERFIL,
  CORES_DO_PERFIL,
} from '../navigation/permissoes';

// TODO: quando tivermos mais telas, mover para front/src/theme.js
// Mesma paleta extraída do logo, usada também na tela de Login.
const colors = {
  bg: '#F5F5F2',
  surface: '#FFFFFF',
  surfaceAlt: '#ECEBE6',
  border: '#E2E1DB',
  ink: '#4A5560',
  muted: '#8B909A',
  sage: '#4B7776',
  sageSoft: '#E3EEEA',
  lavender: '#9A8BB6',
  lavenderSoft: '#EFE9F3',
  danger: '#B0555F',
};

const icone = require('../../assets/imgs/icone-clyra.png');

function iniciais(nome) {
  const partes = String(nome ?? '').trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return '?';

  const primeira = partes[0][0];
  const ultima = partes.length > 1 ? partes[partes.length - 1][0] : '';
  return `${primeira}${ultima}`.toUpperCase();
}

function mesmoDia(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export default function HomeScreen({ navigation }) {
  const [usuario, setUsuario] = useState(null);
  const [consultas, setConsultas] = useState([]);
  // id -> nome: o paciente ve o medico da consulta; o medico ve o paciente.
  const [medicos, setMedicos] = useState({});
  const [pacientes, setPacientes] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [erro, setErro] = useState(null);

  const fetchHome = useCallback(async () => {
    try {
      setErro(null);

      // Quem esta logado vem do servidor: perfil ou foto podem ter mudado
      // desde o ultimo acesso neste aparelho.
      const [me, listaConsultas] = await Promise.all([
        obterMe(),
        buscarConsultas(),
      ]);

      await atualizarUsuario(me);

      const [listaMedicos, listaPacientes] = await Promise.all([
        me.perfil === 'paciente' ? buscarMedicos() : [],
        me.perfil === 'medico' ? buscarPacientes() : [],
      ]);

      setUsuario(me);
      setConsultas(listaConsultas);
      setMedicos(
        Object.fromEntries(listaMedicos.map((m) => [String(m.id), m])),
      );
      setPacientes(
        Object.fromEntries(listaPacientes.map((p) => [String(p.id), p])),
      );

      // So no aparelho do paciente, sem segurar a tela: alinha os
      // lembretes com o que o servidor tem agora.
      if (me.perfil === 'paciente') {
        sincronizarLembretes(listaConsultas);
      }
    } catch (e) {
      if (e instanceof SessaoExpirada) {
        navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
        return;
      }

      setErro('Não foi possível carregar o início agora.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [navigation]);

  // useFocusEffect: ao voltar de agendar, cancelar ou trocar a foto, a
  // Home mostra o estado novo.
  useFocusEffect(
    useCallback(() => {
      fetchHome();
    }, [fetchHome]),
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchHome();
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.safe, styles.center]}>
        <ActivityIndicator color={colors.sage} size="large" />
      </SafeAreaView>
    );
  }

  if (!usuario) {
    return (
      <SafeAreaView style={[styles.safe, styles.center]}>
        <Text style={styles.erroTexto}>
          {erro ?? 'Não foi possível carregar o início agora.'}
        </Text>
        <TouchableOpacity style={styles.botao} onPress={fetchHome}>
          <Text style={styles.botaoTexto}>Tentar novamente</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const perfil = usuario.perfil;
  const cores = CORES_DO_PERFIL[perfil] ?? CORES_DO_PERFIL.paciente;
  const primeiroNome =
    perfil === 'recepcao' ? null : String(usuario.nome ?? '').split(' ')[0];

  const agora = new Date();
  const ordenadas = [...consultas].sort(
    (a, b) => dataDaConsulta(a) - dataDaConsulta(b),
  );
  const deHoje = ordenadas.filter((c) => mesmoDia(dataDaConsulta(c), agora));
  const futuras = ordenadas.filter((c) => dataDaConsulta(c) > agora);

  const quickActions = [
    ...(MENU_POR_PERFIL[perfil] ?? []),
    { rotulo: 'Meu perfil', icone: 'user', rota: 'Perfil' },
  ];

  const renderCartaoPaciente = () => {
    const proxima = futuras[0];

    if (!proxima) {
      return (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>
            Você não tem consultas marcadas.
          </Text>

          <TouchableOpacity
            style={styles.botao}
            onPress={() => navigation.navigate('Agendar')}
          >
            <Text style={styles.botaoTexto}>Agendar consulta</Text>
          </TouchableOpacity>
        </View>
      );
    }

    const quando = dataDaConsulta(proxima);
    const medico = medicos[String(proxima.medicoId)];

    return (
      <TouchableOpacity
        style={styles.apptCard}
        onPress={() =>
          navigation.navigate('DetalheConsulta', {
            consultaId: String(proxima.id),
          })
        }
      >
        <Text style={styles.apptEyebrow}>Sua próxima consulta</Text>

        <Text style={styles.apptDoc}>{medico?.nome ?? 'Médico'}</Text>

        {medico?.especialidade ? (
          <Text style={styles.apptSpec}>{medico.especialidade}</Text>
        ) : null}

        <View style={styles.apptHr} />

        <Text style={styles.apptWhen}>
          {formatarDataCurta(quando)} · {formatarHora(quando)}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderCartaoMedico = () => {
    const proxima = deHoje.find((c) => dataDaConsulta(c) > agora);

    return (
      <TouchableOpacity
        style={styles.apptCard}
        onPress={() => navigation.navigate('Consultas')}
      >
        <Text style={styles.apptEyebrow}>Hoje</Text>

        {deHoje.length === 0 ? (
          <Text style={styles.apptDoc}>Nenhuma consulta hoje.</Text>
        ) : (
          <>
            <Text style={styles.apptDoc}>
              {deHoje.length === 1
                ? '1 consulta'
                : `${deHoje.length} consultas`}
            </Text>

            {proxima && (
              <>
                <View style={styles.apptHr} />
                <Text style={styles.apptRel}>Próxima</Text>
                <Text style={styles.apptWhen}>
                  {formatarHora(dataDaConsulta(proxima))} ·{' '}
                  {pacientes[String(proxima.pacienteId)]?.nome ?? 'Paciente'}
                </Text>
              </>
            )}
          </>
        )}
      </TouchableOpacity>
    );
  };

  const renderCartaoRecepcao = () => (
    <TouchableOpacity
      style={styles.apptCard}
      onPress={() => navigation.navigate('Consultas')}
    >
      <Text style={styles.apptEyebrow}>Hoje na clínica</Text>
      <Text style={styles.apptDoc}>
        {deHoje.length === 0
          ? 'Nenhuma consulta hoje.'
          : deHoje.length === 1
            ? '1 consulta'
            : `${deHoje.length} consultas`}
      </Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.sage}
          />
        }
      >
        <View style={styles.brandRow}>
          <Image
            source={icone}
            style={styles.brandIcon}
            resizeMode="contain"
          />

          <TouchableOpacity
            onPress={() => navigation.navigate('Perfil')}
            style={styles.avatarButton}
            accessibilityRole="button"
            accessibilityLabel="Abrir meu perfil"
          >
            {usuario.fotoUri ? (
              <Image source={{ uri: usuario.fotoUri }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarIniciais]}>
                <Text style={styles.avatarTexto}>
                  {iniciais(usuario.nome)}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        <Text style={styles.name}>
          {saudacaoPorHorario(agora)}
          {primeiroNome ? `, ${primeiroNome}` : ''}
        </Text>

        <View style={[styles.selo, { backgroundColor: cores.fundo }]}>
          <Text style={[styles.seloTexto, { color: cores.cor }]}>
            {ROTULO_DO_PERFIL[perfil]}
          </Text>
        </View>

        {erro && <Text style={styles.erroTexto}>{erro}</Text>}

        {perfil === 'paciente' && renderCartaoPaciente()}
        {perfil === 'medico' && renderCartaoMedico()}
        {perfil === 'recepcao' && renderCartaoRecepcao()}

        <View style={styles.quickGrid}>
          {quickActions.map((a) => (
            <TouchableOpacity
              key={a.rota}
              style={styles.quickItem}
              onPress={() => navigation.navigate(a.rota)}
            >
              <View style={styles.quickIcon}>
                <Feather
                  name={a.icone}
                  size={18}
                  color={colors.sage}
                />
              </View>

              <Text style={styles.quickLabel}>
                {a.rotulo}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg,
  },

  center: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },

  content: {
    padding: 20,
    paddingBottom: 40,
  },

  brandRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  brandIcon: {
    width: 32,
    height: 32,
  },

  avatarButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },

  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
  },

  avatarIniciais: {
    backgroundColor: colors.sageSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },

  avatarTexto: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.sage,
  },

  name: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.ink,
    marginTop: 20,
  },

  selo: {
    alignSelf: 'flex-start',
    borderRadius: 10,
    paddingVertical: 4,
    paddingHorizontal: 10,
    marginTop: 8,
  },

  seloTexto: {
    fontSize: 12,
    fontWeight: '600',
  },

  apptCard: {
    marginTop: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 18,
  },

  apptEyebrow: {
    fontSize: 10,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colors.lavender,
    marginBottom: 8,
    fontWeight: '600',
  },

  apptDoc: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.ink,
  },

  apptSpec: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 2,
  },

  apptHr: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: 14,
    marginBottom: 14,
  },

  apptWhen: {
    fontSize: 18,
    color: colors.ink,
    fontWeight: '600',
  },

  apptRel: {
    fontSize: 11,
    color: colors.muted,
    marginBottom: 2,
  },

  emptyCard: {
    marginTop: 20,
    backgroundColor: colors.sageSoft,
    borderRadius: 14,
    padding: 16,
  },

  emptyText: {
    fontSize: 13,
    color: colors.ink,
    marginBottom: 6,
  },

  erroTexto: {
    fontSize: 13,
    color: colors.danger,
    marginTop: 12,
    textAlign: 'center',
  },

  botao: {
    backgroundColor: colors.sage,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginTop: 8,
  },

  botaoTexto: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },

  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    marginTop: 22,
    gap: 14,
  },

  quickItem: {
    alignItems: 'center',
    gap: 8,
    width: '22%',
  },

  quickIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },

  quickLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.ink,
    textAlign: 'center',
  },
});
