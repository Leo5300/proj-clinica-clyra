import React from 'react';
import { View } from 'react-native';
import { Avatar, Logotipo, Pressionavel, Texto } from '../../components';
import { espaco, toque } from '../../theme';
import { ROTULO_DO_PERFIL } from '../../navigation/permissoes';

// Topo do Inicio da recepcao e do medico: logotipo, perfil e o atalho
// para o Perfil. Sem vidro: a tela ja usa o limite de desfoque na barra
// (e, na recepcao, no filtro).
export default function TopoDaEquipe({ usuario, navigation }) {
  const perfil = usuario?.perfil;
  const tom = perfil === 'medico' ? 'lavanda' : 'salvia';

  const abrirPerfil = () =>
    perfil === 'medico'
      ? navigation.push('Perfil', { viaAba: true })
      : navigation.navigate('Perfil');

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        minHeight: toque.minimo,
      }}
    >
      <Logotipo />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: espaco.sm }}>
        <Texto variante="rotulo" cor="apoio">
          {ROTULO_DO_PERFIL[perfil]}
        </Texto>
        <Pressionavel
          onPress={abrirPerfil}
          accessibilityRole="button"
          accessibilityLabel="Abrir perfil"
        >
          <Avatar nome={usuario?.nome} fotoUri={usuario?.fotoUri} tom={tom} tamanho={toque.minimo} />
        </Pressionavel>
      </View>
    </View>
  );
}
