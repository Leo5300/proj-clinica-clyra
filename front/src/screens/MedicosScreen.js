import React, { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
  buscarMedicos,
  excluirMedico,
  SessaoExpirada,
  SemPermissao,
  ErroDaApi,
} from '../services/api';
import { Avatar, BotaoExcluir, ItemDeLista, TelaDeLista } from '../components';
import { registroDoProfissional } from '../services/profissionais';

// Medicos da clinica. So a recepcao chega aqui; o servidor confere o
// perfil de novo em cada chamada.

export default function MedicosScreen({ navigation }) {
  const [medicos, setMedicos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);

  const carregarMedicos = useCallback(async () => {
    try {
      setErro(null);
      const dados = await buscarMedicos();
      setMedicos(dados);
    } catch (e) {
      if (e instanceof SessaoExpirada) {
        navigation.reset({
          index: 0,
          routes: [{ name: 'Login' }],
        });
        return;
      }

      if (e instanceof SemPermissao) {
        setErro(e.mensagem ?? 'Você não tem permissão para isso.');
        return;
      }

      setErro('Não foi possível carregar os profissionais agora.');
    } finally {
      setCarregando(false);
    }
  }, [navigation]);

  // Ao voltar do cadastro, a lista vem de novo do servidor.
  useFocusEffect(
    useCallback(() => {
      carregarMedicos();
    }, [carregarMedicos]),
  );

  const confirmarExclusao = (medico) => {
    Alert.alert(
      'Excluir profissional',
      `Deseja excluir ${medico.nome}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: () => excluir(medico.id),
        },
      ],
    );
  };

  const excluir = async (id) => {
    try {
      await excluirMedico(id);
      carregarMedicos();
    } catch (e) {
      if (e instanceof SessaoExpirada) {
        navigation.reset({
          index: 0,
          routes: [{ name: 'Login' }],
        });
        return;
      }

      // 409: o servidor diz o que impede a exclusao.
      if (e instanceof ErroDaApi && e.mensagem) {
        Alert.alert('Não foi possível excluir', e.mensagem);
        return;
      }

      Alert.alert(
        'Erro',
        'Não foi possível excluir o profissional agora.',
      );
    }
  };

  return (
    <TelaDeLista
      titulo="Profissionais"
      subtitulo="Profissionais, especialidade e acesso ao app."
      navigation={navigation}
      acaoNova={{
        rotulo: 'Cadastrar profissional',
        onPress: () => navigation.navigate('CadastroMedico'),
      }}
      carregando={carregando}
      erro={erro}
      aoTentar={carregarMedicos}
      dados={medicos}
      keyExtractor={(item) => String(item.id)}
      renderItem={({ item }) => (
        <ItemDeLista
          titulo={item.nome}
          subtitulo={item.especialidade}
          detalhe={registroDoProfissional(item)}
          esquerda={<Avatar nome={item.nome} fotoUri={item.fotoUri} />}
          accessibilityLabel={`Editar ${item.nome}`}
          onPress={() => navigation.navigate('CadastroMedico', { medico: item })}
          direita={
            <BotaoExcluir
              rotulo={`Excluir ${item.nome}`}
              onPress={() => confirmarExclusao(item)}
            />
          }
        />
      )}
      vazio={{
        titulo: 'Nenhum profissional cadastrado',
        texto: 'Cadastre os profissionais para abrir a agenda.',
        acao: {
          titulo: 'Cadastrar profissional',
          onPress: () => navigation.navigate('CadastroMedico'),
        },
      }}
    />
  );
}
