# Decisão 004 — Como manter a agenda atualizada em segundo plano

| Campo | Valor |
|---|---|
| Número | 004 |
| Título | Como manter a agenda atualizada em segundo plano |
| Equipe | Squad CLYRA |
| Data | 22/11/2026 |
| Responsável | Jean Vinicius Rodrigues de Oliveira |
| Situação | Aceita |

## 1. Contexto

A Aula 10 deu à recepção a verificação da agenda inteira, feita sob demanda. A Aula 11
pede que essa agenda se atualize sozinha, sem a pessoa abrir a tela. O Android e o iOS
tratam trabalho em segundo plano de formas muito diferentes e ambos podem simplesmente
não executá-lo. A squad precisava decidir em qual caminho apostar e o que a interface
pode afirmar.

## 2. Opções consideradas

**(A) Só quando o app volta ao primeiro plano (`AppState`).** Sincroniza ao reabrir o app,
respeitando um intervalo mínimo.

**(B) Só tarefa periódica (`expo-background-task`).** O sistema acorda o app de tempos em
tempos.

**(C) Serviço em primeiro plano (Android).** Mantém um serviço vivo com uma notificação
permanente.

**(D) `AppState` como caminho principal e tarefa periódica como opção que a pessoa liga.**

| Critério | (A) AppState | (B) Tarefa | (C) Serviço | (D) AppState + tarefa opcional |
|---|---|---|---|---|
| Funciona no Expo Go | Sim | Não (Android) | Não | Sim (a tarefa fica desativada) |
| Quem decide quando roda | O app | O sistema | O app | App e sistema |
| Execução garantida | Sim, ao voltar ao app | Não | Enquanto o serviço viver | Sim, ao voltar; a tarefa é bônus |
| Custo de bateria | Nenhum fora do uso | O sistema controla | Alto: serviço sempre ativo | O sistema controla |
| Equivalente no iOS | Sim | Parcial (janelas do sistema) | Não existe | Sim |
| Exige notificação permanente | Não | Não | Sim | Não |

## 3. Decisão

Adotamos **(D)**. O `AppState` é o caminho que sempre funciona e que a squad consegue
testar em qualquer aparelho. A tarefa periódica fica atrás de uma chave que a pessoa
liga, aparece **desativada e com o motivo** quando o aparelho não a suporta, e nunca é
descrita como "a cada 15 minutos": o `minimumInterval` é um mínimo pedido ao sistema, não
uma promessa. O serviço em primeiro plano foi descartado: a notificação permanente é um
custo para a pessoa que não se justifica para uma conferência de agenda.

## 4. Consequências

| O que fica mais fácil | O que fica mais arriscado | Providências | Responsável | Prazo |
|---|---|---|---|---|
| O app abre e sincroniza em qualquer ambiente, inclusive Expo Go | A tarefa periódica só pode ser vista rodando em development build | Registrar no README o que foi e o que não foi testado | Jean | Já implementado |
| A tela só afirma o que o app controla | A recepção pode achar que a agenda está sempre fresca | O texto mostra a hora real da última que deu certo, e falhas aparecem no histórico | Jean | Já implementado |
| Descobrir o que aconteceu sem console | O histórico guarda só 20 registros | Aceitável: o histórico serve para diagnóstico, não para auditoria | Squad | — |

## 5. Plano B

Se a tarefa periódica se mostrar pouco confiável no aparelho da clínica (o sistema quase
nunca a executa), deixamos só o `AppState` e, se a recepção precisar da agenda fresca fora
do app, passamos a usar notificação push enviada pelo servidor (Aula 9) quando uma consulta
mudar, em vez de o aparelho perguntar.

## 6. Como saberemos que deu errado

- **O histórico nunca mostra a origem `background`** depois de dias com a chave ligada em
  development build: o sistema não está executando a tarefa.
- **Registros de falha sobem de repente:** o servidor ou a sessão têm problema.
- **A tela mostra "Atualizado há X" com X muito grande** e a pessoa age como se fosse recente.
- **Duas sincronizações simultâneas aparecem no histórico:** a regra de "uma por vez" quebrou.
