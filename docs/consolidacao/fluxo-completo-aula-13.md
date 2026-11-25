# Fluxo completo do paciente — Aula 13

Caminho inteiro do paciente, do começo ao fim, num aparelho, **sem consertar nada no meio**.
Cada ponto que quebrou, travou ou fez algo inesperado entra na lista do fim e vira teste na
Aula 14.

| Campo | Valor |
|---|---|
| Data | 24/11/2026 |
| Quem percorreu | Fluxo completo não realizado |
| Aparelho e sistema | Tentativa no navegador do Windows; percurso no Android não concluído |
| Servidores no ar | json-server, API e gateway de SMS |

## Os passos

| # | O que fazer | Aulas | O que aconteceu | Quebrou? |
|---|---|---|---|---|
| 1 | Abrir o app e entrar como paciente (senha; depois fechar e reabrir com biometria) | 4 e 6 | Não testado no percurso do paciente | Não avaliado |
| 2 | Ver a lista de profissionais e especialidades no agendamento | 3 | Não testado no percurso do paciente | Não avaliado |
| 3 | Abrir Como chegar: mapa, endereço e distância | 5, 6 e 12 | Não testado no percurso do paciente | Não avaliado |
| 4 | Agendar uma consulta | 3 | Não testado no percurso do paciente | Não avaliado |
| 5 | Conferir que o lembrete local foi agendado (Minhas consultas) | 8 | Não testado no percurso do paciente | Não avaliado |
| 6 | Cadastrar a foto de perfil | 6 | Não testado no percurso do paciente | Não avaliado |
| 7 | Importar sinais vitais (modo simulado) | 7 | Não testado no percurso do paciente | Não avaliado |
| 8 | Cancelar a consulta e conferir o lembrete; depois, como recepção, cancelar outra e avisar por SMS | 8 e 13 | Não testado no percurso do paciente | Não avaliado |
| 9 | Fechar o app, reabrir como recepção e conferir a sincronização | 11 | Não testado no percurso do paciente | Não avaliado |

## O que quebrou

| # | Onde | O que aconteceu | Passos para reproduzir | Vira teste na Aula 14? |
|---|---|---|---|---|
| 1 (tentativa na web como recepção) | Após contornar a falha ao carregar o mapa nativo no navegador, a tela de login abriu, mas a entrada falhou. A API aceitou as mesmas credenciais no terminal (HTTP 200). | Bloqueou o avanço na web | Windows, Expo web | Aberto; verificar a gravação da sessão com SecureStore na web |
