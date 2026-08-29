# CLYRA — Sistema de Agendamento para Clínica Médica

> Projeto integrador da Unidade Curricular **Aplicações Mobile**, construído ao longo de 16 aulas.

**Squad:** Felipe Augusto da Silva, Jean Vinicius Rodrigues de Oliveira, Leonardo Marchi Malheiros, Gabriel Vinicius Martins
**Curso:** Superior de Tecnologia em Análise e Desenvolvimento de Sistemas — Turma CSTADS601
**Professor:** Prof. Dr. Maurício Falvo

---

## Sobre o desafio

Este projeto é a resposta à Situação de Aprendizagem Desafiadora da unidade curricular:
criar a aplicação mobile de um sistema de agendamento de consultas para uma clínica
médica, atendendo pacientes e médicos com um aplicativo que vai além do CRUD básico.

O aplicativo consome a API RESTful da clínica (cadastro de pacientes, médicos,
especialidades, horários, agendamento e cancelamento de consultas — toda a comunicação
ocorre via HTTPS por lidar com dados sensíveis de pacientes) e integra:

- **Recursos nativos do dispositivo:** câmera, Bluetooth, GPS e biometria.
- **Recursos de plataforma:** notificações locais/push, mapas, SMS e processamento em
  segundo plano (background), com uso de multithread para não travar a interface.
- **Web Services de terceiros:** notificação push, gateway de SMS e provedor de mapas.

A Clyra é posicionada como clínica de psicologia e psiquiatria. Essa escolha da squad
orienta a identidade visual (paleta em tons de verde e lavanda, linguagem acolhedora) e
justifica telas que não estavam no escopo mínimo, como o Diário do paciente.

## Estrutura do repositório

```
proj-clinica-clyra/
├── back/              API REST em Spring Boot (Java)
├── docs/              identidade visual — logos em tema claro e escuro
├── front/             aplicação mobile em React Native + Expo
├── db_clinica.json    base mock consumida pelo json-server em desenvolvimento
└── README.md
```

Organização do `front/`:

```
front/
├── App.js
├── index.js
└── src/
    ├── components/    componentes reutilizáveis (ThemeToggle)
    ├── navigation/    AppNavigator — stack de rotas
    ├── screens/       uma tela por arquivo
    ├── services/      camada de acesso à API
    └── theme/         ThemeContext — paleta clara/escura
```

## Funcionalidades

Checklist dos entregáveis previstos na Situação de Aprendizagem Desafiadora do Plano de
Ensino. Marcado conforme cada item é implementado pela squad.

- [ ] Protótipo wireframe das interfaces da aplicação (Figma)
- [x] Projeto do aplicativo configurado e versionado no Git
- [ ] Cadastro de foto de perfil (paciente e médico) via câmera do dispositivo
- [ ] Login com biometria implementado para médico/recepção
- [ ] Geolocalização (GPS) com cálculo de distância/tempo até a clínica
- [ ] Importação de sinais vitais de um periférico via Bluetooth antes da consulta
- [ ] Implementação das interfaces de listagem (leitura) para pacientes, médicos,
      especialidades e horários, consumindo a API RESTful
- [ ] Operações de escrita (cadastro/edição/exclusão) para pacientes, médicos,
      especialidades e horários
- [ ] Integração inicial com os endpoints de usuários e login, via HTTPS
- [ ] Identificação dos recursos que dependem de Web Services de terceiros
- [ ] Notificação local/push como lembrete de consulta agendada
- [ ] Processamento multithread para tarefas pesadas não travarem a interface
- [ ] Sincronização da agenda em segundo plano (tarefa/serviço background)
- [ ] Mapa exibindo a localização da clínica dentro do aplicativo
- [ ] Confirmação/cancelamento de consulta enviado por SMS
- [ ] Funcionalidade de agendamento de consultas (paciente)
- [ ] Funcionalidade de listagem das consultas agendadas
- [ ] Funcionalidade de cancelamento de consulta
- [ ] Funcionalidade de visualização de agenda para o médico
- [ ] Aplicação com testes end-to-end rodando com sucesso
- [ ] Documentação do sistema — guia do usuário e técnica
- [ ] Build de produção gerado e documentação dos passos de publicação nas lojas
- [ ] Versão final do aplicativo pronta para apresentação

## Telas principais

