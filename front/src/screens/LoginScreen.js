import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  View,
  TextInput,
} from 'react-native';
import { autenticar } from '../services/api';
import { salvarSessao } from '../services/sessao';
import { Tela, Texto, Botao, Logotipo, Pressionavel } from '../components';
import { useTema, estilosDeTexto, espaco, margemTela, raio, toque } from '../theme';

// Atalhos de teste: os logins didaticos do mock (os mesmos que a API
// imprime ao subir). So existem em desenvolvimento -- __DEV__ e false no
// build de producao, entao estes dados nem entram no app publicado.
const ACESSOS_DE_TESTE = __DEV__
  ? [
      { rotulo: 'Recepção', email: 'recepcao@clinica.com', senha: 'clinica123' },
      { rotulo: 'Profissional', email: 'joao@clinica.com', senha: 'medico123' },
      { rotulo: 'Paciente', email: 'lucas@exemplo.com', senha: 'paciente123' },
    ]
  : [];

function Campo({ rotulo, ...props }) {
  const { cores } = useTema();

  return (
    <View style={{ gap: 6 }}>
      <Texto variante="rotulo" cor="tinta2">
        {rotulo}
      </Texto>
      <TextInput
        placeholderTextColor={cores.desativado}
        style={[
          estilosDeTexto.corpo,
          {
            color: cores.tinta,
            backgroundColor: cores.superficie,
            borderWidth: 1,
            borderColor: cores.linha,
            borderRadius: raio.botao,
            borderCurve: 'continuous',
            paddingHorizontal: espaco.md,
            minHeight: toque.botao + 4,
          },
        ]}
        {...props}
      />
    </View>
  );
}

export default function LoginScreen({ navigation }) {
  const { cores } = useTema();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [entrando, setEntrando] = useState(false);
  const [error, setError] = useState(null);

  // Sem argumentos usa o que foi digitado; os atalhos de teste passam o
  // login direto.
  const entrar = async (emailInformado = email, senhaInformada = senha) => {
    // Campo vazio nao merece uma requisicao -- e nem que a senha saia pela
    // rede a toa.
    if (!emailInformado.trim() || !senhaInformada) {
      setError('Preencha e-mail e senha.');
      return;
    }

    setError(null);
    setEntrando(true);

    try {
      const dados = await autenticar(emailInformado.trim(), senhaInformada);

      await salvarSessao(dados.token, dados.usuario);

      // A senha nao precisa continuar na memoria do app: dagora em diante o
      // que vale e o token.
      setSenha('');

      // reset e nao navigate: o usuario nao pode voltar para o Login com o
      // gesto de voltar depois de autenticado. Senha temporaria (acesso
      // criado pela clinica) obriga a criar a propria antes de qualquer
      // outra tela -- o servidor tambem bloqueia o resto ate la.
      if (dados.usuario?.trocarSenha) {
        navigation.reset({
          index: 0,
          routes: [{ name: 'TrocarSenha', params: { obrigatorio: true } }],
        });
        return;
      }

      navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
    } catch (e) {
      if (e.credencialInvalida) {
        setError('E-mail ou senha inválidos.');
      } else {
        setError('Não foi possível entrar. Verifique se a API está no ar.');
      }
    } finally {
      setEntrando(false);
    }
  };

  return (
    <Tela bordas={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: 'center',
            paddingHorizontal: margemTela + 6,
            paddingVertical: espaco.lg,
            gap: espaco.md,
          }}
          keyboardShouldPersistTaps="handled"
        >
          <Logotipo
            tamanho="grande"
            assinatura
            style={{ marginBottom: espaco.lg }}
          />

          {error && (
            <View
              accessibilityRole="alert"
              style={{
                backgroundColor: cores.alertaSuave,
                borderColor: cores.alertaBorda,
                borderWidth: 1,
                borderRadius: raio.campo,
                padding: espaco.sm,
              }}
            >
              <Texto variante="rotulo" cor="alerta" selectable>
                {error}
              </Texto>
            </View>
          )}

          <Campo
            rotulo="E-mail"
            placeholder="voce@clinica.com"
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />

          <Campo
            rotulo="Senha"
            placeholder="••••••••"
            // secureTextEntry esconde a senha de quem olha a tela. Ele NAO
            // protege o que trafega na rede -- isso e papel do HTTPS.
            secureTextEntry
            autoCapitalize="none"
            autoComplete="current-password"
            value={senha}
            onChangeText={setSenha}
          />

          <Botao
            titulo="Entrar"
            onPress={() => entrar()}
            carregando={entrando}
            style={{ marginTop: espaco.xs }}
          />

          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              justifyContent: 'center',
              alignItems: 'center',
              marginTop: espaco.xs,
            }}
          >
            <Texto variante="rotulo" cor="apoio">
              Primeira vez aqui?{' '}
            </Texto>
            <Botao
              variante="texto"
              compacto
              titulo="Criar conta de paciente"
              onPress={() => navigation.navigate('CriarConta')}
            />
          </View>

          {/* Conta de equipe nao se cria pelo app: quem cria e a clinica. */}
          <Texto variante="legenda" cor="apoio" style={{ textAlign: 'center' }}>
            Profissionais e recepção entram com o acesso fornecido pela clínica.
          </Texto>

          {ACESSOS_DE_TESTE.length > 0 && (
            <View
              style={{
                marginTop: espaco.md,
                paddingTop: espaco.md,
                borderTopWidth: 1,
                borderTopColor: cores.linha,
                gap: 10,
              }}
            >
              <Texto variante="legenda" cor="apoio" style={{ textAlign: 'center' }}>
                Acesso rápido (só em desenvolvimento)
              </Texto>
              <View style={{ flexDirection: 'row', gap: espaco.xs }}>
                {ACESSOS_DE_TESTE.map((acesso) => (
                  <Pressionavel
                    key={acesso.email}
                    onPress={() => entrar(acesso.email, acesso.senha)}
                    disabled={entrando}
                    accessibilityRole="button"
                    accessibilityLabel={`Entrar como ${acesso.rotulo}`}
                    style={{
                      flex: 1,
                      minHeight: toque.minimo,
                      backgroundColor: cores.lavandaSuave,
                      borderRadius: raio.campo,
                      borderCurve: 'continuous',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Texto variante="legendaForte" cor="sobreLavandaSuave">
                      {acesso.rotulo}
                    </Texto>
                  </Pressionavel>
                ))}
              </View>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </Tela>
  );
}
