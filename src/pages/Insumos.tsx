import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertTriangle, Plus, Edit, Trash2, Boxes, Search, PackagePlus } from 'lucide-react';
import { Insumo, UnidadeMedidaInsumo } from '@/types';
import { useInsumos } from '@/hooks/useInsumos';
import { supabaseInsumoStorage, formatarEstoque, getUnidadeBase, converterParaUnidadeBase } from '@/utils/supabaseInsumosStorage';
import { useToast } from '@/hooks/use-toast';
import { ResponsiveLayout } from '@/components/layout/ResponsiveLayout';

const UNIDADES: { value: UnidadeMedidaInsumo; label: string }[] = [
  { value: 'kg', label: 'Quilograma (kg)' },
  { value: 'g', label: 'Grama (g)' },
  { value: 'l', label: 'Litro (L)' },
  { value: 'ml', label: 'Mililitro (ml)' },
  { value: 'un', label: 'Unidade (un)' },
];

const formatBRL = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

const formatCustoUnitario = (custoUnitario: number, unidade: UnidadeMedidaInsumo): string => {
  const base = getUnidadeBase(unidade);
  return `${formatBRL(custoUnitario)} / ${base}`;
};

export default function Insumos() {
  const { insumos, insumosBaixoEstoque, loading, refresh } = useInsumos();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [compraDialog, setCompraDialog] = useState<{ open: boolean; insumo?: Insumo }>({ open: false });
  const [editing, setEditing] = useState<Insumo | null>(null);

  const [form, setForm] = useState({
    nome: '',
    descricao: '',
    unidadeMedida: 'g' as UnidadeMedidaInsumo,
    quantidadeEstoque: '',
    custoTotalCompra: '',
    quantidadeCompra: '',
    estoqueMinimoAlerta: '',
    ativo: true,
  });

  const [compraForm, setCompraForm] = useState({ quantidade: '', custo: '' });

  const resetForm = () => {
    setForm({
      nome: '',
      descricao: '',
      unidadeMedida: 'g',
      quantidadeEstoque: '',
      custoTotalCompra: '',
      quantidadeCompra: '',
      estoqueMinimoAlerta: '',
      ativo: true,
    });
    setEditing(null);
  };

  const handleOpenEdit = (insumo: Insumo) => {
    setEditing(insumo);
    setForm({
      nome: insumo.nome,
      descricao: insumo.descricao || '',
      unidadeMedida: insumo.unidadeMedida,
      quantidadeEstoque: insumo.quantidadeEstoque.toString(),
      custoTotalCompra: insumo.custoTotalCompra.toString(),
      quantidadeCompra: insumo.quantidadeCompra.toString(),
      estoqueMinimoAlerta: insumo.estoqueMinimoAlerta.toString(),
      ativo: insumo.ativo,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.nome.trim()) {
      toast({ title: 'Erro', description: 'Nome é obrigatório', variant: 'destructive' });
      return;
    }
    try {
      const payload = {
        nome: form.nome.trim(),
        descricao: form.descricao || undefined,
        unidadeMedida: form.unidadeMedida,
        quantidadeEstoque: parseFloat(form.quantidadeEstoque) || 0,
        custoTotalCompra: parseFloat(form.custoTotalCompra) || 0,
        quantidadeCompra: parseFloat(form.quantidadeCompra) || 0,
        estoqueMinimoAlerta: parseFloat(form.estoqueMinimoAlerta) || 0,
        ativo: form.ativo,
      };

      if (editing) {
        await supabaseInsumoStorage.update(editing.id, payload);
        toast({ title: 'Insumo atualizado', description: 'Dados salvos com sucesso' });
      } else {
        await supabaseInsumoStorage.add(payload);
        toast({ title: 'Insumo cadastrado', description: 'Insumo adicionado com sucesso' });
      }
      await refresh();
      setDialogOpen(false);
      resetForm();
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message || 'Erro ao salvar', variant: 'destructive' });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este insumo?')) return;
    try {
      await supabaseInsumoStorage.delete(id);
      await refresh();
      toast({ title: 'Insumo removido' });
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message || 'Erro ao remover', variant: 'destructive' });
    }
  };

  const handleRegistrarCompra = async () => {
    if (!compraDialog.insumo) return;
    const qtd = parseFloat(compraForm.quantidade) || 0;
    const custo = parseFloat(compraForm.custo) || 0;
    if (qtd <= 0 || custo <= 0) {
      toast({ title: 'Erro', description: 'Quantidade e custo devem ser maiores que zero', variant: 'destructive' });
      return;
    }
    try {
      await supabaseInsumoStorage.registrarCompra(compraDialog.insumo.id, qtd, custo, compraDialog.insumo.unidadeMedida);
      toast({ title: 'Compra registrada', description: 'Estoque atualizado' });
      await refresh();
      setCompraDialog({ open: false });
      setCompraForm({ quantidade: '', custo: '' });
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message || 'Erro ao registrar compra', variant: 'destructive' });
    }
  };

  const filtered = useMemo(() => {
    if (!search.trim()) return insumos;
    const t = search.toLowerCase().trim();
    return insumos.filter(i => i.nome.toLowerCase().includes(t) || i.descricao?.toLowerCase().includes(t));
  }, [insumos, search]);

  const valorEstoqueTotal = useMemo(
    () => insumos.reduce((s, i) => s + i.quantidadeEstoque * i.custoUnitario, 0),
    [insumos]
  );

  return (
    <ResponsiveLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Insumos (Almoxarifado)</h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Cadastre matérias-primas, registre compras e controle o estoque dos ingredientes
            </p>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid gap-3 sm:gap-4 grid-cols-2 sm:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Insumos</CardTitle>
              <Boxes className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{insumos.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Valor em Estoque</CardTitle>
              <PackagePlus className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-600">{formatBRL(valorEstoqueTotal)}</div>
            </CardContent>
          </Card>
          <Card className={insumosBaixoEstoque.length > 0 ? 'border-destructive/40' : ''}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Em Alerta de Reposição</CardTitle>
              <AlertTriangle className={`h-4 w-4 ${insumosBaixoEstoque.length > 0 ? 'text-destructive' : 'text-muted-foreground'}`} />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${insumosBaixoEstoque.length > 0 ? 'text-destructive' : ''}`}>
                {insumosBaixoEstoque.length}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h3 className="text-lg font-semibold">Lista de Insumos</h3>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1 sm:max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar insumos..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
            </div>
            <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm(); }}>
              <DialogTrigger asChild>
                <Button onClick={resetForm}>
                  <Plus className="h-4 w-4 mr-2" />Novo Insumo
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>{editing ? 'Editar Insumo' : 'Cadastrar Insumo'}</DialogTitle>
                  <DialogDescription>
                    Informe os dados da matéria-prima. O custo unitário é calculado automaticamente.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Nome *</Label>
                      <Input value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} placeholder="Ex: Polpa de Açaí" />
                    </div>
                    <div className="space-y-2">
                      <Label>Unidade de Medida *</Label>
                      <Select value={form.unidadeMedida} onValueChange={(v) => setForm({ ...form, unidadeMedida: v as UnidadeMedidaInsumo })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {UNIDADES.map(u => <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Descrição</Label>
                    <Textarea value={form.descricao} onChange={e => setForm({ ...form, descricao: e.target.value })} rows={2} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Quantidade Comprada ({form.unidadeMedida})</Label>
                      <Input type="number" step="0.001" value={form.quantidadeCompra} onChange={e => setForm({ ...form, quantidadeCompra: e.target.value })} placeholder="Ex: 10" />
                    </div>
                    <div className="space-y-2">
                      <Label>Custo Total da Compra (R$)</Label>
                      <Input type="number" step="0.01" value={form.custoTotalCompra} onChange={e => setForm({ ...form, custoTotalCompra: e.target.value })} placeholder="0,00" />
                    </div>
                  </div>
                  {form.quantidadeCompra && form.custoTotalCompra && parseFloat(form.quantidadeCompra) > 0 && (
                    <div className="rounded-md bg-muted/50 p-3 text-sm">
                      <strong>Custo unitário calculado:</strong>{' '}
                      {formatCustoUnitario(
                        parseFloat(form.custoTotalCompra) / converterParaUnidadeBase(parseFloat(form.quantidadeCompra), form.unidadeMedida),
                        form.unidadeMedida
                      )}
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Estoque Atual ({getUnidadeBase(form.unidadeMedida)})</Label>
                      <Input type="number" step="0.001" value={form.quantidadeEstoque} onChange={e => setForm({ ...form, quantidadeEstoque: e.target.value })} placeholder="0" />
                      <p className="text-xs text-muted-foreground">Em unidade base ({getUnidadeBase(form.unidadeMedida)})</p>
                    </div>
                    <div className="space-y-2">
                      <Label>Alerta de Estoque Mínimo ({getUnidadeBase(form.unidadeMedida)})</Label>
                      <Input type="number" step="0.001" value={form.estoqueMinimoAlerta} onChange={e => setForm({ ...form, estoqueMinimoAlerta: e.target.value })} placeholder="0" />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                  <Button onClick={handleSave}>{editing ? 'Atualizar' : 'Salvar'}</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Carregando...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">Nenhum insumo cadastrado</div>
        ) : (
          <Card className="bg-card/80 backdrop-blur-sm">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Insumo</TableHead>
                  <TableHead>Unidade</TableHead>
                  <TableHead>Estoque</TableHead>
                  <TableHead>Custo Unitário</TableHead>
                  <TableHead>Mínimo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(i => {
                  const baixo = i.quantidadeEstoque <= i.estoqueMinimoAlerta;
                  return (
                    <TableRow key={i.id}>
                      <TableCell>
                        <div className="font-medium">{i.nome}</div>
                        {i.descricao && <div className="text-sm text-muted-foreground">{i.descricao}</div>}
                      </TableCell>
                      <TableCell><Badge variant="outline">{i.unidadeMedida}</Badge></TableCell>
                      <TableCell className={baixo ? 'text-destructive font-medium' : ''}>
                        {formatarEstoque(i.quantidadeEstoque, i.unidadeMedida)}
                      </TableCell>
                      <TableCell>{formatCustoUnitario(i.custoUnitario, i.unidadeMedida)}</TableCell>
                      <TableCell>{formatarEstoque(i.estoqueMinimoAlerta, i.unidadeMedida)}</TableCell>
                      <TableCell>
                        {baixo ? (
                          <Badge variant="destructive" className="gap-1">
                            <AlertTriangle className="h-3 w-3" />Repor
                          </Badge>
                        ) : (
                          <Badge variant="default">OK</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-1">
                          <Button size="sm" variant="outline" onClick={() => setCompraDialog({ open: true, insumo: i })} title="Registrar compra">
                            <PackagePlus className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleOpenEdit(i)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleDelete(i.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        )}

        {/* Modal de registrar compra */}
        <Dialog open={compraDialog.open} onOpenChange={(o) => { if (!o) { setCompraDialog({ open: false }); setCompraForm({ quantidade: '', custo: '' }); } }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Registrar Compra: {compraDialog.insumo?.nome}</DialogTitle>
              <DialogDescription>
                A quantidade comprada será somada ao estoque e o custo unitário recalculado com base nesta compra.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-2">
              <div className="space-y-2">
                <Label>Quantidade Comprada ({compraDialog.insumo?.unidadeMedida})</Label>
                <Input type="number" step="0.001" value={compraForm.quantidade} onChange={e => setCompraForm({ ...compraForm, quantidade: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Custo Total (R$)</Label>
                <Input type="number" step="0.01" value={compraForm.custo} onChange={e => setCompraForm({ ...compraForm, custo: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCompraDialog({ open: false })}>Cancelar</Button>
              <Button onClick={handleRegistrarCompra}>Registrar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </ResponsiveLayout>
  );
}
