// front/app.config.js
//
// Complementa o app.json com o que depende de SEGREDO ou de AMBIENTE. O
// app.json nao le variaveis de ambiente; este arquivo le.
//
// Chave do Google Maps (so o build Android precisa; o Expo Go usa a dele):
// vem de GOOGLE_MAPS_API_KEY, definida em front/.env.local, que nao vai para o
// Git. O Expo CLI carrega o .env.local antes de executar este arquivo. Sem a
// variavel, o plugin simplesmente nao e adicionado e o app abre normalmente.
//
// Nao use o prefixo EXPO_PUBLIC_ nesta variavel: ele copia o valor para dentro
// do pacote JavaScript. A chave deve ir so para o build nativo.

module.exports = ({ config }) => {
  const plugins = [...(config.plugins ?? [])];
  const chave = process.env.GOOGLE_MAPS_API_KEY;

  if (chave) {
    plugins.push(['react-native-maps', { androidGoogleMapsApiKey: chave }]);
  }

  return { ...config, plugins };
};
