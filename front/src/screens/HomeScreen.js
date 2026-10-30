import React, { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  obterMe,
  buscarConsultas,
  buscarMedicos,
  buscarPacientes,
  SessaoExpirada,
} from '../services/api';
import { atualizarUsuario, useUsuario } from '../services/sessao';
import { sincronizarLembretes } from '../services/lembretes';
import HomePaciente from './home/HomePaciente';
import HomeMedico from './home/HomeMedico';
import HomeRecepcao from './home/HomeRecepcao';

// Rota unica "Home" para os tres perfis. Esta tela so busca os dados; o
// que cada perfil ve fica em screens/home/.

export default function HomeScreen({ navigation }) {
  // O resumo do cofre ja diz o perfil antes de o servidor responder: e o
  // que permite mostrar o carregamento certo de cada Home.
  const { usuario: usuarioDaSessao } = useUsuario();

  const [usuario, setUsuario] = useState(null);
  const [consultas, setConsultas] = useState([]);
  // id -> cadastro: o paciente ve o medico da consulta; o medico ve o
  // paciente.
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

      // A recepcao tambem ve nomes de medicos e pacientes na agenda. O
      // medico busca a lista para achar o proprio cadastro: a area dele
      // define a cor do topo (o /me nao traz a area).
      const [listaMedicos, listaPacientes] = await Promise.all([
        buscarMedicos(),
        me.perfil === 'paciente' ? [] : buscarPacientes(),
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

  const perfil = usuario?.perfil ?? usuarioDaSessao?.perfil;

  const props = {
    navigation,
    usuario,
    consultas,
    medicos,
    pacientes,
    carregando: loading,
    erro,
    atualizando: refreshing,
    aoAtualizar: onRefresh,
    aoTentar: fetchHome,
  };

  if (perfil === 'paciente') return <HomePaciente {...props} />;
  if (perfil === 'medico') return <HomeMedico {...props} />;
  return <HomeRecepcao {...props} />;
}
