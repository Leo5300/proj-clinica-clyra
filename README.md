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
deve ocorrer via HTTPS por lidar com dados sensíveis de pacientes) e integra:

- **Recursos nativos do dispositivo:** câmera, Bluetooth, GPS e biometria.
- **Recursos de plataforma:** notificações locais/push, mapas, SMS e processamento em
  segundo plano (background), com uso de multithread para não travar a interface.
- **Web Services de terceiros:** notificação push, gateway de SMS e provedor de mapas.

A Clyra é posicionada como clínica de psicologia e psiquiatria. Essa escolha da squad
orienta a identidade visual (tons de verde e lavanda, linguagem acolhedora) e o cuidado
com o que aparece na tela bloqueada do paciente.

## Estrutura do repositório

```
proj-clinica-clyra/
├── back/              API em Spring Boot (Java) — prevista para depois; não sobe neste momento
├── docs/              wireframes (Figma), logos e decisoes/ (registros de decisão)
├── front/             aplicação mobile em React Native + Expo
├── servidor/          API mock da clínica em Node (auth-api.js), regras e testes de permissão
├── db_clinica.json    dados mock, servidos pelo json-server
└── README.md
```

Organização do `front/`:

```
front/
├── App.js
├── index.js
└── src/
    ├── navigation/    AppNavigator (rotas) e permissoes (quem vê o quê)
    ├── screens/       uma tela por arquivo
    └── services/      api, sessao, lembretes, bluetooth, localizacao, viacep, httpExterno, datas
```

## Perfis de acesso

O app tem três perfis. Cada um entra com o próprio login e vê só o que precisa. Quem
garante o acesso é o servidor: esconder um botão na tela é só experiência de uso.

| Área | Recepção | Médico | Paciente |
|---|---|---|---|
| Agendar | para qualquer paciente | — | só para si |
| Consultas | todas | "Minha agenda" (só as dele) | "Minhas consultas" |
| Remarcar / cancelar | sim | — | até 24 h antes |
| Pacientes | cadastra, edita e exclui | "Meus pacientes", só leitura | edita os próprios dados de contato |
| Médicos e especialidades | cadastra, edita e exclui | — | — |
| Horários | de todos os médicos | só os próprios | — |
| Sinais vitais | — | registra e lê dos seus pacientes | envia os próprios antes da consulta |
| Como chegar (GPS) | — | — | sim |
| Meu perfil e trocar senha | sim | sim | sim |

Como cada perfil é criado:

- **Paciente:** cria a própria conta no app ("Criar conta de paciente"), com aceite do uso
  dos dados conforme a LGPD. Se a recepção já tinha cadastrado o mesmo CPF, a conta é
  vinculada a esse cadastro (a data de nascimento precisa conferir).
- **Médico:** a recepção cadastra (CRM e e-mail obrigatórios). O app mostra uma senha
  temporária uma única vez, e o médico cria a própria senha no primeiro acesso.
- **Recepção:** existe só nos dados iniciais da API. Nenhuma tela cria recepção.

Regras do servidor: 401 = sessão ausente ou expirada (volta ao login); 403 = o perfil não
pode fazer isso (mostra aviso, não desloga); 404 = o registro não existe ou não é seu;
409 = conflito (médico ocupado, horário fora do atendimento). A sessão da equipe dura 8 h
e a do paciente, 30 dias.

O registro completo da decisão está em
[`docs/decisoes/001-perfis-e-autorizacao.md`](docs/decisoes/001-perfis-e-autorizacao.md).

## Funcionalidades

Checklist dos entregáveis previstos na Situação de Aprendizagem Desafiadora do Plano de
Ensino. Marcado conforme cada item é implementado pela squad.

- [x] Protótipo wireframe das interfaces da aplicação (Figma)
- [x] Projeto do aplicativo configurado e versionado no Git
- [x] Cadastro de foto de perfil (paciente e médico) via câmera do dispositivo
- [x] Login com biometria implementado para médico/recepção
- [x] Geolocalização (GPS) com cálculo de distância/tempo até a clínica
- [x] Importação de sinais vitais de um periférico via Bluetooth antes da consulta
      (modo simulado no Expo Go; o modo real exige development build)
- [x] Implementação das interfaces de listagem (leitura) para pacientes, médicos,
      especialidades e horários, consumindo a API RESTful
- [x] Operações de escrita (cadastro/edição/exclusão) para pacientes, médicos,
      especialidades e horários
- [ ] Integração inicial com os endpoints de usuários e login, via HTTPS
      (login com token feito; os mocks rodam em HTTP, ver "Decisões técnicas")
- [x] Identificação dos recursos que dependem de Web Services de terceiros
- [ ] Notificação local/push como lembrete de consulta agendada
      (notificação local pronta; push previsto para a Aula 9)
