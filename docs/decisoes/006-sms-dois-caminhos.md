# Decisão 006 — SMS ao paciente: dois caminhos, e o da clínica passa pela API

| Campo | Valor |
|---|---|
| Número | 006 |
| Título | SMS ao paciente: dois caminhos, e o da clínica passa pela API |
| Equipe | Squad CLYRA |
| Data | 24/11/2026 |
| Responsável | Felipe Augusto da Silva |
| Situação | Aceita |

## 1. Contexto

A Aula 13 pede a confirmação e o cancelamento de consulta por SMS. Existem dois jeitos de um
app mandar SMS, e eles parecem a mesma funcionalidade, mas mudam o remetente, o custo e a
garantia: pelo **aparelho** (o app abre o app de mensagens e a pessoa envia) ou pelo
**servidor** (um gateway, como o Twilio, envia de um número da clínica e cobra por mensagem).

Dois fatos do projeto pesaram: o cancelamento **apaga** a consulta no servidor, e o envio de
push pelo servidor (Aula 9) ainda não existe. Hoje, quando a recepção cancela, o paciente só
fica sabendo quando abre o app.

## 2. Opções consideradas

**(A) Só pelo aparelho** (`expo-sms`).

**(B) Pelo servidor, com o app chamando o gateway direto**, com a chave do gateway dentro do app.

**(C) Pelo servidor, com o app pedindo à API da clínica por consulta**
(`POST /consultas/:id/sms { tipo }`), como no material da aula.

**(D) Pelo servidor, com o app pedindo à API da clínica por paciente**
(`POST /pacientes/:id/sms { tipo, texto }`), mais o caminho do aparelho como alternativa.

| Critério | (A) Aparelho | (B) App → gateway | (C) API, por consulta | (D) API, por paciente + aparelho |
|---|---|---|---|---|
| Chega ao paciente sem o app | Sim | Sim | Sim | Sim |
| Precisa de alguém com o celular na mão | Sim | Não | Não | Não (o caminho do aparelho é opcional) |
| A clínica sabe se o SMS saiu | Não | Sim | Sim | Sim, pelo servidor |
| Chave do gateway fora do app | Não há chave | **Não**: quem abrir o app tem a conta | Sim | Sim |
| Funciona depois de cancelar (consulta apagada) | Sim | Sim | **Não**: a rota não acha a consulta | Sim |
| Custo para a clínica | Nenhum | Por mensagem | Por mensagem | Por mensagem, com confirmação antes |

## 3. Decisão

Adotamos **(D)**. A tela **Enviar SMS** (só da recepção) mostra os dois caminhos lado a lado,
cada um dizendo quem envia e quem paga. O caminho da clínica passa sempre pela API: o app
manda o tipo e o texto, e a API lê o telefone do cadastro, confere as regras (tipo, dado de
saúde, no máximo 2 mensagens, celular válido) e só então chama o gateway, que escuta apenas
no próprio computador. O gateway de desenvolvimento é simulado; o envio real usa o Twilio,
com o mesmo contrato, trocando só o comando que sobe o gateway.

## 4. Consequências

| O que fica mais fácil | O que fica mais arriscado | Providências | Responsável | Prazo |
|---|---|---|---|---|
| A recepção avisa o cancelamento na hora, mesmo para quem não tem o app | A conta da clínica paga cada mensagem | Folha de confirmação com o número de mensagens; teto de 2 mensagens por envio na API | Felipe | Já implementado |
| A chave do gateway nunca sai do servidor | Credencial do Twilio vazar pelo `servidor/.env` | `.env` no `.gitignore`; trocar o Auth Token se ele aparecer em qualquer lugar | Squad | Já implementado |
| O texto pode ser ajustado pela recepção | Alguém escrever dado de saúde no texto | Aviso fixo na tela; termos de saúde bloqueados no app e na API | Felipe | Já implementado |
| O caminho do aparelho não custa nada | O app não sabe se a mensagem saiu | A tela nunca diz "enviado"; só a clínica conta como aviso registrado | Felipe | Já implementado |
| Testar com SMS real sem pagar | A conta de teste do Twilio expira e só aceita modelos prontos | Registrar a validade no README e ter o simulado como plano para a apresentação | Felipe | Antes da Aula 16 |

## 5. Plano B

Se o envio pelo servidor ficar caro ou indisponível, a recepção continua com o caminho do
aparelho, que já está na mesma tela. Se a clínica quiser lembrete automático na véspera, o
envio passa a ser disparado por um agendador **no servidor**, usando a mesma rota interna e
as mesmas regras de texto; o app não muda.

## 6. Como saberemos que deu errado

- **Pacientes relatam SMS que não chegou** e o status ficou em `enfileirada` ou `falhou`: o
  telefone do cadastro ou a conta do gateway precisam de revisão.
- **A conta do gateway cresce** sem o número de consultas crescer: há envio repetido, e o
  teto de mensagens ou o fluxo da tela precisam de ajuste.
- **Algum SMS com dado de saúde** for relatado: a lista de termos bloqueados precisa crescer.
