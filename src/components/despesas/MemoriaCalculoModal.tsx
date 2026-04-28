import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { IndicadorFinanceiro } from "@/types";

interface MemoriaCalculoModalProps {
  isOpen: boolean;
  onClose: () => void;
  indicador: IndicadorFinanceiro | null;
}

export const MemoriaCalculoModal = ({ isOpen, onClose, indicador }: MemoriaCalculoModalProps) => {
  if (!indicador) return null;

  const meses = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const mesNome = meses[indicador.mesReferencia - 1];
  const ano = indicador.anoReferencia;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>🧾</span>
            <span>Memória de Cálculo - {mesNome}/{ano}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Margem Bruta */}
          <div className="space-y-3">
            <h3 className="font-semibold text-base flex items-center gap-2">
              <span>📊</span>
              <span>MARGEM BRUTA</span>
            </h3>
            <Separator />
            
            <div className="space-y-2 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Faturamento Bruto:</span>
                <span className="font-mono font-medium">R$ {indicador.faturamentoBruto.toFixed(2)}</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground" title="Custo de Mercadoria Vendida (Produtos e Insumos)">(-) CMV (Custo de Produtos e Insumos):</span>
                <span className="font-mono font-medium text-red-600">R$ {indicador.custoProdutos.toFixed(2)}</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">(-) Comissões:</span>
                <span className="font-mono font-medium text-red-600">R$ {indicador.totalComissoes.toFixed(2)}</span>
              </div>
              
              <Separator className="my-2" />
              
              <div className="flex justify-between items-center font-semibold">
                <span>(=) Lucro Bruto:</span>
                <span className={`font-mono ${indicador.lucroBruto >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  R$ {indicador.lucroBruto.toFixed(2)}
                </span>
              </div>
              
              <div className="flex justify-between items-center font-bold text-base">
                <span>Margem Bruta:</span>
                <span className={`font-mono ${indicador.margemBruta >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {indicador.margemBruta.toFixed(2)}%
                </span>
              </div>
            </div>
          </div>

          {/* Margem Líquida */}
          <div className="space-y-3">
            <h3 className="font-semibold text-base flex items-center gap-2">
              <span>💰</span>
              <span>MARGEM LÍQUIDA</span>
            </h3>
            <Separator />
            
            <div className="space-y-2 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Lucro Bruto:</span>
                <span className={`font-mono font-medium ${indicador.lucroBruto >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  R$ {indicador.lucroBruto.toFixed(2)}
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">(-) Despesas Operacionais:</span>
                <span className="font-mono font-medium text-red-600">R$ {indicador.totalDespesas.toFixed(2)}</span>
              </div>
              
              <Separator className="my-2" />
              
              <div className="flex justify-between items-center font-semibold">
                <span>(=) Lucro Líquido:</span>
                <span className={`font-mono ${indicador.lucroLiquido >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  R$ {indicador.lucroLiquido.toFixed(2)}
                </span>
              </div>
              
              <div className="flex justify-between items-center font-bold text-base">
                <span>Margem Líquida:</span>
                <span className={`font-mono ${indicador.margemLiquida >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {indicador.margemLiquida.toFixed(2)}%
                </span>
              </div>
            </div>
          </div>

          {/* Resumo Final */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-xs">
            <p className="text-muted-foreground">
              <strong>Fórmulas utilizadas:</strong>
            </p>
            <p className="font-mono">
              Lucro Bruto = Faturamento - Custo Produtos - Comissões
            </p>
            <p className="font-mono">
              Lucro Líquido = Lucro Bruto - Despesas
            </p>
            <p className="font-mono">
              Margem % = (Lucro / Faturamento) × 100
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
