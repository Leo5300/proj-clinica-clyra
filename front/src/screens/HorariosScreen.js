import React, { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
  buscarHorarios,
  buscarMedicos,
  excluirHorario,
  SessaoExpirada,
  SemPermissao,
  ErroDaApi,
} from '../services/api';
import { useUsuario } from '../services/sessao';
import { BotaoExcluir, ItemDeLista, TelaDeLista } from '../components';

// Horarios de atendimento. A recepcao ve e edita os de todos; o medico ve
// e edita so a propria agenda -- o servidor ja devolve so os dele.

export default function HorariosScreen({ navigation }) {
  const { usuario } = useUsuario();
  const ehMedico = usuario?.perfil === 'medico';

  const [horarios, setHorarios] = useState([]);
  const [medicos, setMedicos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);

  const carregarHorarios = useCallback(async () => {
    try {
      setErro(null);

      const [dadosHorarios, dadosMedicos] = await Promise.all([
        buscarHorarios(),
        buscarMedicos(),
      ]);

      setHorarios(dadosHorarios);
      setMedicos(dadosMedicos);
    } catch (e) {
      if (e instanceof SessaoExpirada) {
        navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
        return;
      }

      if (e instanceof SemPermissao) {
        setErro(e.mensagem ?? 'Você não tem permissão para isso.');
        return;
      }

      setErro('Não foi possível carregar os horários agora.');
    } finally {
      setCarregando(false);
    }
  }, [navigation]);

  // Ao voltar do cadastro, a lista vem de novo do servidor.
  useFocusEffect(
    useCallback(() => {
      carregarHorarios();
    }, [carregarHorarios]),
  );

  const excluir = async (id) => {
    try {
      await excluirHorario(id);

      setHorarios((atuais) =>
        atuais.filter((horario) => String(horario.id) !== String(id)),
      );
    } catch (e) {
      if (e instanceof SessaoExpirada) {
        navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
        return;
      }

      Alert.alert(
        'Não foi possível excluir',
        e instanceof ErroDaApi && e.mensagem
          ? e.mensagem
          : 'Não foi possível excluir o horário agora.',
      );
    }
  };

  // Alert nativo, nunca window.confirm/alert: nao existem no aparelho.
  const confirmarExclusao = (horario) => {
    Alert.alert(
      'Excluir horário',
      `Deseja excluir o horário de ${horario.diaSemana}, das ${horario.horaInicio} às ${horario.horaFim}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: () => excluir(horario.id),
        },
      ],
    );
  };

  const nomeDoMedico = (medicoId) =>
    medicos.find((medico) => String(medico.id) === String(medicoId))?.nome;

  const novo = () => navigation.navigate('CadastroHorario');

  return (
    <TelaDeLista
      titulo={ehMedico ? 'Meus horários' : 'Horários'}
      subtitulo="Dias e faixas de atendimento."
      navigation={navigation}
      acaoNova={{ rotulo: 'Cadastrar horário', onPress: novo }}
      carregando={carregando}
      erro={erro}
      aoTentar={carregarHorarios}
      dados={horarios}
      keyExtractor={(item) => String(item.id)}
      renderItem={({ item }) => (
        <ItemDeLista
          titulo={item.diaSemana}
          detalhe={`${item.horaInicio} – ${item.horaFim}`}
          subtitulo={ehMedico ? null : nomeDoMedico(item.medicoId) ?? 'Profissional'}
          accessibilityLabel={`Editar horário de ${item.diaSemana}`}
          onPress={() => navigation.navigate('CadastroHorario', { horario: item })}
          direita={
            <BotaoExcluir
              rotulo={`Excluir horário de ${item.diaSemana}`}
              onPress={() => confirmarExclusao(item)}
            />
          }
        />
      )}
      vazio={{
        titulo: 'Nenhum horário cadastrado',
        texto: ehMedico
          ? 'Você ainda não cadastrou horários de atendimento.'
          : 'Sem horários, ninguém consegue agendar com o profissional.',
        acao: { titulo: 'Cadastrar horário', onPress: novo },
      }}
    />
  );
}