- [ ] Processamento multithread para tarefas pesadas não travarem a interface
- [ ] Sincronização da agenda em segundo plano (tarefa/serviço background)
- [ ] Mapa exibindo a localização da clínica dentro do aplicativo
- [ ] Confirmação/cancelamento de consulta enviado por SMS
- [x] Funcionalidade de agendamento de consultas (paciente)
- [x] Funcionalidade de listagem das consultas agendadas
- [x] Funcionalidade de cancelamento de consulta
- [x] Funcionalidade de visualização de agenda para o médico
- [ ] Aplicação com testes end-to-end rodando com sucesso
- [ ] Documentação do sistema — guia do usuário e técnica
- [ ] Build de produção gerado e documentação dos passos de publicação nas lojas
- [ ] Versão final do aplicativo pronta para apresentação

## Telas principais

| Tela | Funcionalidade | Perfis | Navega para |
|---|---|---|---|
| Login | Entrada por e-mail e senha. | todos | Home, Criar conta, Trocar senha |
| Login biométrico | Destrava a sessão já salva com a biometria do aparelho. | todos | Home, Login |
| Criar conta | Autocadastro do paciente, com vínculo por CPF. | paciente | Home |
| Trocar senha | Obrigatória no primeiro acesso do médico; voluntária pelo perfil. | todos | Home, Meu perfil |
| Home | Saudação, cartão do dia (próxima consulta, agenda de hoje ou movimento da clínica) e atalhos do perfil. | todos | atalhos do perfil, Meu perfil |
| Meu perfil | Foto, dados de acesso, trocar senha e sair. | todos | Meus dados, Trocar senha, Login |
| Agendar | Escolha de especialidade, médico, dia e horário livre. | recepção, paciente | Consultas |
| Consultas | Lista em Hoje, Próximas e Anteriores. | todos | Detalhe da consulta, Agendar |
| Detalhe da consulta | Dados da consulta, sinais vitais, remarcar e cancelar. | todos | Agendar, Sinais vitais |
| Sinais vitais | Leitura por Bluetooth ou digitação manual, gravada no prontuário. | médico, paciente | Detalhe da consulta |
| Pacientes | Lista de pacientes (médico: só os seus, em modo leitura). | recepção, médico | Cadastro/Edição de paciente |
| Cadastro/Edição de paciente | Cadastro com CEP (ViaCEP) e foto; "Meus dados" para o paciente. | todos | — |
| Médicos | Lista com cadastro, edição e exclusão. | recepção | Cadastro/Edição de médico |
| Cadastro/Edição de médico | Cadastro com foto e criação do acesso ao app. | recepção | Médicos |
| Horários | Horários de atendimento (médico: só os seus). | recepção, médico | Cadastro de horário |
| Especialidades | Lista com cadastro, edição e exclusão. | recepção | Cadastro de especialidade |
| Como chegar | Endereço da clínica e distância em linha reta pelo GPS. | paciente | — |
| Sem acesso | Aparece quando o perfil não pode abrir uma tela. | todos | Home |

## Tecnologias

