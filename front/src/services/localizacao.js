// src/services/localizacao.js

// Unico ponto do app que conversa com o GPS do aparelho. Nenhuma tela
// importa expo-location diretamente -- mesmo padrao ja usado em api.js
// (rede) e sessao.js (cofre do sistema): o periferico fica atras de um
// service, e a tela fala a linguagem do dominio.

import * as Location from 'expo-location';

// Coordenadas e endereco da clinica ficam aqui, no mesmo arquivo do
// calculo, porque hoje sao fixos. Na Aula 12 (Mapas) eles podem passar a
// vir do geocoding do endereco -- ate la, isto e divida tecnica
// consciente, nao descuido.
const CLINICA = {
  nome: 'Clyra',
  endereco: 'Rua Sete de Setembro, 1000 - Centro, Sao Carlos - SP',
  telefone: '(16) 3300-0000',
  latitude: -22.0175,
  longitude: -47.8908,
};

// Erro proprio em vez de Error generico: a tela precisa distinguir
// "negou, mas da pra perguntar de novo" de "negou para sempre". Um Error
// comum perderia o canAskAgain, e sem ele a tela nao sabe se oferece o
// botao de tentar de novo ou o de abrir os ajustes do aparelho.
class PermissaoNegada extends Error {
  constructor(canAskAgain) {
    super('Permissão de localização negada.');
    this.name = 'PermissaoNegada';
    this.canAskAgain = canAskAgain;
  }
}

async function obterPosicaoAtual() {
  // Foreground, nunca background: a distancia so precisa ser calculada
  // com a tela aberta. Localizacao em segundo plano e outra permissao,
  // muito mais restrita, e as lojas cobram justificativa forte por ela.
  // Pedir o minimo necessario e regra, nao preferencia.
  const permissao =
    await Location.requestForegroundPermissionsAsync();

  if (permissao.status !== 'granted') {
    throw new PermissaoNegada(permissao.canAskAgain);
  }

  const posicao = await Location.getCurrentPositionAsync({
    // Balanced resolve "a que distancia fica a clinica". Highest gasta
    // mais bateria e demora mais sem mudar a resposta que a tela da --
    // escolher Highest por reflexo e desperdicio.
    accuracy: Location.Accuracy.Balanced,
  });

  return {
    latitude: posicao.coords.latitude,
    longitude: posicao.coords.longitude,
    // accuracy nao e enfeite: +- 5 m e +- 2000 m contam historias muito
    // diferentes sobre o mesmo ponto. Por isso vai para a tela.
    precisaoM: posicao.coords.accuracy,
  };
}

const RAIO_TERRA_KM = 6371;

function grausParaRadianos(graus) {
  return (graus * Math.PI) / 180;
}

// Formula de Haversine: distancia sobre a SUPERFICIE de uma esfera.
// Pitagoras nao serve porque latitude e longitude sao angulos, nao
// coordenadas de um plano.
function distanciaKm(origem, destino) {
  const dLat = grausParaRadianos(
    destino.latitude - origem.latitude,
  );

  const dLon = grausParaRadianos(
    destino.longitude - origem.longitude,
  );

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(grausParaRadianos(origem.latitude)) *
      Math.cos(grausParaRadianos(destino.latitude)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return RAIO_TERRA_KM * c;
}

// Abaixo de 1 km, metros comunicam melhor que "0,4 km".
function formatarDistancia(km) {
  return km < 1
    ? `${Math.round(km * 1000)} m`
    : `${km.toFixed(1)} km`;
}

// Estimativa deliberadamente grosseira, a partir de uma velocidade media
// urbana. Ela NUNCA vai ser tempo de percurso real: a distancia e em
// linha reta. Tempo de verdade exigiria um servico de rotas -- mais um
// Web Service de terceiros, como o ViaCEP da Aula 5. A tela precisa
// deixar isso explicito para o usuario.
const VELOCIDADE_MEDIA_KMH = 30;

function estimarMinutos(km) {
  return Math.max(
    1,
    Math.round((km / VELOCIDADE_MEDIA_KMH) * 60),
  );
}

export {
  CLINICA,
  PermissaoNegada,
  obterPosicaoAtual,
  distanciaKm,
  formatarDistancia,
  estimarMinutos,
};