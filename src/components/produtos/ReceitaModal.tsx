import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Trash2, Plus } from 'lucide-react';
import { Insumo, ProdutoReceita } from '@/types';
import { useInsumos } from '@/hooks/useInsumos';
import { getUnidadeBase } from '@/utils/supabaseInsumosStorage';

interface ReceitaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  receitaInicial: ProdutoReceita[];
  onSave: (receita: ProdutoReceita[]) => void;
  produtoId?: string;
}

const formatBRL = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

export function ReceitaModal({ open, onOpenChange, receitaInicial, onSave, produtoId }: ReceitaModalProps) {
  const { insumos } = useInsumos();
  const [itens, setItens] = useState<ProdutoReceita[]>([]);
  const [insumoSel, setInsumoSel] = useState<string>('');
  const [qtd, setQtd] = useState<string>('');

  useEffect(() => {
    if (open) setItens(receitaInicial.map(r => ({ ...r })));
  }, [open, receitaInicial]);

  const insumosMap = useMemo(() => {
    const m: Record<string, Insumo> = {};
    insumos.forEach(i => { m[i.id] = i; });
    return m;
  }, [insumos]);

  const adicionar = () => {
    if (!insumoSel || !qtd) return;
    const q = parseFloat(qtd);
    if (q <= 0) return;
    if (itens.some(i => i.insumoId === insumoSel)) return;
    const insumo = insumosMap[insumoSel];
    setItens([...itens, {
      produtoId: produtoId || '',
      insumoId: insumoSel,
      quantidadeUtilizada: q,
      insumo
    }]);
    setInsumoSel('');
    setQtd('');
  };

  const remover = (idx: number) => setItens(itens.filter((_, i) => i !== idx));

  const custoTotal = useMemo(() =>
    itens.reduce((s, it) => {
      const i = it.insumo || insumosMap[it.insumoId];
      return s + (i ? it.quantidadeUtilizada * i.custoUnitario : 0);
    }, 0)
  , [itens, insumosMap]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Ficha Técnica / Receita</DialogTitle>
          <DialogDescription>
            Adicione os insumos e quantidades necessárias para produzir 1 unidade deste produto.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Adicionar item */}
          <div className="grid grid-cols-[1fr_140px_auto] gap-2 items-end">
            <div className="space-y-1">
              <Label className="text-xs">Insumo</Label>
              <Select value={insumoSel} onValueChange={setInsumoSel}>
                <SelectTrigger><SelectValue placeholder="Selecione um insumo" /></SelectTrigger>
                <SelectContent>
                  {insumos.filter(i => i.ativo && !itens.some(it => it.insumoId === i.id)).map(i => (
                    <SelectItem key={i.id} value={i.id}>
                      {i.nome} ({getUnidadeBase(i.unidadeMedida)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">
                Quantidade {insumoSel ? `(${getUnidadeBase(insumosMap[insumoSel]?.unidadeMedida || 'g')})` : ''}
              </Label>
              <Input type="number" step="0.001" value={qtd} onChange={e => setQtd(e.target.value)} placeholder="0" />
            </div>
            <Button type="button" onClick={adicionar} disabled={!insumoSel || !qtd}>
              <Plus className="h-4 w-4 mr-1" />Adicionar
            </Button>
          </div>

          {/* Lista */}
          {itens.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground border rounded-md">
              Nenhum insumo adicionado à receita
            </div>
          ) : (
            <div className="border rounded-md divide-y">
              {itens.map((it, idx) => {
                const insumo = it.insumo || insumosMap[it.insumoId];
                const subtotal = insumo ? it.quantidadeUtilizada * insumo.custoUnitario : 0;
                return (
                  <div key={idx} className="flex items-center justify-between p-3 gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{insumo?.nome || 'Insumo removido'}</div>
                      <div className="text-xs text-muted-foreground">
                        {it.quantidadeUtilizada} {insumo ? getUnidadeBase(insumo.unidadeMedida) : ''} ×{' '}
                        {insumo ? formatBRL(insumo.custoUnitario) : '-'} = <strong>{formatBRL(subtotal)}</strong>
                      </div>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => remover(idx)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex justify-between items-center bg-muted/50 rounded-md p-3">
            <span className="text-sm font-medium">Custo Total de Produção:</span>
            <Badge variant="secondary" className="text-base font-bold">{formatBRL(custoTotal)}</Badge>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={() => { onSave(itens); onOpenChange(false); }}>Salvar Receita</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