- [React Native](https://reactnative.dev/) com [Expo](https://expo.dev/) SDK 57
- [React Navigation](https://reactnavigation.org/) — `@react-navigation/native` e
  `@react-navigation/native-stack`
- `@expo/vector-icons` — famílias Feather e MaterialCommunityIcons
- `expo-secure-store` (token e sessão), `expo-image-picker` (câmera),
  `expo-local-authentication` (biometria), `expo-location` (GPS),
  `expo-notifications` e `@react-native-async-storage/async-storage` (lembretes),
  `react-native-ble-plx` e `buffer` (Bluetooth)
- `fetch` nativo para consumo da API (sem axios — decisão registrada em
  "Decisões técnicas")
- API mock em Node puro (`servidor/auth-api.js`) com os dados no `db_clinica.json`,
  servidos pelo `json-server`

## Pré-requisitos

- [Node.js](https://nodejs.org/) 18 ou mais novo
- npm
- [Expo Go](https://expo.dev/go) no celular físico, **ou** emulador Android/iOS
- Git

## Instalação e configuração

```bash
git clone https://github.com/Leo5300/proj-clinica-clyra.git
cd proj-clinica-clyra/front
npm ci
```

### Variáveis de configuração

O app fala com um único servidor: a API da clínica, na porta `3001`. O endereço é
montado em `front/src/services/api.js` a partir de uma variável de ambiente.

1. Copie `front/.env.example` para `front/.env.local`.
2. Descubra o IPv4 da sua máquina na rede atual (`ipconfig` no Windows, `ifconfig`/`ip a`
   no Mac/Linux) e preencha em `EXPO_PUBLIC_API_HOST` dentro de `front/.env.local`.

> Em dispositivo físico (Expo Go), `localhost` não funciona — no aparelho, `localhost` é
> o próprio aparelho. O IP muda quando a rede muda; confira antes de cada sessão de
> trabalho e reinicie o `npx expo start` se trocar.
>
> `front/.env.local` nunca deve ser commitado — cada pessoa da squad tem o próprio IP.

### Subindo os servidores (durante o desenvolvimento)

São dois servidores, em dois terminais, na raiz do repositório:

```bash
npx json-server --watch db_clinica.json --port 3000
```

```bash
node servidor/auth-api.js
```

O `json-server` guarda os dados; só a API (`auth-api.js`) conversa com ele, e o app só
conversa com a API. Assim toda requisição passa pelas regras de cada perfil.

> **Bloqueie a porta 3000 no firewall.** Na versão do json-server usada
> (1.0.0-beta.15), a opção `--host` não tem efeito e ele aceita conexões da rede. Sem o
> bloqueio, um aparelho no mesmo Wi-Fi acessa os dados sem passar pelas regras da API.
> No Windows, em um terminal como administrador:
>
> ```
> netsh advfirewall firewall add rule name="CLYRA json-server 3000" dir=in action=block protocol=TCP localport=3000
> ```

Logins de teste (dados didáticos; as senhas ficam guardadas só como hash):

| Perfil | E-mail | Senha |
|---|---|---|
| Recepção | `recepcao@clinica.com` | `clinica123` |
| Médico | `joao@clinica.com` | `medico123` |
| Paciente | `lucas@exemplo.com` | `paciente123` |

O `json-server` grava no `db_clinica.json`. Depois de testar, pare os servidores e rode
`git restore db_clinica.json` — dado de teste nunca é commitado.

## Como executar

```bash
cd front
npx expo start
```

Escaneie o QR Code com o Expo Go, ou pressione `a` / `i` para abrir em um emulador.

> Se o computador tiver mais de uma placa de rede (VirtualBox, VPN), o Expo pode anunciar
> o IP errado e o app fica carregando para sempre. No Windows, antes do
> `npx expo start`, na mesma janela: `set REACT_NATIVE_PACKAGER_HOSTNAME=<seu IP>`.
>
> O Expo Go exige estar logado com a mesma conta no terminal (`npx expo login`) e no app.
> O app depende do celular (cofre seguro, câmera, biometria, notificações): o alvo web
> não é suportado.

## Permissões necessárias

| Recurso | Quando é solicitado | Comportamento se negado |
|---|---|---|
| Câmera | Ao tocar em "Adicionar foto" nos cadastros ou na foto do "Meu perfil". | O app explica o motivo e o cadastro continua sem foto (a foto é opcional). |
| Biometria | Ao abrir o app com uma sessão já salva. | Cancelar não é erro e o link "Entrar com e-mail e senha" fica sempre visível. Sem biometria cadastrada no aparelho, o paciente entra direto; médico e recepção precisam entrar com e-mail e senha. |
| Localização (GPS) | Ao tocar em "Calcular distância até a clínica" (só em primeiro plano). | O endereço da clínica continua visível. Se a permissão foi negada para sempre, o app oferece abrir os ajustes do aparelho. |
| Bluetooth | Ao procurar aparelhos na tela de sinais vitais (modo real, Android). | O app avisa e o link "Digitar os valores manualmente" continua disponível. |
| Notificações | Quando o paciente agenda uma consulta pela primeira vez. | A consulta é agendada mesmo assim; o app avisa que não haverá lembrete e a lista de consultas mostra o aviso. |

### Texto do lembrete de consulta (Aula 8)

O lembrete chega uma hora antes, no aparelho do paciente, com o título "Lembrete de
consulta" e o texto "Você tem uma consulta às HH:MM.". A notificação não mostra médico,
especialidade nem nome do paciente: a tela bloqueada é pública, e numa clínica de
psicologia e psiquiatria a especialidade já é dado de saúde (LGPD). Quando a recepção
agenda pelo aparelho da clínica, nenhum lembrete é criado ali; o aparelho do paciente
sincroniza os lembretes quando ele abre o app.

## Fluxo de trabalho da equipe

Combinado da squad, definido na Aula 1 e formalizado na Aula 2.

### Branches

A `main` é a linha estável e entregável. Toda mudança entra por Pull Request. Cada
integrante trabalha numa branch por funcionalidade.

| Branch inicial | Responsável | Escopo |
|---|---|---|
| `main` | — | linha estável, protegida |
| `feature/medicos` | Leonardo | módulo de médicos — listagem e CRUD |
| `feature/pacientes` | Felipe | módulo de pacientes — listagem e CRUD |
| `feature/horarios` | Jean | módulo de horários — listagem e CRUD |
| `feature/especialidades` | Gabriel | módulo de especialidades — listagem |

Nomes em minúsculas, sem acento e sem espaço, palavras separadas por hífen, com
prefixo indicando o tipo: `feature/`, `feat/`, `fix/`, `docs/`, `refactor/`, `chore/`.

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
2. Criar a branch: `git switch -c feat/<funcionalidade>`
3. Commits pequenos e descritivos
4. Publicar: `git push -u origin feat/<funcionalidade>`
5. Abrir o PR no GitHub, comparando com a `main`, descrevendo o que muda, por quê e como testar
6. Ao menos **uma aprovação** de outro integrante antes do merge, que é feito com
   "Create a merge commit"

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

Registro das escolhas da squad e do motivo de cada uma. As decisões maiores ficam em
[`docs/decisoes/`](docs/decisoes/).

**App próprio em vez do `app_clinica` base (Aula 1).** A squad optou por construir a
aplicação com identidade visual própria em vez de partir do app base distribuído, que
fica em `front/app_base/` só como referência. Consequência: onde os roteiros pedem para
editar uma tela existente do app base, aqui a tela é criada.

**`fetch` nativo em vez de axios (Aula 3).** `fetch` já vem no React Native, sem
dependência adicional, e mantém visível o ciclo da requisição HTTP. O custo é ter de
checar `resposta.ok` explicitamente, porque `fetch` só rejeita a Promise em falha de
rede — 404 e 500 chegam como respostas normais. Essa checagem fica em um lugar só, o
`src/services/api.js`.

**Estados separados para carregando, erro e dados (Aula 3).** São dimensões
independentes, não etapas de uma fila: é possível ter dados na tela e um erro de
recarga ao mesmo tempo.

**Recarga da lista a partir do servidor após cada escrita (Aula 3).** O servidor é a
fonte da verdade: o `id` vem dele, pode haver normalização, e outro usuário pode ter
alterado os dados no intervalo.

**Refação da interface (28/08).** Por decisão da squad, a UI construída nas Aulas 1 e 2
foi refeita sobre um design próprio, mantendo a paleta da Clyra.

### Autenticação, perfis e HTTP/HTTPS (Aula 4)

O app fala só com a API da clínica (`servidor/auth-api.js`, porta `3001`). Ela confere o
token em toda requisição, aplica as regras de cada perfil e só então lê ou grava os dados
no `json-server` (porta `3000`). As senhas são guardadas como hash (scrypt) e a mensagem
de login não revela se o e-mail existe.

O token é enviado no cabeçalho `Authorization: Bearer <token>` e guardado no
`expo-secure-store` (cofre do sistema), nunca no AsyncStorage. Toda conversa com o cofre
passa por `src/services/sessao.js`.

Os mocks rodam em **HTTP** porque o tráfego fica na rede de desenvolvimento. Na clínica
real, a comunicação deve ocorrer por **HTTPS**: as URLs passam a usar `https://`, com
certificado válido, domínio e renovação do certificado no servidor.

**Serviços de terceiros em arquivo separado (Aula 5).** `src/services/httpExterno.js`
concentra as chamadas a serviços que não são nossos (ViaCEP), com timeout e
`User-Agent`. Ele é separado do `api.js` para o token da clínica nunca ser enviado a um
terceiro.

**Biometria destrava, não autentica (Aula 6).** A digital nunca sai do aparelho: a
biometria só libera o token já guardado no cofre. Em aparelho sem biometria cadastrada,
médico e recepção entram com e-mail e senha.

**Periféricos atrás de services (Aulas 6 a 8).** Nenhuma tela importa as bibliotecas de
GPS, Bluetooth ou notificações: elas ficam em `localizacao.js`, `bluetooth.js` e
`lembretes.js`. Isso permitiu, por exemplo, o modo simulado do Bluetooth no Expo Go
(`MODO_SIMULADO` em `bluetooth.js`).

## Testes

Teste automático das permissões da API (80 casos: login, perfis, dados de cada um,
regras de agendamento, autocadastro e especialidade do médico). Com os dois servidores no ar:

```bash
node servidor/testes-permissoes.js
```

O teste grava dados no `db_clinica.json`: depois, pare os servidores e rode
`git restore db_clinica.json`.

<!-- Testes end-to-end do app: preencher na Aula 14 -->

## Build de produção e publicação

<!-- Preencher na Aula 16 -->

[a preencher: passos de geração do build com EAS Build e submissão às lojas]

## Licença

Projeto acadêmico, sem licença de distribuição definida.
