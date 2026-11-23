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
