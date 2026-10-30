// src/theme/index.js
//
// Porta unica do tema: import { useTema, espaco, raio } from '../theme'.

export { TemaProvider, useTema } from './TemaProvider';
export { paletas, coresDoPerfil, comAlfa } from './cores';
export {
  AREAS,
  ehPsiquiatria,
  corDaArea,
  planoDaArea,
  topoDoProfissional,
  estiloDeEtiqueta,
} from './area';
export {
  arquivosDeFonte,
  fontes,
  estilosDeTexto,
  numerosTabulares,
} from './tipografia';
export {
  espaco,
  margemTela,
  raio,
  toque,
  areaDeToque,
  sombras,
} from './medidas';
export {
  duracao,
  curva,
  curvaCss,
  escalaToque,
  escalaVidroToque,
} from './movimento';
