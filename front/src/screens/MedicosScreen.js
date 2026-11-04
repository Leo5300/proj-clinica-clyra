import React, { useState, useCallback } from 'react';
import { Alert, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
  buscarMedicos,
  excluirMedico,
  SessaoExpirada,
  SemPermissao,
  ErroDaApi,
} from '../services/api';
import {
  Avatar,
  Botao,
  BotaoExcluir,
  FiltroArea,
  ItemDeLista,
  Numeral,
  PlanoTopo,
  TODAS,
  TelaDeLista,
  Texto,
} from '../components';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  useTema,
  espaco,
  margemTela,
  raio,
  pontoSobreTinta,
  tomDoAvatar,
} from '../theme';
import { useUsuario } from '../services/sessao';
import { especialidadeERegistro } from '../services/profissionais';
import TopoDaEquipe from './home/TopoDaEquipe';

// Profissionais da clinica: aba da recepcao, com topo de tinta, a
// contagem por area e a lista com o conselho (CRP/CRM) visivel. So a
// recepcao chega aqui; o servidor confere o perfil de novo em cada
// chamada.

export default function MedicosScreen({ navigation }) {
  const { cores } = useTema();
  const insets = useSafeAreaInsets();
  const { usuario } = useUsuario();
  const [area, setArea] = useState(TODAS);
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

  // Contagem por area, so das areas que existem nos dados.
  const areas = [...new Set(medicos.map((m) => m.area).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b),
  );
  const porArea = areas.map((a) => ({
    area: a,
    total: medicos.filter((m) => m.area === a).length,
  }));
  const daArea = area === TODAS ? medicos : medicos.filter((m) => m.area === area);
  const novo = () => navigation.navigate('CadastroMedico');

  const topo = (
    <PlanoTopo
      fundo={cores.planoTinta}
      corTexto={cores.sobrePlanoTinta}
      style={{
        paddingTop: insets.top + espaco.xs,
        paddingHorizontal: margemTela + 2,
        paddingBottom: espaco.lg,
        gap: espaco.md,
      }}
    >
      <TopoDaEquipe
        usuario={usuario}
        navigation={navigation}
        corTexto={cores.sobrePlanoTinta}
        tomDoAvatar="lavanda"
      />
      <View style={{ gap: espaco.xs }}>
        <Texto variante="rotulo" cor={cores.sobrePlanoTinta2}>
          Equipe da clínica
        </Texto>
        <View
          accessible
          accessibilityRole="header"
          accessibilityLabel={`${medicos.length} profissionais`}
          style={{ flexDirection: 'row', alignItems: 'flex-end', gap: espaco.sm }}
        >
          <Numeral valor={carregando ? '–' : medicos.length} tamanho="grande" cor={cores.lavandaNumeral} />
          <Texto variante="titulo" cor={cores.sobrePlanoTinta} style={{ marginBottom: 12 }}>
            {medicos.length === 1 ? 'profissional' : 'profissionais'}
          </Texto>
        </View>
        {porArea.length > 0 ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: espaco.xs }}>
            {porArea.map(({ area: nome, total }) => (
              <View
                key={nome}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderRadius: raio.capsula,
                  backgroundColor: cores.capsulaSobreTinta,
                }}
              >
                <View
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: pontoSobreTinta(nome, cores),
                  }}
                />
                <Texto variante="pequeno" cor={cores.sobrePlanoTinta}>
                  {total} {nome}
                </Texto>
              </View>
            ))}
          </View>
        ) : null}
      </View>
    </PlanoTopo>
  );

  const cabecalhoDaLista = (
    <>
      {areas.length > 1 ? (
        <FiltroArea areas={areas} valor={area} aoMudar={setArea} rotuloTodas="Todos" />
      ) : null}
      <View
        style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
      >
        <Texto variante="titulo" accessibilityRole="header">
          Equipe
        </Texto>
        <Botao variante="texto" compacto titulo="Novo profissional" onPress={novo} />
      </View>
    </>
  );

  return (
    <TelaDeLista
      titulo="Profissionais"
      navigation={navigation}
      abaAtual="Medicos"
      topo={topo}
      barraClara
      cabecalhoDaLista={cabecalhoDaLista}
      carregando={carregando}
      erro={erro}
      aoTentar={carregarMedicos}
      dados={daArea}
      keyExtractor={(item) => String(item.id)}
      renderItem={({ item }) => (
        <ItemDeLista
          titulo={item.nome}
          subtitulo={especialidadeERegistro(item)}
          esquerda={
            <Avatar nome={item.nome} fotoUri={item.fotoUri} tom={tomDoAvatar(item.area)} />
          }
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
        acao: { titulo: 'Cadastrar profissional', onPress: novo },
      }}
    />
  );
}
