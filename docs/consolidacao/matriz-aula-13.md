# Matriz de consolidação dos recursos — Aula 13

Retrato do projeto a três aulas da entrega, preenchido em squad com o app aberto ao lado.
Ele não vale por estar todo verde, e sim por estar correto: "parcial" é uma resposta útil.

Como ler: `A CONFIRMAR` é o que o histórico do Git e o README indicam, e só vira verdade
depois de testado no aparelho; `PREENCHER` é o que só quem testou pode escrever.

| Campo | Valor |
|---|---|
| Squad | CLYRA (Felipe, Jean, Leonardo, Gabriel) |
| Data | 24/11/2026 |
| Integrantes presentes | PREENCHER |
| Aparelho do teste | PREENCHER |

## 1. Estado de cada recurso

Estado: **F** = funcionando, **P** = parcial, **N** = não feito.

| Aula | Recurso | Estado | Quem responde | Exige | Observação |
|---|---|---|---|---|---|
| 3 | CRUD de médicos, pacientes, especialidades e horários | F — A CONFIRMAR | Leonardo (médicos), Felipe (pacientes), Jean (horários), Gabriel (especialidades) | servidor no ar | — |
| 4 | Login com token no cofre; requisições autenticadas | F — A CONFIRMAR | Leonardo | servidor no ar | A API de desenvolvimento roda em HTTP; HTTPS fica para a clínica real (README, Aula 4) |
| 5 | Serviço externo (CEP) | F — A CONFIRMAR | Felipe | internet (ViaCEP) | — |
| 6 | Foto de perfil via câmera | F — A CONFIRMAR | Jean (médico), Leonardo (paciente) | aparelho físico | As telas chamam o `expo-image-picker` direto, sem service |
| 6 | Login com biometria | F — A CONFIRMAR | Jean | aparelho físico com biometria cadastrada | A tela chama o `expo-local-authentication` direto, sem service |
| 6 | GPS e distância até a clínica | F — A CONFIRMAR | Jean | aparelho físico | — |
| 7 | Sinais vitais via Bluetooth | P — A CONFIRMAR | Gabriel | modo simulado no Expo Go; o real exige development build | — |
| 8 | Lembrete local de consulta | F — A CONFIRMAR | Felipe | aparelho físico e permissão de notificações | — |
| 9 | Push de lembrete (token registrado na API) | P — A CONFIRMAR | Felipe | development build e aparelho físico | O token é registrado; o envio pelo servidor ainda não existe |
| 10 | Verificação de conflitos sem travar a interface | F — A CONFIRMAR | Gabriel | servidor no ar | — |
| 11 | Sincronização em segundo plano | P — A CONFIRMAR | Jean | servidor no ar; a tarefa periódica exige development build | Manual e "voltou ao app" testados no iPhone; tarefa periódica não observada |
| 12 | Mapa da clínica | P — A CONFIRMAR | Jean | Expo Go sem chave; build Android com a chave do Google | Chave sem restrição e sem alerta de orçamento (README) |
| 13 | SMS de confirmação e cancelamento | F — A CONFIRMAR | Felipe | servidor e gateway no ar; Twilio: conta de teste e número verificado; aparelho com chip para o caminho do celular | — |

## 2. Os três canais de aviso

| Situação | Local | Push | SMS | Por quê |
|---|---|---|---|---|
| Lembrete da véspera (uma hora antes) | Sim | Não | Não | Grátis, chega sem internet e já existe (Aula 8) |
| Consulta cancelada pela clínica | Cancela quando o paciente abre o app | Não (o envio pelo servidor não existe) | Sim | O SMS é o único canal que chega na hora, com ou sem app |
| Consulta remarcada | Reagenda quando o paciente abre o app | Não | Opcional | Se a recepção remarcou, o paciente precisa saber antes de abrir o app |
| Confirmação do agendamento | Não | Não | Opcional, só quando a recepção agenda | Quem agendou pelo app já viu a confirmação na tela |
| Paciente sem o app instalado | Não chega | Não chega | Sim | É o único canal que chega |

