import React from 'react';
import { usePrecoPromocional } from '@/utils/precoPromocional';

interface PrecoComPromocaoProps {
  itemId: string;
  itemTipo: 'produto' | 'servico';
  precoOriginal: number;
  className?: string;
}

export const PrecoComPromocao = ({ itemId, itemTipo, precoOriginal, className = '' }: PrecoComPromocaoProps) => {
  const { calcularPrecoFinal, formatarPreco } = usePrecoPromocional();
  const info = calcularPrecoFinal(itemId, itemTipo, precoOriginal);

  if (!info.temPromocao || info.precoPromocional === null) {
    return (
      <span className={className}>
        {formatarPreco(info.precoOriginal)}
      </span>
    );
  }

  return (
    <span className={className}>
      <span className="text-primary font-semibold">
        {formatarPreco(info.precoPromocional)}
      </span>
      <span className="text-sm text-muted-foreground line-through ml-2">
        {formatarPreco(info.precoOriginal)}
      </span>
      <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded ml-2">
        {info.tipo === 'desconto' ? '-' : '+'}{info.percentual}%
      </span>
    </span>
  );
};