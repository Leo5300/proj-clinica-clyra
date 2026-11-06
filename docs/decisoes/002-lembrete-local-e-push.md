# Decisão 002 — Lembrete local e avisos por push

| Campo | Valor |
|---|---|
| Número | 002 |
| Título | Lembrete local e avisos por push |
| Equipe | Squad CLYRA |
| Data | 04/11/2026 |
| Responsável | Felipe Augusto da Silva |
| Situação | Aceita |

## 1. Contexto

Desde a Aula 8, o paciente recebe um lembrete uma hora antes de cada consulta.
É uma notificação local: o aparelho agenda e o sistema operacional dispara,
mesmo sem internet e com o app fechado.

O limite é que o aparelho só sabe o que o app sabia na hora de agendar. Se a
recepção cancela ou remarca a consulta por outro aparelho, o lembrete continua
agendado no celular do paciente até ele abrir o app de novo, quando a
sincronização alcança o que mudou no servidor.

A Aula 9 traz o push: quem decide avisar passa a ser o servidor, que é a fonte
da verdade da agenda.

## 2. Opções consideradas

**(A) Só notificação local.** O que existe hoje.

**(B) Só push.** O servidor envia também o lembrete de uma hora antes.

**(C) Os dois, cada um no que faz melhor.** O lembrete de uma hora antes fica
local; as alterações feitas pela clínica chegam por push.

| Critério | (A) Só local | (B) Só push | (C) Local + push |
|---|---|---|---|
| Lembrete chega sem internet | Sim | Não | Sim |
| Avisa de cancelamento ou remarcação feitos pela clínica | Não, só quando o paciente abre o app | Sim | Sim |
| Exige development build e aparelho físico | Não | Sim | Só para a parte de push |
| Exige o servidor rodando na hora do aviso | Não | Sim | Só para a parte de push |
| Custo para a squad | Já pronto | Reescrever o lembrete e montar o envio no servidor | Só o registro do aparelho e o contrato |

## 3. Decisão

Adotamos **(C)**. O lembrete de uma hora antes continua local, porque é o aviso
que mais precisa chegar e não deve depender de internet nem do servidor. O push
fica para o que só o servidor sabe: mudanças na agenda feitas pela clínica.

O app registra o token do aparelho em `POST /dispositivos` a cada abertura e a
cada login. O contrato dos campos que o servidor envia está no README, na seção
"Avisos da clínica por push (Aula 9)".

## 4. Consequências

| O que fica mais fácil | O que fica mais arriscado | Providências | Responsável | Prazo |
|---|---|---|---|---|
| O paciente fica sabendo de um cancelamento sem precisar abrir o app | Push depende de development build: no Expo Go, a squad não consegue testar o recebimento | Testar o recebimento no aparelho disponível em aula; o código trata o Expo Go como indisponível e nunca quebra a tela | Squad | A cada entrega com push |
| O lembrete principal continua funcionando offline | O paciente pode receber o lembrete local de uma consulta que a clínica acabou de cancelar, se ainda não abriu o app | O push de cancelamento chega antes; a sincronização ao abrir o app cancela o lembrete local | Squad | Já implementado |
| O servidor sabe para quais aparelhos avisar cada usuário | Tokens mortos se acumulam se o servidor não ler os recibos | Apagar o token que voltar `DeviceNotRegistered` no recibo | Back-end | Quando o envio pelo servidor for implementado |
| — | Ao sair da conta, o registro do aparelho continua no servidor | Rota de remoção do dispositivo no logout | Back-end | Entrada do Spring |

## 5. Plano B

Se o push não estiver disponível (Expo Go, emulador, permissão negada, falta do
`projectId` ou falha de rede), o app segue inteiro: o lembrete local continua
agendado, e o Perfil do paciente explica que os avisos da clínica estão
indisponíveis e o que se perde sem eles.

## 6. Como saberemos que deu errado

- **O token não chega ao servidor:** depois do login num aparelho com build, a
  coleção `dispositivos` não tem registro com o `usuarioId` do paciente.
- **O aviso não abre a consulta:** o toque abre o app e não navega, sinal de
  que o servidor mandou `data` fora do contrato.
- **O aviso chega mudo:** a notificação aparece só na central, sem som, sinal
  de `channelId` diferente de `lembretes-consulta`.
