import React, { useState, useCallback } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import {
  buscarConsultas,
  buscarPacientes,
  buscarMedicos,
  SessaoExpirada,
} from '../services/api';
import {
  dataDaConsulta,
  formatarHora,
  listarLembretesAgendados,
  notificacoesPermitidas,
} from '../services/lembretes';

// Lista de consultas. Rota "Consultas" -- a mesma que o botao "Sessões" do
// menu ja chamava. Mostra tambem quantos lembretes o aparelho tem
// agendados: e a conferencia de que cancelar consulta cancela lembrete.

// TODO: mover para front/src/theme quando o ThemeContext existir.
const colors = {
  bg: '#F5F5F2',
  surface: '#FFFFFF',
  border: '#E2E1DB',
  ink: '#4A5560',
  muted: '#8B909A',
  sage: '#4B7776',
  danger: '#B0555F',
  lavenderSoft: '#EFE9F3',
};

function formatarQuando(data) {
  const dia = String(data.getDate()).padStart(2, '0');
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  return `${dia}/${mes} às ${formatarHora(data)}`;
}

export default function ConsultasScreen({ navigation }) {
  const [consultas, setConsultas] = useState([]);
  const [pacientes, setPacientes] = useState({});
  const [medicos, setMedicos] = useState({});
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);
  const [lembretesAgendados, setLembretesAgendados] = useState(null);
  const [permitido, setPermitido] = useState(true);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);

    try {
      const [listaConsultas, listaPacientes, listaMedicos] =
        await Promise.all([
          buscarConsultas(),
          buscarPacientes(),
          buscarMedicos(),
        ]);

      // Mapas id -> nome: a consulta guarda so os ids.
      setPacientes(
        Object.fromEntries(listaPacientes.map((p) => [String(p.id), p.nome])),
      );
      setMedicos(
        Object.fromEntries(listaMedicos.map((m) => [String(m.id), m.nome])),
      );

      // Mais proxima primeiro.
      setConsultas(
        [...listaConsultas].sort(
          (a, b) => dataDaConsulta(a) - dataDaConsulta(b),
        ),
      );
    } catch (e) {
      if (e instanceof SessaoExpirada) {
        navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
        return;
      }
      setErro('Não foi possível carregar as consultas.');
    } finally {
      setCarregando(false);
    }

    // Estado dos lembretes no aparelho. Falhar aqui nao impede a lista.
    try {
      const [agendados, liberado] = await Promise.all([
        listarLembretesAgendados(),
        notificacoesPermitidas(),
      ]);
      setLembretesAgendados(agendados.length);
      setPermitido(liberado);
    } catch (e) {
      setLembretesAgendados(null);
    }
  }, [navigation]);

  // useFocusEffect: ao voltar de agendar, remarcar ou cancelar, a lista e a
  // contagem de lembretes vem de novo do servidor e do sistema.
  useFocusEffect(
    useCallback(() => {
      carregar();
    }, [carregar]),
  );

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Feather name="arrow-left" size={22} color={colors.ink} />
        </TouchableOpacity>
        <Text style={styles.title}>Consultas</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Agendar')}>
          <Feather name="plus" size={22} color={colors.ink} />
        </TouchableOpacity>
      </View>

      {!permitido && (
        // Sem permissao o lembrete falha em silencio. A tela precisa dizer.
        <View style={styles.aviso}>
          <Feather name="bell-off" size={14} color={colors.ink} />
          <Text style={styles.avisoTexto}>
            As notificações estão desativadas neste aparelho: nenhum lembrete
            de consulta vai aparecer. Ative nos ajustes do aparelho.
          </Text>
        </View>
      )}

      {carregando ? (
        <ActivityIndicator color={colors.sage} style={styles.indicador} />
      ) : erro ? (
        <View style={styles.centro}>
          <Text style={styles.erroTexto}>{erro}</Text>
          <TouchableOpacity style={styles.botao} onPress={carregar}>
            <Text style={styles.botaoTexto}>Tentar novamente</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          contentContainerStyle={styles.lista}
          data={consultas}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() =>
                navigation.navigate('DetalheConsulta', {
                  consultaId: String(item.id),
                })
              }
            >
              <Text style={styles.quando}>
                {formatarQuando(dataDaConsulta(item))}
              </Text>
              <Text style={styles.detalhe}>
                {pacientes[String(item.pacienteId)] ?? 'Paciente'} ·{' '}
                {medicos[String(item.medicoId)] ?? 'Médico'}
              </Text>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <Text style={styles.vazio}>Nenhuma consulta agendada.</Text>
          }
          ListFooterComponent={
            lembretesAgendados !== null && (
              <Text style={styles.rodape}>
                Lembretes agendados neste aparelho: {lembretesAgendados}
              </Text>
            )
          }
        />
      )}
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

  aviso: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: colors.lavenderSoft,
    borderRadius: 10,
    padding: 12,
    marginHorizontal: 20,
    marginBottom: 8,
  },
  avisoTexto: { flex: 1, fontSize: 12, color: colors.ink, lineHeight: 17 },

  indicador: { marginTop: 40 },
  centro: { padding: 20 },
  lista: { padding: 20, paddingBottom: 40 },

  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
  },
  quando: { fontSize: 16, fontWeight: '700', color: colors.ink },
  detalhe: { fontSize: 13, color: colors.muted, marginTop: 4 },

  vazio: { textAlign: 'center', color: colors.muted, marginTop: 40 },
  rodape: {
    textAlign: 'center',
    fontSize: 12,
    color: colors.muted,
    marginTop: 16,
  },
  erroTexto: { fontSize: 14, color: colors.danger, marginBottom: 6 },

  botao: {
    backgroundColor: colors.sage,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 10,
  },
  botaoTexto: { color: '#fff', fontWeight: '700', fontSize: 14 },
});