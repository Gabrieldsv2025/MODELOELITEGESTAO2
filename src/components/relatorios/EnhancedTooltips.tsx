import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface DayTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
}

// Função para formatar variação com tratamento de null/Infinity
const formatVariation = (value: number | null | undefined) => {
  // Caso N/A: valor é null ou undefined
  if (value === null || value === undefined) {
    return (
      <div className="flex items-center gap-1 text-muted-foreground">
        <Minus className="h-3 w-3" />
        <span>N/A</span>
      </div>
    );
  }
  
  // Caso Infinity: crescimento infinito (de 0 para algo)
  if (!isFinite(value)) {
    return (
      <div className="flex items-center gap-1 text-green-500">
        <TrendingUp className="h-3 w-3" />
        <span>+∞</span>
      </div>
    );
  }
  
  const absValue = Math.abs(value);
  const color = value > 0 ? 'text-green-500' : value < 0 ? 'text-red-500' : 'text-muted-foreground';
  const icon = value > 0 ? <TrendingUp className="h-3 w-3" /> : value < 0 ? <TrendingDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />;
  
  return (
    <div className={`flex items-center gap-1 ${color}`}>
      {icon}
      <span>{value > 0 ? '+' : ''}{absValue.toFixed(1)}%</span>
    </div>
  );
};

export const EnhancedDayTooltip: React.FC<DayTooltipProps> = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;

    return (
      <div className="bg-popover border-2 border-primary rounded-xl p-3 shadow-lg min-w-[280px]">
        <p className="font-medium text-sm mb-2">Data: {label}</p>
        
        <div className="space-y-2 text-sm">
          <div className="flex justify-between items-center">
            <span>Faturamento:</span>
            <span className="font-mono font-bold">R$ {data.faturamento.toFixed(2)}</span>
          </div>
          
          <div className="flex justify-between items-center">
            <span>Vendas:</span>
            <span className="font-medium">{data.vendas}</span>
          </div>
          
          <div className="flex justify-between items-center">
            <span>Clientes únicos:</span>
            <span className="font-medium">{data.clientes}</span>
          </div>
          
          <div className="border-t pt-2 mt-2">
            <div className="flex justify-between items-center">
              <span className="text-xs">vs dia anterior:</span>
              {formatVariation(data.variacaoDiaAnterior)}
            </div>
            
            <div className="flex justify-between items-center mt-1">
              <span className="text-xs">vs semana anterior:</span>
              {formatVariation(data.variacaoMesmoDiaSemanaAnterior)}
            </div>
            
            <div className="flex justify-between items-center mt-1">
              <span className="text-xs">Média do período:</span>
              <span className="text-xs font-mono">R$ {data.mediaFaturamento.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

interface MonthTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
}

export const EnhancedMonthTooltip: React.FC<MonthTooltipProps> = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    
    const formatVariation = (value: number) => {
      const absValue = Math.abs(value);
      const color = value > 0 ? 'text-green-500' : value < 0 ? 'text-red-500' : 'text-gray-500';
      const icon = value > 0 ? <TrendingUp className="h-3 w-3" /> : value < 0 ? <TrendingDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />;
      
      return (
        <div className={`flex items-center gap-1 ${color}`}>
          {icon}
          <span>{absValue.toFixed(1)}%</span>
        </div>
      );
    };

    return (
      <div className="bg-popover border-2 border-primary rounded-xl p-3 shadow-lg min-w-[260px]">
        <p className="font-medium text-sm mb-2">Mês: {label}</p>
        
        <div className="space-y-2 text-sm">
          <div className="flex justify-between items-center">
            <span>Faturamento:</span>
            <span className="font-mono font-bold">R$ {data.faturamento.toFixed(2)}</span>
          </div>
          
          <div className="flex justify-between items-center">
            <span>Vendas:</span>
            <span className="font-medium">{data.vendas}</span>
          </div>
          
          <div className="border-t pt-2 mt-2">
            <div className="flex justify-between items-center">
              <span className="text-xs">vs mês anterior:</span>
              {formatVariation(data.variacaoMesAnterior)}
            </div>
            
            <div className="flex justify-between items-center mt-1">
              <span className="text-xs">Média do período:</span>
              <span className="text-xs font-mono">R$ {data.mediaFaturamento.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

interface ClientsTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
}

export const EnhancedClientsTooltip: React.FC<ClientsTooltipProps> = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;

    return (
      <div className="bg-popover border-2 border-primary rounded-xl p-3 shadow-lg min-w-[280px]">
        <p className="font-medium text-sm mb-2">Data: {label}</p>
        
        <div className="space-y-2 text-sm">
          <div className="flex justify-between items-center">
            <span>Clientes atendidos:</span>
            <span className="font-mono font-bold">{data.clientes}</span>
          </div>
          
          <div className="flex justify-between items-center">
            <span>Faturamento:</span>
            <span className="font-medium">R$ {data.faturamento.toFixed(2)}</span>
          </div>
          
          <div className="border-t pt-2 mt-2">
            <div className="flex justify-between items-center">
              <span className="text-xs">vs dia anterior:</span>
              {formatVariation(data.variacaoClientesDiaAnterior)}
            </div>
            
            <div className="flex justify-between items-center mt-1">
              <span className="text-xs">vs semana anterior:</span>
              {formatVariation(data.variacaoClientesSemanaAnterior)}
            </div>
            
            <div className="flex justify-between items-center mt-1">
              <span className="text-xs">Média do período:</span>
              <span className="text-xs font-mono">{data.mediaClientes?.toFixed(1) || '0'} clientes</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
};