import React, { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
  buscarEspecialidades,
  excluirEspecialidade,
  SessaoExpirada,
  SemPermissao,
  ErroDaApi,
} from '../services/api';
import { BotaoExcluir, ItemDeLista, TelaDeLista } from '../components';

// Especialidades da clinica. So a recepcao chega aqui; o servidor recusa
// (409) excluir uma especialidade que ainda tem medico.

export default function EspecialidadesScreen({ navigation }) {
  const [especialidades, setEspecialidades] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);

  const irParaLogin = useCallback(() => {
    navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
  }, [navigation]);

  const carregarEspecialidades = useCallback(async () => {
    try {
      setErro(null);
      const dados = await buscarEspecialidades();
      setEspecialidades(dados);
    } catch (e) {
      if (e instanceof SessaoExpirada) {
        irParaLogin();
        return;
      }

      setErro(
        e instanceof SemPermissao
          ? e.mensagem ?? 'Você não tem permissão para isso.'
          : 'Não foi possível carregar as especialidades agora.',
      );
    } finally {
      setCarregando(false);
    }
  }, [irParaLogin]);

  // Ao voltar do cadastro, a lista vem de novo do servidor.
  useFocusEffect(
    useCallback(() => {
      carregarEspecialidades();
    }, [carregarEspecialidades]),
  );

  const excluir = async (id) => {
    try {
      await excluirEspecialidade(id);
      await carregarEspecialidades();
    } catch (e) {
      if (e instanceof SessaoExpirada) {
        irParaLogin();
        return;
      }

      Alert.alert(
        'Não foi possível excluir',
        e instanceof ErroDaApi && e.mensagem
          ? e.mensagem
          : 'Não foi possível excluir a especialidade agora.',
      );
    }
  };

  const confirmarExclusao = (especialidade) => {
    Alert.alert(
      'Excluir especialidade',
      `Deseja excluir ${especialidade.nome}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: () => excluir(especialidade.id),
        },
      ],
    );
  };

  const nova = () => navigation.navigate('CadastroEspecialidade');

  return (
    <TelaDeLista
      titulo="Especialidades"
      subtitulo="Áreas que aparecem no agendamento."
      navigation={navigation}
      acaoNova={{ rotulo: 'Cadastrar especialidade', onPress: nova }}
      carregando={carregando}
      erro={erro}
      aoTentar={carregarEspecialidades}
      dados={especialidades}
      keyExtractor={(item) => String(item.id)}
      renderItem={({ item }) => (
        <ItemDeLista
          titulo={item.nome}
          accessibilityLabel={`Editar ${item.nome}`}
          onPress={() =>
            navigation.navigate('CadastroEspecialidade', { especialidade: item })
          }
          direita={
            <BotaoExcluir
              rotulo={`Excluir ${item.nome}`}
              onPress={() => confirmarExclusao(item)}
            />
          }
        />
      )}
      vazio={{
        titulo: 'Nenhuma especialidade cadastrada',
        texto: 'Cadastre as especialidades antes de cadastrar os profissionais.',
        acao: { titulo: 'Cadastrar especialidade', onPress: nova },
      }}
    />
  );
}
