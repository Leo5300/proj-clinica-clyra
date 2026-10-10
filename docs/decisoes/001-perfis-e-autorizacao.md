# Decisão 001 — Perfis de acesso e autorização

| Campo | Valor |
|---|---|
| Número | 001 |
| Título | Perfis de acesso e autorização |
| Equipe | Squad CLYRA |
| Data | 10/10/2026 |
| Responsável | Leonardo Marchi Malheiros |
| Situação | Aceita |

## 1. Contexto

O plano da unidade curricular define três atores para o CLYRA:

- **Paciente:** agenda, remarca e acompanha as próprias consultas.
- **Médico:** vê a própria agenda e os pacientes que atende, e registra sinais vitais.
- **Recepção:** opera a clínica (pacientes, médicos, horários, especialidades e todas as consultas).

Até esta decisão, o perfil era só um rótulo devolvido no login. Qualquer token válido fazia tudo: o paciente podia listar todos os pacientes, e o médico podia apagar consultas de outro médico. Além disso, o app falava direto com o json-server, que não valida token nenhum. Bastava conhecer a porta 3000 para ler ou alterar qualquer dado, inclusive dados de saúde.

## 2. Opções consideradas

**(A) API única em Node, mockada.** Regras por perfil no `servidor/auth-api.js`, com o json-server como armazenamento interno.

**(B) Back-end em Spring Boot.** Spring Security, JWT assinado e banco de dados real, a partir do projeto `back/`.

| Critério | (A) API única em Node | (B) Spring Boot + Spring Security + JWT |
|---|---|---|
| Exige | Só Node 18+ (módulos `http` e `crypto`) e o json-server já usado | Java, Maven, Spring Security, banco de dados e configuração de JWT |
| Custo para a squad | Baixo: um arquivo de servidor, um de regras e um de testes | Alto: o back-end ainda não está no ar e não há previsão de subir no curto prazo |
| Limites | Sessões em memória, HTTP, json-server como banco; didático, não é produção | Resolve os limites de (A), mas atrasa a entrega das telas por perfil |

## 3. Decisão

Adotamos **(A) agora**. O app fala só com a API na porta 3001. Ela autentica, confere o perfil, restringe cada perfil aos próprios dados, aplica as regras de agendamento e só então lê ou grava no json-server.

Quando o Spring entrar, migramos para **(B) mantendo o mesmo contrato**:

- `POST /login` devolve `{ token, usuario }`;
- `GET /me` diz quem está logado;
- o perfil fica associado ao token;
- as respostas de erro têm o mesmo significado:
  - **401:** não sei quem é;
  - **403:** sei quem é, mas este perfil não pode;
  - **404:** não existe ou não é seu;
  - **409:** conflito com o estado atual.

Assim, o app não precisa mudar na troca de servidor.

### Resumo de rotas × perfis

Legenda: **R** recepção, **M** médico, **P** paciente. "Só os seus" quer dizer que um registro de outra pessoa responde 404.

| Rota | R | M | P |
|---|---|---|---|
| `GET /pacientes` | todos | só os que têm consulta com ele, sem CPF, e-mail e endereço | não (403) |
| `GET /pacientes/:id` | qualquer | só os seus | só o próprio |
| `POST`/`DELETE /pacientes` | sim | não | não |
| `PUT /pacientes/:id` | sim | não | só o próprio; nome, CPF e nascimento não mudam |
| `GET /medicos` | completo, com `temAcesso` | nome, especialidade, CRM e foto | nome, especialidade, CRM e foto |
| `POST`/`PUT`/`DELETE /medicos`, `POST /medicos/:id/acesso` | sim | não | não |
| `GET /especialidades` | sim | sim | sim |
| `POST`/`PUT`/`DELETE /especialidades` | sim | não | não |
| `GET`/`POST`/`PUT`/`DELETE /horarios` | todos | só os seus (o servidor força o `medicoId`) | não |
| `GET /consultas` | todas | só as suas | só as suas |
| `POST /consultas` | sim | não | sim, só para si |
| `PUT`/`DELETE /consultas/:id` | sim | não | só as suas, com 24 h ou mais de antecedência |
| `GET /disponibilidade` | sim | sim | sim (nunca devolve dado de paciente) |
| `GET`/`POST /sinaisVitais` | não | só de paciente seu | só os próprios |
| `POST /dispositivos` | sim | sim | sim |

Rota fora da tabela responde 404: a API nega por padrão.

## 4. Consequências

| O que fica mais fácil | O que fica mais arriscado | Providências | Responsável | Prazo |
|---|---|---|---|---|
| Uma regra vale para todas as telas: esconder botão no app é só experiência de uso, e a proteção está no servidor | Sessões ficam em memória: reiniciar a API desloga todo mundo | Aceito no mock; no Spring, sessão com JWT assinado e expiração | Leonardo | Entrada do Spring |
| O médico vê só o necessário (princípio da necessidade da LGPD) | O mock fala HTTP: token e dados de saúde trafegam sem criptografia | Usar só em rede local de desenvolvimento; HTTPS obrigatório na API real | Squad | Antes de qualquer uso real |
| O teste automático (`servidor/testes-permissoes.js`) prova as permissões a cada mudança | A senha temporária do médico aparece na tela da recepção, em vez de ir por convite de e-mail | Mostrar uma vez só e obrigar a troca no primeiro acesso; convite por e-mail no back-end real | Leonardo | Entrada do Spring |
| Paciente cria a própria conta e vincula ao cadastro feito pela recepção, pelo CPF e pela data de nascimento | Não existe "esqueci minha senha" | Paciente procura a recepção; a recepção gera nova senha temporária para médicos | Squad | Fora deste escopo |
| O registro de acessos mostra quem tocou em dado sensível, sem expor o conteúdo | Na json-server 1.0.0-beta.15 a opção --host não tem efeito: o servidor escuta em todas as interfaces. A proteção da porta 3000 depende de uma regra no firewall de cada computador que roda os servidores; sem ela, um aparelho na mesma rede alcança os dados sem passar pelas regras da API. | Criar a regra de firewall em cada computador que roda os servidores | Cada integrante | Antes de rodar os servidores |
| — | Limitação conhecida: excluir médico ou paciente apaga o registro, e o json-server anula o vínculo nas consultas passadas. O ideal, fora deste escopo, é desativar em vez de excluir, para preservar o histórico de atendimento. | Registrar como dívida técnica para o back-end real | Squad | Fora deste escopo |

## 5. Plano B

Se a API ou o json-server cair, o app mostra uma mensagem de erro e o botão "Tentar novamente". Ele não guarda dados de saúde no aparelho para "sincronizar depois". No aparelho ficam só o token e um resumo de quem está logado (no cofre do sistema) e os identificadores dos lembretes de consulta. Os lembretes já agendados continuam disparando, porque quem dispara é o sistema operacional. Quando o servidor volta, a sincronização acerta os lembretes com as consultas reais.

## 6. Como saberemos que deu errado

- **O teste de permissões falha:** `node servidor/testes-permissoes.js` termina com código diferente de 0 ou algum caso aparece como `FALHOU`.
- **O registro de acessos mostra acesso indevido:** uma linha `[acesso]` com perfil e rota que a tabela acima não permite e status 200.
- **Um paciente vê dado de outro:** uma consulta, um sinal vital ou um cadastro que não é dele aparece em qualquer tela.
