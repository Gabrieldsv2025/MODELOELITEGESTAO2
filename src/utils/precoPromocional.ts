import { usePromocoes } from '@/hooks/usePromocoes';

export interface PrecoPromocionalInfo {
  precoOriginal: number;
  precoPromocional: number | null;
  temPromocao: boolean;
  percentual?: number;
  tipo?: 'desconto' | 'acrescimo';
}

// Hook para usar preços promocionais em componentes
export const usePrecoPromocional = () => {
  const { obterPrecoPromocional, temPromocaoAtiva, obterInfoPromocao } = usePromocoes();

  const calcularPrecoFinal = (itemId: string, itemTipo: 'produto' | 'servico', precoOriginal: number): PrecoPromocionalInfo => {
    const temPromocao = temPromocaoAtiva(itemId, itemTipo);
    const precoPromocional = obterPrecoPromocional(itemId, itemTipo);
    const infoPromocao = obterInfoPromocao(itemId, itemTipo);

    return {
      precoOriginal,
      precoPromocional,
      temPromocao,
      percentual: infoPromocao?.percentual,
      tipo: infoPromocao?.tipo
    };
  };

  const formatarPreco = (preco: number): string => {
    return `R$ ${preco.toFixed(2)}`;
  };

  const formatarPrecoComPromocao = (info: PrecoPromocionalInfo): string => {
    if (!info.temPromocao || info.precoPromocional === null) {
      return formatarPreco(info.precoOriginal);
    }

    return `${formatarPreco(info.precoPromocional)} (era ${formatarPreco(info.precoOriginal)})`;
  };

  return {
    calcularPrecoFinal,
    formatarPreco,
    formatarPrecoComPromocao
  };
};

// Função utilitária para usar fora de componentes React
export const calcularPrecoComPromocao = (
  precoOriginal: number,
  percentual: number,
  tipo: 'desconto' | 'acrescimo'
): number => {
  if (tipo === 'desconto') {
    return precoOriginal * (1 - percentual / 100);
  } else {
    return precoOriginal * (1 + percentual / 100);
  }
};

// Interface para componente de preço com promoção
export interface PrecoComPromocaoProps {
  itemId: string;
  itemTipo: 'produto' | 'servico';
  precoOriginal: number;
  className?: string;
}