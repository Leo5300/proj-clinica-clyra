// src/services/sincronizacao.js
//
// Sincronizacao da agenda: busca as consultas, confere os conflitos com a
// mesma verificacao da Aula 10 e guarda o que aconteceu. Nao conhece tela,
// hook, Alert nem navegacao -- quem chama decide o que mostrar. Por isso o
// mesmo codigo serve a tres chamadores: o botao "Atualizar agora", o app
// voltando ao primeiro plano e a tarefa em segundo plano.
//
// Guarda so numeros e datas (quantas consultas, quantos conflitos, quando,
// quem pediu). Nenhum nome e nenhuma consulta: o AsyncStorage nao e cofre.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { buscarConsultas } from './api';
import { detectarConflitosAgrupadoEmFatias } from './conflitos';

const CHAVE_ULTIMA = '@clyra/sincronizacao/ultima';
const CHAVE_HISTORICO = '@clyra/sincronizacao/historico';

// Quem pediu a sincronizacao. Aparece no historico.
export const ORIGENS = ['manual', 'voltou ao app', 'background'];

// Um registro tem sempre esta forma:
// { quando (ISO), origem, ok, consultas, conflitos, duracaoMs, erro }
function registroValido(registro) {
  return (
    registro !== null &&
    typeof registro === 'object' &&
    typeof registro.quando === 'string' &&
    ORIGENS.includes(registro.origem) &&
    typeof registro.ok === 'boolean'
  );
}

// A ultima sincronizacao que DEU CERTO. Uma tentativa que falhou nao apaga
// este valor: a tela continua mostrando o ultimo numero confiavel.
// Armazenamento indisponivel ou valor estranho: vale "nada guardado". Ler
// nunca derruba a tela nem a tarefa.
export async function lerUltima() {
  try {
    const bruto = await AsyncStorage.getItem(CHAVE_ULTIMA);
    const registro = bruto ? JSON.parse(bruto) : null;

    return registroValido(registro) ? registro : null;
  } catch (e) {
    return null;
  }
}

// Todas as tentativas guardadas, da mais recente para a mais antiga.
export async function lerHistorico() {
  try {
    const bruto = await AsyncStorage.getItem(CHAVE_HISTORICO);
    const lista = bruto ? JSON.parse(bruto) : [];

    return Array.isArray(lista) ? lista.filter(registroValido) : [];
  } catch (e) {
    return [];
  }
}

// O historico nao pode crescer para sempre: guarda as 20 mais recentes.
export const LIMITE_DO_HISTORICO = 20;

// Acrescenta o registro no topo do historico. Se foi bem-sucedido, vira
// tambem a "ultima". Sem armazenamento nao ha o que guardar -- a
// sincronizacao em si ja aconteceu, entao o erro de gravar nao sobe.
export async function registrarNoHistorico(registro) {
  const historico = await lerHistorico();
  const novo = [registro, ...historico].slice(0, LIMITE_DO_HISTORICO);

  try {
    await AsyncStorage.setItem(CHAVE_HISTORICO, JSON.stringify(novo));

    if (registro.ok) {
      await AsyncStorage.setItem(CHAVE_ULTIMA, JSON.stringify(registro));
    }
  } catch (e) {
    // Nada a fazer.
  }

  return novo;
}

// Origem fora da lista e erro de quem chamou, nao do servidor: falha alto, em
// vez de gravar um registro que a leitura depois descartaria em silencio.
function conferirOrigem(origem) {
  if (!ORIGENS.includes(origem)) {
    throw new Error(`Origem de sincronizacao desconhecida: ${origem}`);
  }
}

// O trabalho em si: busca e confere. E a mesma conferencia agrupada, em
// fatias, que a tela da Aula 10 usa -- aqui sem barra de progresso, porque
// ninguem esta olhando.
async function conferirAgenda() {
  const consultas = await buscarConsultas();
  const { conflitos } = await detectarConflitosAgrupadoEmFatias(consultas);

  return { consultas: consultas.length, conflitos: conflitos.length };
}

function montarRegistro(origem, inicio, resultado) {
  return {
    quando: new Date().toISOString(),
    origem,
    ok: !resultado.erro,
    consultas: resultado.consultas ?? 0,
    conflitos: resultado.conflitos ?? 0,
    duracaoMs: Date.now() - inicio,
    erro: resultado.erro ?? null,
  };
}

// Sincroniza e devolve { pulada, registro }.
export async function sincronizarAgenda(origem) {
  conferirOrigem(origem);

  const inicio = Date.now();
  const resultado = await conferirAgenda();
  const registro = montarRegistro(origem, inicio, resultado);

  await registrarNoHistorico(registro);

  return { pulada: false, registro };
}