| Tela | Funcionalidade | Navega para |
|---|---|---|
| Login | Autenticação por e-mail/senha ou biometria. Rota inicial do app. | Home, Cadastro |
| Home | Menu principal do paciente, ponto de partida para todas as áreas. | Agendar, Consultas, Diário, Perfil, Mapa, Médicos, Pacientes |
| Agendar | Solicitação de sessão informando especialidade e data desejada. | Home |
| Consultas | Listagem das consultas do paciente, com opção de cancelamento. | Home |
| Diário | Registro de acompanhamento entre sessões, específico da proposta clínica. | Home |
| Perfil | Dados do paciente e foto de perfil. | Home |
| Mapa | Localização da clínica e distância a partir do usuário. | Home |
| Médicos | Listagem de médicos vinda de `GET /medicos`, com cadastro, edição e exclusão. | Cadastro/Edição de Médico |
| Cadastro/Edição de Médico | Formulário único: cria via `POST` ou atualiza via `PUT`. | Médicos |
| Pacientes | Listagem de pacientes vinda de `GET /pacientes`. | Home |
| Horários | Listagem de horários vinda de `GET /horarios`, com cadastro, edição e exclusão. | Home |
| Especialidades | Listagem de especialidades vinda de `GET /especialidades`, com cadastro, edição e exclusão. | Home |

## Tecnologias

