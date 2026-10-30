// Folha "Sua sessao terminou" quando a API responde 401. aoEntrar: leva ao Login (a tela aberta normalmente ja levou; aqui so garante).
import React, { useEffect, useState } from 'react';
import FolhaDecisao from './FolhaDecisao';
import { aoExpirarSessao } from '../services/sessao';

export default function AvisoDeSessao({ aoEntrar }) {
  const [visivel, setVisivel] = useState(false);

  useEffect(() => aoExpirarSessao(() => setVisivel(true)), []);

  const entrar = () => {
    setVisivel(false);
    aoEntrar?.();
  };

  return (
    <FolhaDecisao
      visivel={visivel}
      aoFechar={entrar}
      titulo="Sua sessão terminou"
      texto="Por segurança, o acesso expira depois de um tempo. Entre de novo para continuar."
      acaoPrincipal={{ titulo: 'Entrar de novo', onPress: entrar }}
      acaoSecundaria={false}
    />
  );
}
