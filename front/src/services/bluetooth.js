// src/services/bluetooth.js
//
// Unico ponto do app que conversa com Bluetooth. Nenhuma tela importa a
// biblioteca de BLE, nem conhece UUID ou base64: as telas falam a
// linguagem do dominio -- procurar, conectar, receber a frequencia.
// Mesmo padrao de api.js (rede), sessao.js (cofre) e localizacao.js
// (GPS): o periferico fica atras de um service.
//
// Duas implementacoes atras da MESMA interface:
//   procurar(aoEncontrar, aoErro)   pararBusca()   conectar(id)
//   monitorarFrequencia(aoReceber)  desconectar()
//
// A simulada roda no Expo Go. A real exige development build
// (npx expo run:android ou EAS Build): a biblioteca tem codigo nativo
// que o Expo Go nao traz.

import { Platform, PermissionsAndroid } from 'react-native';
import { Buffer } from 'buffer';

// UNICO ponto do codigo que decide qual implementacao o app usa.
// true  -> Expo Go, com periferico falso.
// false -> Bluetooth de verdade (development build + monitor por perto).
export const MODO_SIMULADO = true;

// So vale no modo simulado. Serve para provocar as falhas do Passo 4
// sem mexer na logica. Valores: 'normal' | 'sem-aparelhos' |
// 'falha-conexao' | 'conexao-perdida'. Deve estar 'normal' no commit.
const CENARIO_SIMULADO = 'normal';

// UUIDs padronizados pelo Bluetooth SIG: qualquer monitor cardiaco que
// siga o padrao anuncia estes mesmos numeros, no mundo inteiro.
const SERVICO_FREQ_CARDIACA = '0000180d-0000-1000-8000-00805f9b34fb';
const CARACTERISTICA_MEDICAO = '00002a37-0000-1000-8000-00805f9b34fb';

// Erro proprio: a tela precisa distinguir "o usuario negou" de "o
// Bluetooth falhou", porque a orientacao ao usuario e diferente.
export class PermissaoBluetoothNegada extends Error {
  constructor() {
    super('Permissão de Bluetooth negada.');
    this.name = 'PermissaoBluetoothNegada';
  }
}

// Funcao PURA: recebe o valor como o aparelho manda e devolve o bpm.
// Nao depende de hardware, de tela nem de biblioteca nativa -- e a unica
// parte da aula que da para testar sem monitor nenhum (adianta a Aula 14).
//
// Formato do padrao Heart Rate Measurement (0x2A37): o bit 0 do primeiro
// byte diz se o valor vem em 8 ou em 16 bits.
export function decodificarFrequencia(valorBase64) {
  if (!valorBase64) return null;

  const bytes = Buffer.from(valorBase64, 'base64');
  if (bytes.length < 2) return null;

  const formato16bits = (bytes[0] & 0x01) === 1;

  if (formato16bits) {
    if (bytes.length < 3) return null;
    return bytes.readUInt16LE(1);
  }

  return bytes[1];
}

// Android 12 (API 31) trocou as permissoes de Bluetooth. Antes disso,
// escanear exigia LOCALIZACAO -- confunde, mas tem logica: quem enxerga
// os aparelhos ao redor consegue deduzir onde voce esta.
export async function pedirPermissoes() {
  if (Platform.OS !== 'android') return true;

  const permissoes =
    Platform.Version >= 31
      ? [
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        ]
      : [PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION];

  const resultado = await PermissionsAndroid.requestMultiple(permissoes);

  return Object.values(resultado).every(
    (status) => status === PermissionsAndroid.RESULTS.GRANTED,
  );
}