- [React Native](https://reactnative.dev/) com [Expo](https://expo.dev/) SDK 54
- [React Navigation](https://reactnavigation.org/) — `@react-navigation/native` e
  `@react-navigation/native-stack`, com `react-native-screens` e
  `react-native-safe-area-context`
- `@expo/vector-icons` — famílias Feather e MaterialCommunityIcons
- Context API para o tema claro/escuro (`src/theme/ThemeContext.js`)
- `fetch` nativo para consumo da API (sem axios — decisão registrada em
  "Decisões técnicas")
- API RESTful da clínica em Spring Boot (pasta `back/`), com mock local via
  `json-server` durante o desenvolvimento

## Pré-requisitos

- [Node.js](https://nodejs.org/) (versão LTS recomendada)
- npm
- [Expo Go](https://expo.dev/go) no celular físico, **ou** emulador Android/iOS
- Git

## Instalação e configuração

```bash
git clone https://github.com/Leo5300/proj-clinica-clyra.git
cd proj-clinica-clyra/front
npm install
```

### Variáveis de configuração

O endereço da API fica centralizado em `front/src/services/api.js`:

```js
const BASE_URL = "http://localhost:3000";
```

> Em dispositivo físico (Expo Go), `localhost` não funciona — no aparelho, `localhost`
> é o próprio aparelho. Use o IPv4 da máquina que está rodando a API, na mesma rede
> Wi-Fi (`ipconfig` no Windows, adaptador Wi-Fi). O IP muda quando o roteador renova o
> DHCP; confira antes de cada sessão de trabalho.

### Subindo a API mock (durante o desenvolvimento)

Em um terminal separado, na raiz do repositório:

```bash
npx json-server --watch db_clinica.json --port 3000
```

Coleções disponíveis: `/medicos`, `/pacientes`, `/especialidades` e `/horarios`.
Teste em `http://localhost:3000/medicos` antes de subir o app.

## Como executar

```bash
cd front
npx expo start
```

Escaneie o QR Code com o Expo Go, ou pressione `a` / `i` para abrir em um emulador.

> A tecla `w` abre no navegador, o que é prático para iterar layout — mas
> `Alert.alert` não funciona no React Native Web. Diálogos de confirmação só
> aparecem no Expo Go ou em emulador.

## Permissões necessárias

| Recurso | Quando é solicitado | Comportamento se negado |
|---|---|---|
| Câmera | [a preencher — Aula 1] | [a preencher] |
| Biometria | [a preencher — Aula 6] | [a preencher] |
| Localização (GPS) | [a preencher — Aula 6] | [a preencher] |
| Bluetooth | [a preencher — Aula 7] | [a preencher] |
| Notificações | [a preencher — Aulas 8-9] | [a preencher] |

## Fluxo de trabalho da equipe

Combinado da squad, definido na Aula 1 e formalizado na Aula 2.

### Branches

A `main` é a linha estável e entregável. Ninguém commita direto nela: toda mudança
entra por Pull Request. Cada integrante trabalha na branch do seu módulo.

| Branch | Responsável | Escopo |
|---|---|---|
| `main` | — | linha estável, protegida |
| `feature/medicos` | Leonardo | módulo de médicos — listagem e CRUD |
| `feature/pacientes` | Felipe | módulo de pacientes — listagem e CRUD |
| `feature/horarios` | Jean | módulo de horários — listagem e CRUD |
| `feature/especialidades` | Gabriel | módulo de especialidades — listagem e CRUD |

Nomes em minúsculas, sem acento e sem espaço, palavras separadas por hífen, com
prefixo indicando o tipo: `feature/`, `fix/`, `docs/`, `refactor/`, `chore/`.

### Commits

Padrão `tipo: descrição curta no imperativo`, sem acento.

Tipos usados: `feat` (nova funcionalidade), `fix` (correção), `docs` (documentação),
`refactor` (melhoria interna), `test` (testes), `chore` (tarefas de apoio).

Um commit corresponde a uma ideia. Se a mensagem precisa de "e", provavelmente são
dois commits.

```
feat: consome GET /medicos na tela de listagem
fix: corrige id do medico na requisicao de exclusao
docs: descreve fluxo de trabalho da squad no README
```

### Pull Requests

1. Atualizar a main: `git switch main && git pull`
2. Criar a branch: `git switch -c feature/<modulo>`
3. Commits pequenos e descritivos
4. Publicar: `git push -u origin feature/<modulo>`
5. Abrir o PR no GitHub, comparando com a `main`, descrevendo o que muda e por quê
6. Ao menos **uma aprovação** de outro integrante antes do merge

Na revisão, o comentário é sobre o código, nunca sobre a pessoa. Quem revisa
confere: o código faz o que o PR diz que faz; os nomes são claros; os commits são
descritivos; não sobrou código comentado ou lixo. O que não ficou claro vira
pergunta no PR.

### Integração

A squad integra com **merge** via Pull Request, nunca com rebase de branch já
publicada. Rebase fica restrito a uso local, antes da branch ser publicada.

Trabalho já integrado à `main` que a squad decida descartar é removido por
`git revert` dentro de um PR, com a justificativa escrita. O histórico registra a
decisão em vez de apagá-la.

## Decisões técnicas

Registro das escolhas da squad e do motivo de cada uma.

**App próprio em vez do `app_clinica` base (Aula 1).** A squad optou por construir a
aplicação do zero, com identidade visual própria e tema claro/escuro, em vez de partir
do app base distribuído. Consequência: os roteiros que referenciam
`src/screens/Medico/Medico.js` e afins são adaptados — onde eles pedem para editar uma
tela existente, aqui a tela é criada.

**`fetch` nativo em vez de axios (Aula 3).** `fetch` já vem no React Native, sem
dependência adicional, e mantém visível o ciclo da requisição HTTP. O custo é ter de
checar `resposta.ok` explicitamente em cada função, porque `fetch` só rejeita a Promise
em falha de rede — 404 e 500 chegam como respostas normais. O axios traria `baseURL`,
parse automático de JSON, timeout e interceptors; os interceptors devem ser
reavaliados na Aula 4, quando entra o token de autenticação.

**Estados separados para carregando, erro e dados (Aula 3).** São dimensões
independentes, não etapas de uma fila: é possível ter dados na tela e um erro de
recarga ao mesmo tempo. Com um estado único, o `finally` que desliga o "carregando"
sobrescreveria o erro que o `catch` acabou de registrar.

**Recarga da lista a partir do servidor após cada escrita (Aula 3).** O servidor é a
fonte da verdade. O registro devolvido não é idêntico ao que foi digitado — o `id` é
gerado pelo servidor, pode haver valor padrão e normalização, e outro usuário pode ter
alterado dados no intervalo. Inserir o registro direto no array local faria a tela
mentir sobre o que está gravado.

**Refação da interface (28/08).** Por decisão da squad, a UI construída nas Aulas 1 e 2
foi refeita sobre um design system próprio, mantendo a paleta da Clyra. A remoção do
trabalho anterior foi acordada entre os três integrantes.

## Testes

<!-- Preencher na Aula 14 -->

```bash
[comando para rodar os testes end-to-end]
```

## Build de produção e publicação

<!-- Preencher na Aula 16 -->

[a preencher: passos de geração do build com EAS Build e submissão às lojas]

## Licença

Projeto acadêmico, sem licença de distribuição definida.