Decisão da squad sobre esta tabela: A CONFIRMAR

## 3. Costuras entre recursos

| Teste | O que deveria acontecer | O que aconteceu |
|---|---|---|
| Negar a permissão de localização e abrir a tela de agendamento | O agendamento não usa localização: funciona normalmente | PREENCHER |
| Negar a permissão de notificações e agendar uma consulta | A consulta é agendada; o app avisa que não haverá lembrete | PREENCHER |
| Cancelar uma consulta que já tinha lembrete agendado | O lembrete do aparelho que cancelou some na hora; o do paciente some quando ele abrir o app | PREENCHER |
| Remarcar uma consulta que já tinha lembrete agendado | Fica um lembrete só, no novo horário | PREENCHER |
| Usar o app sem internet | As telas mostram erro com "tentar de novo"; Como chegar mantém endereço e telefone | PREENCHER |
| Derrubar a API no meio de um cadastro | O app mostra erro e não perde o que foi digitado | PREENCHER |
| Fechar o app durante a sincronização | Nada quebra; ao voltar, o histórico mostra a última tentativa que terminou | PREENCHER |
| Entrar com biometria sem nunca ter feito login com senha | A tela de biometria não aparece: sem sessão salva, o app pede e-mail e senha | PREENCHER |

## 4. Dependências que podem quebrar na apresentação (Aula 16)

| Dependência | Necessária para | Quem garante na Aula 16 |
|---|---|---|
| Notebook com json-server, API e gateway de SMS no ar | O app inteiro | A CONFIRMAR |
| IP certo em `front/.env.local` e celular na mesma rede Wi-Fi | O celular falar com a API | A CONFIRMAR |
| Conta do Expo logada no terminal e no Expo Go | Abrir o app | A CONFIRMAR |
| Conta de teste do Twilio válida, `servidor/.env` e número verificado | SMS real (expira em 30 dias; se expirar, usar o simulado) | Felipe — A CONFIRMAR |
| Celular com chip | SMS pelo celular | A CONFIRMAR |
| Celular com biometria cadastrada | Login com biometria | A CONFIRMAR |
| Development build | Push, Bluetooth real e tarefa periódica (hoje não existe) | A CONFIRMAR |

## 5. Plano para as três últimas aulas

| O que concluir | Quem | Até quando | Se não der, o plano é |
|---|---|---|---|
| Testes automatizados dos fluxos críticos e dos cenários de falha | Squad | Aula 14 | Registrar no plano de testes o que ficou sem teste |
| Tirar câmera e biometria de dentro das telas (services) | A CONFIRMAR | Aula 14 | Registrar como dívida de arquitetura no relatório de bugs |
| Restringir a chave do Google e criar o alerta de orçamento | Jean | Antes da Aula 15 | Build Android sem mapa, com a pendência no README |
| README técnico, manual de uso e build de produção | Squad | Aula 15 | Documentar o que faltou e por quê |
| Atualizar o checklist "Funcionalidades" do README | A CONFIRMAR | Aula 15 | — |
| Ensaiar a apresentação com a tabela de dependências acima | Squad | Aula 16 | — |

## 6. O que a squad decide NÃO fazer

| O que fica de fora | Por quê |
|---|---|
| Envio de push pelo servidor | Exige um serviço de envio e development build; o SMS cobre o cancelamento |
| SMS automático na véspera | Exige um agendador no servidor; o lembrete local já cobre a véspera |
| Resposta do paciente por SMS ("SIM para confirmar") | Exige receber SMS, outro serviço e outro custo |
| Conta paga do Twilio | Custo; a conta de teste prova a integração |
| Rota desenhada dentro do app | Decisão 005: o app de mapas do aparelho faz melhor |
| Bluetooth real e tarefa periódica na apresentação | Exigem development build, que a squad não vai gerar a tempo |

Decisão da squad sobre esta lista: A CONFIRMAR
