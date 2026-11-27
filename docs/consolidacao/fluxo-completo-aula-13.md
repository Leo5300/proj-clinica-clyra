# Fluxo completo do paciente — Aula 13

Roteiro do paciente, do começo ao fim, com as evidências disponíveis para cada passo. A
consolidação reúne testes de SMS no iPhone 17e, resultados da API e testes anteriores.
A execução dos nove passos em sequência ficou sem registro.

| Campo | Valor |
|---|---|
| Data da consolidação | 26/11/2026 |
| Quem testou o SMS no aparelho | Felipe |
| Aparelho e sistema | iPhone 17e, iOS 27, Expo Go |
| Servidores no ar | json-server, API e gateway de SMS |

## Os passos

| # | O que fazer | Aulas | Evidência disponível | Onde |
|---|---|---|---|---|
| 1 | Abrir o app e entrar como paciente (senha; depois fechar e reabrir com biometria) | 4 e 6 | O login do paciente retornou HTTP `200` na suíte de permissões. A reabertura com biometria ficou sem observação. | API |
| 2 | Ver a lista de profissionais e especialidades no agendamento | 3 | O README registra os cadastros de médicos e especialidades. A lista de agendamento aberta pelo paciente ficou sem observação. | Histórico |
| 3 | Abrir Como chegar: mapa, endereço e distância | 5, 6 e 12 | O mapa abriu com o marcador da clínica. Tocar no marcador mostrou nome e endereço, e calcular a distância enquadrou o paciente e a clínica. | iPhone 13, [Aula 12](../../README.md#mapa-da-clínica-aula-12) |
| 4 | Agendar uma consulta | 3 | A suíte confirmou criação de consulta pela recepção com HTTP `201`. A recepção também agendou no iPhone 17e para testar o SMS. O agendamento no perfil paciente ficou sem observação de tela. | API e iPhone 17e |
| 5 | Conferir que o lembrete local foi agendado (Minhas consultas) | 8 | A documentação descreve o lembrete local. A confirmação em Minhas consultas ficou sem observação. | [README da Aula 8](../../README.md#texto-do-lembrete-de-consulta-aula-8) |
| 6 | Cadastrar a foto de perfil | 6 | A foto via câmera consta nas funcionalidades do projeto. A captura neste percurso ficou sem observação. | Histórico |
| 7 | Importar sinais vitais (modo simulado) | 7 | A API registrou sinais vitais no cadastro do próprio paciente e limitou a leitura aos dados dele. A importação simulada na tela ficou sem observação. | API |
| 8 | Cancelar a consulta e conferir o lembrete; depois, como recepção, cancelar outra e avisar por SMS | 8 e 13 | A API confirmou o cancelamento pelo paciente dentro da regra de antecedência. A recepção cancelou e enfileirou o SMS simulado no iPhone 17e. A remoção do lembrete ficou sem observação. | API e iPhone 17e |
| 9 | Fechar o app, reabrir como recepção e conferir a sincronização | 11 | Os testes anteriores registraram no histórico a atualização manual e a atualização ao voltar ao app após mais de 15 minutos. | iPhone 13, [Aula 11](../../README.md#sincronização-em-segundo-plano-aula-11) |

## O que quebrou

A recusa do envio a um destinatário fora da lista do trial era esperada. O ponto observado
para a Aula 14 foi o aviso em inglês.

| # | Onde | O que aconteceu | Passos para reproduzir | Vira teste na Aula 14? |
|---|---|---|---|---|
| 1 | Tela Enviar SMS, pela clínica, com o Twilio | A recusa `572002` apareceu em inglês na tela do iPhone. | Com `npm run gateway:twilio` no ar, enviar pela clínica para a Fernanda Lima com um telefone não verificado no trial. | Sim. Incluir `572002` na tradução dos códigos do Twilio. |
