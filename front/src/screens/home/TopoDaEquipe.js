import React from 'react';
import { View } from 'react-native';
import { Avatar, Logotipo, Pressionavel, Texto } from '../../components';
import { espaco, toque } from '../../theme';
import { ROTULO_DO_PERFIL } from '../../navigation/permissoes';

// Primeira linha do topo colorido da recepcao e do profissional: logotipo,
// quem esta logado e o atalho para o Perfil. corTexto acompanha o plano
// (tinta sobre lilas e menta, claro sobre a tinta); rotulo troca o nome
// do perfil ("Profissional · Psicologia"); tomDoAvatar casa com o plano.
export default function TopoDaEquipe({ usuario, navigation, corTexto, rotulo, tomDoAvatar = 'vidro' }) {
  const perfil = usuario?.perfil;

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
      <Logotipo cor={corTexto} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: espaco.sm, flexShrink: 1 }}>
        <Texto variante="rotuloForte" cor={corTexto} numberOfLines={1} style={{ flexShrink: 1 }}>
          {rotulo ?? ROTULO_DO_PERFIL[perfil]}
        </Texto>
        <Pressionavel
          onPress={abrirPerfil}
          accessibilityRole="button"
          accessibilityLabel="Abrir perfil"
        >
          <Avatar
            nome={usuario?.nome}
            fotoUri={usuario?.fotoUri}
            tom={tomDoAvatar}
            tamanho={toque.minimo}
          />
        </Pressionavel>
      </View>
    </View>
  );
}
