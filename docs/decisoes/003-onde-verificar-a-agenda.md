# Decisão 003 — Onde verificar os conflitos da agenda

| Campo | Valor |
|---|---|
| Número | 003 |
| Título | Onde verificar os conflitos da agenda |
| Equipe | Squad CLYRA |
| Data | 11/11/2026 |
| Responsável | Gabriel Vinicius Martins |
| Situação | Aceita |

## 1. Contexto

O servidor já impede o conflito na hora de gravar: a API recusa com 409 ("Este
horário acabou de ser ocupado") qualquer consulta que se cruze com outra do mesmo
profissional (`servidor/regras.js`). Mas uma agenda tem história: remarcações,
cadastros antigos e, a partir da Aula 11, sincronização em segundo plano.

A Aula 10 pede uma conferência da agenda inteira que não congele o app, e que a
squad decida onde ela deve rodar: no servidor ou no aparelho.

## 2. Opções consideradas

**(A) Só no servidor.** Uma rota nova, `GET /agenda/conflitos`, devolve os pares; o
app só mostra.

**(B) Só no aparelho.** O app baixa as consultas e confere tudo, em fatias.

**(C) Servidor segue como regra de verdade na gravação; o aparelho confere em lote.**
O 409 continua barrando conflito novo; a conferência no aparelho é auditoria da agenda
inteira e ensaio da sincronização em segundo plano da Aula 11.

| Critério | (A) Só servidor | (B) Só aparelho | (C) Servidor + aparelho |
|---|---|---|---|
| Quem calcula | Servidor | Aparelho | Aparelho (servidor barra na gravação) |
| Regra de conflito em um lugar só | Sim | Sim, mas sem o 409 do servidor | Não: existe nos dois, de propósito |
| Dados que viajam para o aparelho | Só o resultado | Todas as consultas do perfil | Todas as consultas do perfil |
| Peso no aparelho e na bateria | Nenhum | Cálculo no celular | Cálculo no celular, em fatias |
| Serve de base para a Aula 11 | Não | Sim | Sim |
| Custo para a squad hoje | Rota nova e testes no servidor | Só o app | Só o app |

## 3. Decisão

Adotamos **(C)**. A integridade continua garantida pelo servidor, que recusa o
conflito na gravação. A conferência no aparelho é uma auditoria da agenda inteira,
feita só pela recepção (único perfil que já vê todas as consultas) e em fatias, para a
interface continuar respondendo. Duplicamos a regra de conflito de propósito, com a
mesma duração (`DURACAO_CONSULTA_MIN`) em `regras.js` e em `datas.js`, e a resposta
certa vem da própria `conflitam` do servidor: o script `gerar-consultas.js` imprime o
total esperado e o app precisa igualá-lo.

## 4. Consequências

| O que fica mais fácil | O que fica mais arriscado | Providências | Responsável | Prazo |
|---|---|---|---|---|
| Conferir a agenda inteira sem rota nova no servidor | A regra de conflito existe em dois lugares e pode divergir | Rodar o script de volume e comparar o total esperado com o do app a cada mudança em `regras.js` | Squad | A cada mudança na regra |
| A interface continua respondendo e a conferência pode ser cancelada | A recepção passa a ter todas as consultas na memória do aparelho | Só a recepção abre a tela; nada é gravado no aparelho | Squad | Já implementado |
| Base pronta para a sincronização em segundo plano da Aula 11 | Uma agenda muito grande ainda pesa em aparelho fraco | Medir antes de crescer; se o download ou o cálculo pesarem, adotar o Plano B | Squad | Quando a agenda chegar a dezenas de milhares de consultas |

## 5. Plano B

Se a conferência no aparelho deixar de servir (agenda enorme, aparelho fraco ou
regra divergindo do servidor), a rota `GET /agenda/conflitos` assume o cálculo usando
a `conflitam` de `regras.js`, e o app passa a só exibir o resultado. O fatiamento e o
cancelamento continuam úteis para qualquer trabalho pesado que sobre no aparelho.

## 6. Como saberemos que deu errado

- **O total do app não bate com o do script:** o modo "Conferir" mostra "PARES
  DIFERENTES", ou a contagem da tela difere do "Conflitos esperados" do script.
- **A interface trava na verificação:** a barra pula de 0% para 100% ou os toques não
  respondem enquanto ela roda.
- **O trabalho continua depois de cancelar ou sair da tela:** o log
  `[processamento] laco parou na posicao...` não aparece.
- **A verificação agrupada deixa de ser rápida** com o volume real da clínica.
