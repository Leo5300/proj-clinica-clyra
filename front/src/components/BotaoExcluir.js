// Lixeira de uma linha de lista, com alvo de 44 e rotulo para leitor de tela. rotulo (ex.: "Excluir Joao"); onPress.
import React from 'react';
import { Feather } from '@expo/vector-icons';
import Pressionavel from './Pressionavel';
import { useTema, toque } from '../theme';

export default function BotaoExcluir({ rotulo, onPress }) {
  const { cores } = useTema();

  return (
    <Pressionavel
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={rotulo}
      style={{
        width: toque.minimo,
        height: toque.minimo,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Feather name="trash-2" size={19} color={cores.alerta} />
    </Pressionavel>
  );
}
