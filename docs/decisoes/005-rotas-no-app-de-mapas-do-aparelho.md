# Decisão 005 — Rotas: o app não desenha, o app de mapas do aparelho faz

| Campo | Valor |
|---|---|
| Número | 005 |
| Título | Rotas: o app não desenha, o app de mapas do aparelho faz |
| Equipe | Squad CLYRA |
| Data | 23/11/2026 |
| Responsável | Jean Vinicius Rodrigues de Oliveira |
| Situação | Aceita |

## 1. Contexto

A tela **Como chegar** ganhou um mapa com a clínica (Aula 12). O passo seguinte natural
seria desenhar o trajeto da pessoa até lá, dentro do app. Isso é um serviço de terceiros
(como o ViaCEP da Aula 5, mas pago e com chave) e a squad precisava decidir se vale a pena.

## 2. Opções consideradas

**(A) Desenhar a rota no app,** consultando uma API de rotas (por exemplo, a Directions API
do Google) e traçando a linha no mapa.

**(B) Entregar o destino ao app de mapas do aparelho** (`geo:` no Android, `maps:` no iOS)
e deixar que ele trace a rota.

**(C) Só mostrar o mapa e o endereço,** sem nenhum atalho para rota.

| Critério | (A) Rota no app | (B) App de mapas do aparelho | (C) Só mapa e endereço |
|---|---|---|---|
| Custo e chave | API paga, com chave a proteger | Nenhum | Nenhum |
| Trânsito, meio de transporte, navegação por voz | Precisaríamos construir | Já existem | Não há |
| Dado de localização enviado a terceiro | A posição da pessoa vai para a API | Fica no aparelho | Fica no aparelho |
| Esforço da squad | Alto (chave, cota, erro de rede, mapa offline) | Baixo | Nenhum |
| Funciona sem a chave do Google | Não | Sim | Sim |
| Ajuda quem usa leitor de tela | Pouco | Os apps de mapas têm acessibilidade própria | Só o texto |

## 3. Decisão

Adotamos **(B)**. O botão "Abrir no app de mapas" monta o link com o nome e as coordenadas
da clínica e deixa o app que a pessoa já usa e já conhece fazer o resto. O mapa do app
mostra **onde fica** a clínica; **como ir** é com quem sabe. O tempo "cerca de X min" da
tela continua sendo apenas uma estimativa em linha reta, com o aviso escrito.

## 4. Consequências

| O que fica mais fácil | O que fica mais arriscado | Providências | Responsável | Prazo |
|---|---|---|---|---|
| Nenhuma chave de rotas, nenhum custo extra, nenhuma posição da pessoa enviada a terceiros pelo app | O link `maps:` do iOS e o `geo:` do Android foram escritos pela documentação e precisam ser conferidos em aparelho | Testar nos dois sistemas e registrar o resultado no README | Jean | Antes do PR |
| A pessoa usa o app de mapas que já conhece | Aparelho sem app de mapas | O botão cai para o navegador e, se nem isso abrir, a tela avisa | Squad | Já implementado |
| O mapa continua simples (dois marcadores) | O app não mostra o trajeto nem o tempo real | O aviso "linha reta, estimativa" fica sempre na tela | Squad | Já implementado |

## 5. Plano B

Se a clínica quiser mostrar o trajeto dentro do app (por exemplo, para pacientes que se
perdem no último trecho), a rota passa a ser pedida **pelo servidor da clínica**, e não
pelo aparelho: a chave de rotas fica no servidor, a posição da pessoa só é enviada se ela
concordar e o app apenas desenha a linha devolvida. A decisão será revista nesse momento.

## 6. Como saberemos que deu errado

- **Pacientes relatam que o botão não abre nada** em algum aparelho: o link precisa de ajuste
  para aquele sistema.
- **Pacientes pedem o trajeto dentro do app** com frequência: o custo de (A) passa a valer.
- **O endereço ou as coordenadas da clínica mudam** e o botão leva ao lugar errado: as
  coordenadas fixas de `localizacao.js` precisam ser atualizadas (ou virem da API).