function esperar(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// =====================================================================
// IMPLEMENTACAO SIMULADA
// =====================================================================
// Os atrasos estao aqui DE PROPOSITO: sem eles a tela fica "boa demais"
// e ninguem percebe a falta dos indicadores de carregando.
function criarServicoBleSimulado() {
  const timers = [];
  let intervalo = null;

  return {
    async procurar(aoEncontrar) {
      if (CENARIO_SIMULADO === 'sem-aparelhos') return;

      timers.push(
        setTimeout(
          () => aoEncontrar({ id: 'SIM-01', nome: 'Monitor cardíaco (simulado)' }),
          700,
        ),
      );

      // O mesmo aparelho anunciado de novo, como acontece de verdade
      // varias vezes por segundo. Serve para provar que a tela nao
      // repete o item na lista.
      timers.push(
        setTimeout(
          () => aoEncontrar({ id: 'SIM-01', nome: 'Monitor cardíaco (simulado)' }),
          1100,
        ),
      );

      timers.push(
        setTimeout(
          () => aoEncontrar({ id: 'SIM-02', nome: 'Oxímetro (simulado)' }),
          1600,
        ),
      );
    },

    pararBusca() {
      timers.forEach(clearTimeout);
      timers.length = 0;
    },

    async conectar() {
      // Conexao nao e instantanea: o atraso existe para o indicador de
      // "Conectando..." ter o que mostrar.
      await esperar(1200);

      if (CENARIO_SIMULADO === 'falha-conexao') {
        throw new Error('Simulação: o aparelho não respondeu.');
      }
    },

    monitorarFrequencia(aoReceber) {
      let emitidas = 0;

      intervalo = setInterval(() => {
        // 'conexao-perdida': depois de 4 leituras o aparelho "some" sem
        // avisar -- e exatamente como costuma acontecer de verdade.
        if (CENARIO_SIMULADO === 'conexao-perdida' && emitidas >= 4) return;

        emitidas += 1;

        // Batimento plausivel: 60 a 100 bpm.
        aoReceber(Math.floor(60 + Math.random() * 41));
      }, 1500);
    },

    async desconectar() {
      // Idempotente: pode ser chamado pelo botao E pela saida da tela
      // sem quebrar.
      timers.forEach(clearTimeout);
      timers.length = 0;

      if (intervalo) clearInterval(intervalo);
      intervalo = null;
    },
  };
}

// =====================================================================
// IMPLEMENTACAO REAL
// =====================================================================
// Uma instancia so de BleManager para o app inteiro, como a propria
// biblioteca recomenda: criar uma nova a cada visita a tela vaza recurso
// nativo.
let managerCompartilhado = null;

function criarServicoBleReal() {
  // require DENTRO da funcao: em MODO_SIMULADO a biblioteca nem e
  // carregada, e por isso o app continua abrindo no Expo Go.
  const { BleManager } = require('react-native-ble-plx');

  if (!managerCompartilhado) {
    managerCompartilhado = new BleManager();
  }

  const manager = managerCompartilhado;
  let dispositivo = null;
  let assinatura = null;

  return {
    async procurar(aoEncontrar, aoErro) {
      const autorizado = await pedirPermissoes();
      if (!autorizado) throw new PermissaoBluetoothNegada();

      // Filtrar pelo servico de frequencia cardiaca: numa clinica ha
      // dezenas de aparelhos anunciando ao mesmo tempo.
      manager.startDeviceScan(
        [SERVICO_FREQ_CARDIACA],
        null,
        (erro, encontrado) => {
          if (erro) {
            manager.stopDeviceScan();
            if (aoErro) aoErro(erro);
            return;
          }

          if (encontrado) {
            aoEncontrar({
              id: encontrado.id,
              nome: encontrado.name || 'Aparelho sem nome',
            });
          }
        },
      );
    },

    pararBusca() {
      manager.stopDeviceScan();
    },

    async conectar(id) {
      dispositivo = await manager.connectToDevice(id);

      // Sem este passo, ler a caracteristica falha: o app ainda nao sabe
      // o que o aparelho oferece. O sintoma e confuso porque a conexao
      // "deu certo" -- o erro so aparece na hora de ler.
      await dispositivo.discoverAllServicesAndCharacteristics();
    },

    monitorarFrequencia(aoReceber) {
      assinatura = dispositivo.monitorCharacteristicForService(
        SERVICO_FREQ_CARDIACA,
        CARACTERISTICA_MEDICAO,
        (erro, caracteristica) => {
          if (erro || !caracteristica?.value) return;

          const bpm = decodificarFrequencia(caracteristica.value);
          if (bpm !== null) aoReceber(bpm);
        },
      );
    },

    async desconectar() {
      // Duas coisas diferentes: cancelar a assinatura E encerrar a
      // conexao. So uma delas deixa o aparelho preso ao celular.
      if (assinatura) assinatura.remove();
      assinatura = null;

      if (dispositivo) {
        try {
          await manager.cancelDeviceConnection(dispositivo.id);
        } catch (e) {
          // O aparelho ja pode ter caido sozinho -- nao ha o que fazer.
        }
      }

      dispositivo = null;
    },
  };
}

// A tela so chama isto. Ela nunca sabe qual das duas recebeu.
export function criarServicoBle() {
  return MODO_SIMULADO
    ? criarServicoBleSimulado()
    : criarServicoBleReal();
}
