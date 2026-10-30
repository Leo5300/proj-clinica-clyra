// Barra de abas flutuante em vidro, com o "+" em lavanda. navigation; atual (nome da rota aberta). As abas saem do perfil logado e de podeAcessar.
//
// Abas sao irmas: a pilha nunca passa de [Home, aba]. Inicio volta com
// popTo; de Home para outra aba e push; entre abas e replace. Tudo com
// "viaAba", que o AppNavigator usa para trocar sem animacao. Assim o
// voltar do Android leva ao Inicio e, do Inicio, sai do app.
import React from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import Pressionavel from './Pressionavel';
import Vidro, { escalaDoVidro } from './Vidro';
import Texto from './Texto';
import { useTema, espaco, raio, fontes } from '../theme';
import { useUsuario } from '../services/sessao';
import { podeAcessar } from '../navigation/permissoes';

const ABAS_DO_PERFIL = {
  paciente: [
    { rota: 'Home', rotulo: 'Início', icone: 'home' },
    { rota: 'Consultas', rotulo: 'Consultas', icone: 'calendar' },
    { rota: 'Perfil', rotulo: 'Perfil', icone: 'user' },
  ],
  recepcao: [
    { rota: 'Home', rotulo: 'Agenda', icone: 'calendar' },
    { rota: 'Pacientes', rotulo: 'Pacientes', icone: 'users' },
    { rota: 'Cadastros', rotulo: 'Cadastros', icone: 'grid' },
  ],
  medico: [
    { rota: 'Home', rotulo: 'Agenda', icone: 'calendar' },
    { rota: 'Pacientes', rotulo: 'Pacientes', icone: 'users' },
    { rota: 'Perfil', rotulo: 'Perfil', icone: 'user' },
  ],
};

// O "+" agenda. O medico nao marca consultas: sem "+".
const ROTULO_DO_MAIS = {
  paciente: 'Agendar consulta',
  recepcao: 'Nova consulta',
};

const ALTURA = 64;

// Espaco que o conteudo rolavel deixa no fim para nao ficar sob a barra.
export function useEspacoDaBarra() {
  const insets = useSafeAreaInsets();
  return ALTURA + espaco.md + Math.max(insets.bottom, espaco.sm) + espaco.lg;
}

// Rotas que sao abas de algum perfil: telas que mostram a barra.
export function ehAba(perfil, rota) {
  return (ABAS_DO_PERFIL[perfil] ?? []).some((aba) => aba.rota === rota);
}

export default function BarraAbas({ navigation, atual }) {
  const { cores } = useTema();
  const { usuario } = useUsuario();
  const insets = useSafeAreaInsets();

  const perfil = usuario?.perfil;
  const abas = (ABAS_DO_PERFIL[perfil] ?? []).filter((aba) =>
    podeAcessar(perfil, aba.rota),
  );
  const rotuloDoMais = ROTULO_DO_MAIS[perfil];

  if (abas.length === 0) return null;

  const irPara = (rota) => {
    if (rota === atual) return;

    if (rota === 'Home') {
      navigation.popTo('Home');
    } else if (atual === 'Home') {
      navigation.push(rota, { viaAba: true });
    } else {
      navigation.replace(rota, { viaAba: true });
    }
  };

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        left: espaco.md,
        right: espaco.md,
        bottom: Math.max(insets.bottom, espaco.sm) + espaco.xs,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
      }}
    >
      <Vidro style={{ flex: 1, height: ALTURA }}>
        <View
          accessibilityRole="tablist"
          style={{
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 6,
          }}
        >
          {abas.map((aba) => {
            const ativa = aba.rota === atual;
            const cor = ativa ? cores.sobreAbaAtiva : cores.tinta;

            // Troca de aba nunca anima: sem escala no toque.
            return (
              <Pressionavel
                key={aba.rota}
                escala="nenhuma"
                onPress={() => irPara(aba.rota)}
                accessibilityRole="tab"
                accessibilityLabel={aba.rotulo}
                accessibilityState={{ selected: ativa }}
                style={{
                  flex: 1,
                  maxWidth: 96,
                  height: 52,
                  borderRadius: raio.capsula,
                  backgroundColor: ativa ? cores.abaAtiva : 'transparent',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 2,
                }}
              >
                <Feather name={aba.icone} size={22} color={cor} />
                <Texto
                  variante="pequeno"
                  cor={cor}
                  numberOfLines={1}
                  maxFontSizeMultiplier={1.3}
                  style={ativa ? { fontFamily: fontes.textoForte } : null}
                >
                  {aba.rotulo}
                </Texto>
              </Pressionavel>
            );
          })}
        </View>
      </Vidro>

      {rotuloDoMais && podeAcessar(perfil, 'Agendar') ? (
        <Pressionavel
          escala={escalaDoVidro}
          onPress={() => navigation.navigate('Agendar')}
          accessibilityRole="button"
          accessibilityLabel={rotuloDoMais}
        >
          <Vidro espessura="tinta" interativo style={{ width: ALTURA, height: ALTURA }}>
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <Feather name="plus" size={26} color={cores.sobreVidroTinta} />
            </View>
          </Vidro>
        </Pressionavel>
      ) : null}
    </View>
  );
}
