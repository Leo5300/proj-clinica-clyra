# Design system da CLYRA

Guia curto para criar e mudar telas do app sem copiar estilo. Tudo o que é visual sai de dois lugares:

- `front/src/theme`: cores, fontes, espaços, raios e movimento.
- `front/src/components`: as peças prontas da interface.

Uma tela nova importa componentes e, no máximo, os espaços do tema. Se uma tela precisa de uma cor ou de um tamanho que não existe, ele entra no tema, não na tela.

## Tema

```js
import { useTema, espaco, margemTela, raio } from '../theme';

const { cores, escuro, movimentoReduzido, transparenciaReduzida } = useTema();
```

- `cores` já vem no tema da vez (claro ou escuro). Use sempre o nome do token, nunca o hexadecimal: `cores.papel`, `cores.tinta`, `cores.acao`.
- O modo (Automático, Claro ou Escuro) e a opção "reduzir transparência" ficam no Perfil e são guardados no aparelho.
- `espaco` segue a base de 4: `xxs` 4, `xs` 8, `sm` 12, `md` 16, `lg` 24, `xl` 32. A margem lateral de toda tela é `margemTela` (18).
- `raio`: `botao` 14, `cartao` 16, `folha` 28, `destaque` 30 (só nos cantos de baixo do bloco de destaque), `capsula` 999.
- O alvo de toque mínimo é 44 e o botão principal tem 48 de altura.

### Regra das cores

**Sálvia age, lavanda acolhe.**

- **Sálvia** (`acao`, `link`, `selFundo`, `salviaSuave`) é a única cor de ação, seleção e status.
- **Lavanda** (`lavanda`, `lavandaSuave`, `sobreLavandaSuave`) é para pessoas (avatares), avisos, o apoio e o acento do médico.
- Nunca use texto branco sobre lavanda.
- `alerta` é para erro, cancelamento e conflito. `atencao` é para avisos que pedem cuidado sem assustar.

### Fontes

- Bricolage Grotesque nos títulos e nas datas.
- Figtree em todo o resto.
- Montserrat só no logotipo.

Não use `fontWeight`: o peso vem da família. Use `<Texto variante="...">`, que já aplica a fonte certa. As variantes são `dataGrande`, `tituloGrande`, `titulo`, `tituloMedio`, `secao`, `corpo`, `corpoForte`, `rotulo`, `rotuloForte`, `legenda`, `legendaForte`, `pequeno` e `botao`.

Números de data, hora e sinais vitais usam `tabular`.

## Componentes

Todos saem de `front/src/components`. Cada arquivo começa com uma linha de comentário que lista as props.

| Componente | Para quê |
|---|---|
| `Tela` | Fundo de papel e área segura de telas simples. |
| `Texto` | Todo texto do app: `variante`, `cor` (token) e `tabular`. |
| `Botao` | Variantes `solido`, `contorno`, `vidro`, `tinta`, `inverso`, `contornoClaro`, `alerta` e `texto`. Aceita `carregando` e `desativado`. |
| `Pressionavel` | Base de tudo que se toca: escala 0,97 em 120 ms, ou só opacidade com "reduzir movimento". |
| `Campo` | Campo de texto com rótulo, erro e nota. |
| `Chip` | Opção selecionável, como dia, horário ou área. |
| `Segmentado` | Escolha entre poucas opções exclusivas: `suave`, ou `vidro` para filtro fixo. |
| `ItemDeLista` | Linha com divisor, usada no histórico, nos ajustes e nos cadastros. |
| `Avatar` | Foto ou iniciais. Lavanda para profissionais, neutro para pacientes. |
| `Selo` | Status em cápsula: Agendada, Ativos e afins. |
| `Cabecalho` | Voltar e título. `flutuante` põe o voltar em vidro sobre o conteúdo. |
| `BarraAbas` | Abas flutuantes do perfil logado, com o "+". |
| `ComVidro` | Tela que tem vidro flutuante (veja abaixo). |
| `Vidro` | Superfície de vidro: `claro`, `regular`, `espesso` e `tinta`. |
| `FolhaDecisao` | Decisão importante numa folha de vidro espesso: cancelar, sair, conflito. |
| `Esqueleto` | Bloco de carregamento no formato do conteúdo. |
| `EstadoVazio` | O que falta e o próximo passo, sem ilustração genérica. |
| `EstadoErro` | Erro de conexão com "Tentar de novo". |
| `SeloSucesso` | Check desenhado com vibração de sucesso. Use uma vez por ação. |
| `TelaDeLista` | Lista de cadastro completa: título, "+", carregando, vazio e erro. |
| `BotaoExcluir` | Lixeira de linha, com alvo de 44 e rótulo. |

## Vidro

Vidro é só para o que flutua e tem conteúdo de verdade passando por baixo: abas, barras, filtro fixo, voltar flutuante e folhas.

- Nunca use vidro como enfeite sobre cor lisa.
- Nunca ponha vidro sobre vidro.
- Dado de saúde, horário e valor ficam sempre em superfície opaca.

O `Vidro` escolhe sozinho como se desenhar:

- No iOS 26, é o Liquid Glass do sistema.
- No Android 12 ou mais novo, é um desfoque de verdade, mas só dentro de uma tela `ComVidro`.
- No Android 11 ou mais antigo, é uma cor quase sólida.
- Com "reduzir transparência" ligado, vira uma superfície opaca.

No Android, cada tela pode ter no máximo dois desfoques. O "+" em tinta não conta, porque é quase opaco.

```jsx
<ComVidro conteudo={<Animated.ScrollView>{/* o que rola */}</Animated.ScrollView>}>
  {/* o que flutua, sempre depois do conteúdo */}
  <Cabecalho flutuante aoVoltar={() => navigation.goBack()} />
</ComVidro>
```

## Movimento e vibração

- Animações usam o Reanimated e rodam no thread de interface.
- Nunca chame `setState` a cada quadro. Para rolagem, use `useRolagem`.
- Troca de aba nunca anima.
- Cada tela tem no máximo um movimento marcante.
- Com "reduzir movimento", sobram só mudanças de opacidade e cor.
- A vibração passa pelas funções de `services/haptica.js`: uma por ação e sempre junto com o visual.

## Estados

Toda tela que busca dados mostra os três estados:

- **Carregando**: `Esqueleto` no formato do conteúdo, nunca uma tela branca com um indicador girando.
- **Vazio**: `EstadoVazio` com o próximo passo.
- **Erro**: `EstadoErro` com "Tentar de novo".

## Exemplo de tela nova

```jsx
import React, { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { ItemDeLista, TelaDeLista } from '../components';
import { buscarEspecialidades } from '../services/api';

export default function ExemploScreen({ navigation }) {
  const [itens, setItens] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);

  const carregar = useCallback(async () => {
    try {
      setErro(null);
      setItens(await buscarEspecialidades());
    } catch (e) {
      setErro('Não foi possível carregar agora.');
    } finally {
      setCarregando(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { carregar(); }, [carregar]));

  return (
    <TelaDeLista
      titulo="Exemplo"
      navigation={navigation}
      carregando={carregando}
      erro={erro}
      aoTentar={carregar}
      dados={itens}
      keyExtractor={(item) => String(item.id)}
      renderItem={({ item }) => <ItemDeLista titulo={item.nome} />}
      vazio={{ titulo: 'Nada por aqui', texto: 'Quando houver itens, eles aparecem aqui.' }}
    />
  );
}
```

Uma rota nova entra em `AppNavigator.js` dentro de `protegida()` e no `ROTAS_POR_PERFIL` de `permissoes.js`.
