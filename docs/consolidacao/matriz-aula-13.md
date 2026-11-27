# Matriz de consolidação dos recursos — Aula 13

Retrato do projeto a três aulas da entrega, preenchido em squad com o app aberto ao lado.
Ele não vale por estar todo verde, e sim por estar correto: "parcial" é uma resposta útil.

As decisões da squad e as evidências foram consolidadas em 26/11/2026. A suíte de permissões
passou em 92 de 92 casos. As observações indicam quais resultados vêm do histórico, da API ou
dos testes de SMS no iPhone 17e.

| Campo | Valor |
|---|---|
| Squad | CLYRA (Felipe, Jean, Leonardo, Gabriel) |
| Data | 24/11/2026 |
| Integrantes presentes | Felipe e Leonardo (respondendo pela squad) |
| Aparelho do teste | iPhone 17e, iOS 27, Expo Go |

## 1. Estado de cada recurso

Estado: **F** = funcionando, **P** = parcial, **N** = não feito.

| Aula | Recurso | Estado | Quem responde | Exige | Observação |
|---|---|---|---|---|---|
| 3 | CRUD de médicos, pacientes, especialidades e horários | F — indicado no histórico | Leonardo (médicos), Felipe (pacientes), Jean (horários), Gabriel (especialidades) | servidor no ar | Nos testes de SMS, a recepção conseguiu agendar e cancelar pelo iPhone 17e. |
| 4 | Login com token no cofre; requisições autenticadas | F — indicado no histórico | Leonardo | servidor no ar | Login da recepção e chamadas autenticadas confirmados durante os testes de SMS no iPhone 17e. A API de desenvolvimento roda em HTTP, com HTTPS previsto para a clínica real. |
| 5 | Serviço externo (CEP) | F — indicado no histórico | Felipe | internet (ViaCEP) | O README registra o preenchimento de endereço via ViaCEP no cadastro de pacientes. |
| 6 | Foto de perfil via câmera | F — indicado no histórico | Jean (médico), Leonardo (paciente) | aparelho físico | As telas chamam o `expo-image-picker` direto, sem service |
| 6 | Login com biometria | F — indicado no histórico | Jean | aparelho físico com biometria cadastrada | A tela chama o `expo-local-authentication` direto, sem service |
| 6 | GPS e distância até a clínica | F — indicado no histórico | Jean | aparelho físico | O [teste da Aula 12](../../README.md#mapa-da-clínica-aula-12) no iPhone 13 registrou o marcador da pessoa e o enquadramento dos dois pontos ao calcular a distância. |
| 7 | Sinais vitais via Bluetooth | P — indicado no histórico | Gabriel | modo simulado no Expo Go; o real exige development build | A suíte confirmou gravação e leitura dos sinais vitais pela API, com as permissões de cada perfil. |
| 8 | Lembrete local de consulta | F — indicado no histórico | Felipe | aparelho físico e permissão de notificações | O [README da Aula 8](../../README.md#texto-do-lembrete-de-consulta-aula-8) descreve o lembrete local. |
| 9 | Push de lembrete (token registrado na API) | P — indicado no histórico | Felipe | development build e aparelho físico | A suíte confirmou o registro do aparelho pela API sem duplicatas. O envio pelo servidor ainda não existe. |
| 10 | Verificação de conflitos sem travar a interface | F — indicado no histórico | Gabriel | servidor no ar | Nas [medições da Aula 10](../../README.md#medições), o Android encontrou 349 pares em conflito em 5.000 consultas e exibiu a barra de progresso no modo fatiado. |
| 11 | Sincronização em segundo plano | P — indicado no histórico | Jean | servidor no ar; a tarefa periódica exige development build | O [teste da Aula 11](../../README.md#sincronização-em-segundo-plano-aula-11) confirmou a atualização manual e ao voltar ao app no iPhone 13. A execução periódica exige um development build. |
| 12 | Mapa da clínica | P — indicado no histórico | Jean | Expo Go sem chave; build Android com a chave do Google | O [teste da Aula 12](../../README.md#mapa-da-clínica-aula-12) confirmou mapa e marcador no iPhone 13 com Expo Go. A chave do build Android está sem restrição e sem alerta de orçamento. |
| 13 | SMS de confirmação e cancelamento | F | Felipe | servidor e gateway no ar; Twilio: conta de teste e número verificado; aparelho com chip para o caminho do celular | Os testes de tela no iPhone 17e confirmaram fila, entrega simulada e cancelamento. O Twilio entregou ao celular verificado e recusou o destinatário fora da lista com o código `572002`, exibido em inglês. |

## 2. Os três canais de aviso

| Situação | Local | Push | SMS | Por quê |
|---|---|---|---|---|
| Lembrete da véspera (uma hora antes) | Sim | Não | Não | Grátis, chega sem internet e já existe (Aula 8) |
| Consulta cancelada pela clínica | Cancela quando o paciente abre o app | Não (o envio pelo servidor não existe) | Sim | O SMS é o único canal que chega na hora, com ou sem app |
| Consulta remarcada | Reagenda quando o paciente abre o app | Não | Opcional | Se a recepção remarcou, o paciente precisa saber antes de abrir o app |
| Confirmação do agendamento | Não | Não | Opcional, só quando a recepção agenda | Quem agendou pelo app já viu a confirmação na tela |
| Paciente sem o app instalado | Não chega | Não chega | Sim | É o único canal que chega |

Decisão da squad sobre esta tabela: confirmada em 26/11/2026.

## 3. Costuras entre recursos

| Teste | O que deveria acontecer | Evidência disponível |
|---|---|---|
| Negar a permissão de localização e abrir a tela de agendamento | O agendamento funciona sem usar localização. | Na Aula 12, mapa e endereço continuaram visíveis no iPhone 13 com localização negada. O agendamento com essa permissão negada ficou sem observação. |
| Negar a permissão de notificações e agendar uma consulta | A consulta é agendada e o app avisa que não haverá lembrete. | O [README](../../README.md#permissões-necessárias) descreve o aviso esperado. O agendamento com notificações negadas ficou sem observação. |
| Cancelar uma consulta que já tinha lembrete agendado | O lembrete do aparelho que cancelou some na hora e o do paciente some quando ele abrir o app. | O cancelamento foi confirmado pela suíte de API e pela recepção no iPhone 17e. A remoção do lembrete ficou sem observação. |
| Remarcar uma consulta que já tinha lembrete agendado | Fica um lembrete só, no novo horário. | A quantidade de lembretes após remarcar ficou sem observação. |
| Usar o app sem internet | As telas mostram erro com "tentar de novo". Como chegar mantém endereço e telefone. | Na Aula 12, endereço, telefone e botões permaneceram visíveis em Como chegar no iPhone 13 sem internet. A navegação por três telas ficou sem observação. |
| Derrubar a API no meio de um cadastro | O app mostra erro e preserva o que foi digitado. | A preservação dos campos durante a queda da API ficou sem observação. |
| Fechar o app durante a sincronização | Ao voltar, o histórico mostra a última tentativa que terminou. | Na Aula 11, voltar ao app após 15 minutos gerou uma entrada no histórico. O fechamento durante uma sincronização ficou sem observação. |
| Entrar com biometria sem nunca ter feito login com senha | Sem sessão salva, o app pede e-mail e senha. | O [README](../../README.md#permissões-necessárias) descreve a biometria para sessões salvas. O início sem sessão ficou sem observação no aparelho. |

## 4. Dependências que podem quebrar na apresentação (Aula 16)

| Dependência | Necessária para | Quem garante na Aula 16 |
|---|---|---|
| Notebook com json-server, API e gateway de SMS no ar | O app inteiro | Leonardo |
| IP certo em `front/.env.local` e celular na mesma rede Wi-Fi | O celular falar com a API | Leonardo |
| Conta do Expo logada no terminal e no Expo Go | Abrir o app | Leonardo |
| Conta de teste do Twilio válida, `servidor/.env` e número verificado | SMS real (expira em 30 dias; se expirar, usar o simulado) | Felipe; o celular do Leonardo precisa estar verificado na conta |
| Celular com chip | SMS pelo celular | Leonardo |
| Celular com biometria cadastrada | Login com biometria | Leonardo |
| Development build | Push, Bluetooth real e tarefa periódica (hoje não existe) | Squad, se der tempo (seção 5) |

## 5. Plano para as três últimas aulas

| O que concluir | Quem | Até quando | Se não der, o plano é |
|---|---|---|---|
| Testes automatizados dos fluxos críticos e dos cenários de falha | Squad | Aula 14 | Registrar no plano de testes o que ficou sem teste |
| Tirar câmera e biometria de dentro das telas (services) | Gabriel | Aula 14 | Registrar como dívida de arquitetura no relatório de bugs |
| Restringir a chave do Google e criar o alerta de orçamento | Jean | Antes da Aula 15 | Build Android sem mapa, com a pendência no README |
| README técnico, manual de uso e build de produção | Squad | Aula 15 | Documentar o que faltou e por quê |
| Atualizar o checklist "Funcionalidades" do README | Squad | Aula 15 | — |
| Ensaiar a apresentação com a tabela de dependências acima | Squad | Aula 16 | — |
| Envio de push pelo servidor | Squad | Se der tempo, até a Aula 15 | Fica registrado como não feito na documentação da Aula 15 |
| SMS automático na véspera (agendador no servidor) | Squad | Se der tempo, até a Aula 15 | Fica registrado como não feito; o lembrete local cobre a véspera |
| Resposta do paciente por SMS ("SIM para confirmar") | Squad | Se der tempo, até a Aula 15 | Fica registrado como não feito; os modelos não pedem resposta |
| Development build (Bluetooth real, tarefa periódica e push) | Squad | Se der tempo, até a Aula 15 | Apresentar no Expo Go, com o modo simulado do Bluetooth |
| Rota desenhada dentro do app | Squad | Se der tempo, até a Aula 15 | Mantém a decisão 005: abrir o app de mapas do aparelho |

## 6. O que a squad decide NÃO fazer

| O que fica de fora | Por quê |
|---|---|
| Conta paga do Twilio e qualquer outro serviço pago | A squad não vai pagar por serviços; a conta de teste do Twilio prova a integração |

Decisão da squad sobre esta lista: confirmada em 26/11/2026. Só fica de fora o que é pago; o resto
entrou no plano da seção 5, para fazer o máximo que der até a Aula 15.
