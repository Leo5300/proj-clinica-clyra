<!--
TEMPLATE — cada squad deve copiar este arquivo para a RAIZ do próprio
repositório do projeto (o app da clínica) e ir preenchendo os campos entre
colchetes [ ] ao longo do semestre, conforme cada funcionalidade é
implementada. Não deixe nenhum "[a preencher]" na versão final (Aula 16).

-->

# [CLYRA] — Sistema de Agendamento para Clínica Médica

> Projeto integrador da Unidade Curricular **Aplicações Mobile**, construído ao longo de 16 aulas.

**Squad:** [Felipe Augusto da Silva, Jean Vinicius Rodrigues de Oliveira, Leonardo Marchi Malheiros]
**Curso:** Superior de Tecnologia em Análise e Desenvolvimento de Sistemas — Turma STADS
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

## Funcionalidades

Checklist dos entregáveis previstos na Situação de Aprendizagem Desafiadora do Plano de
Ensino. Marque conforme cada item for implementado pela squad — cada aula do curso avança
alguns destes itens.

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
- [ ] Build de produção gerado e documentação dos passos de publicação nas lojas (App
      Store/Google Play)
- [ ] Versão final do aplicativo pronta para apresentação 

## Telas principais

<!-- Documentem cada tela conforme forem construindo, descrevendo função e navegação. -->

| Tela | Funcionalidade | Navega para |
|---|---|---|
| Splash | [a preencher] | Menu |
| Menu | [a preencher] | Médicos, Pacientes, Consultas |
| Médicos (listagem) | [a preencher] | Cadastro/Edição de Médico |
| Cadastro/Edição de Médico | [a preencher] | — |
| [adicionar novas telas conforme implementadas] | | |

## Tecnologias

- [React Native](https://reactnative.dev/) com [Expo](https://expo.dev/)
- React Navigation (`@react-navigation/native`, `@react-navigation/stack`)
- [a preencher: bibliotecas adicionadas a cada aula — expo-camera/expo-image-picker,
  expo-local-authentication, expo-location, expo-notifications, expo-task-manager,
  react-native-maps, etc.]
- API RESTful da clínica (mock local via `json-server` durante o desenvolvimento)

## Pré-requisitos

- [Node.js](https://nodejs.org/) (versão LTS recomendada)
- npm
- [Expo Go](https://expo.dev/go) instalado no celular físico, **ou** um emulador
  Android/iOS configurado
- Git

## Instalação e configuração

```bash
git clone [url-do-repositorio-da-squad]
cd [nome-da-pasta-do-projeto]
npm install
```

### Variáveis de configuração

O endereço da API é definido em `[caminho do arquivo, ex.: src/services/api.js]`:

```js
const BASE_URL = "[http://SEU_IP_AQUI:3000]";
```

> Em dispositivo físico (Expo Go), `localhost` não funciona — use o IP da máquina que
> está rodando a API/mock, na mesma rede Wi-Fi.

### Subindo a API mock (durante o desenvolvimento)

```bash
npx json-server --watch db_clinica.json --port 3000
```

## Como executar

```bash
npx expo start
```

Escaneie o QR Code com o app Expo Go, ou pressione `a`/`i` no terminal para abrir em um
emulador Android/iOS.

## Permissões necessárias

O aplicativo solicita acesso aos seguintes recursos do dispositivo. Documentem, para cada
um, quando a permissão é pedida e o que acontece se o usuário negar:

| Recurso | Quando é solicitado | Comportamento se negado |
|---|---|---|
| Câmera | [a preencher — Aula 1] | [a preencher] |
| Biometria | [a preencher — Aula 6] | [a preencher] |
| Localização (GPS) | [a preencher — Aula 6] | [a preencher] |
| Bluetooth | [a preencher — Aula 7] | [a preencher] |
| Notificações | [a preencher — Aulas 8-9] | [a preencher] |

## Testes

<!-- Preencher na Aula 14 -->

```bash
[comando para rodar os testes end-to-end]
```

## Build de produção e publicação

<!-- Preencher na Aula 16 -->

[a preencher: passos de geração do build com EAS Build e submissão às lojas]

## Equipe e colaboração

Consulte o combinado de colaboração da squad definido na Aula 1 (branches, padrão de
commit, revisão em pares) para saber como contribuir com este repositório.

## Licença

[a definir pela squad, se aplicável]
