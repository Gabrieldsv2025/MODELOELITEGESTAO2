import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Percent, Trash2, Edit } from 'lucide-react';
import { usePromocoes } from '@/hooks/usePromocoes';

interface PromocaoCardProps {
  item: {
    id: string;
    nome: string;
    preco: number;
    tipo: 'produto' | 'servico';
  };
}

const DIAS_SEMANA = [
  { valor: 1, label: 'Segunda' },
  { valor: 2, label: 'Terça' },
  { valor: 3, label: 'Quarta' },
  { valor: 4, label: 'Quinta' },
  { valor: 5, label: 'Sexta' },
  { valor: 6, label: 'Sábado' },
  { valor: 0, label: 'Domingo' }
];

export const PromocaoCard = ({ item }: PromocaoCardProps) => {
  const { 
    criarPromocaoProdutoServico, 
    removerPromocao, 
    temPromocaoAtiva, 
    obterInfoPromocao 
  } = usePromocoes();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [percentual, setPercentual] = useState<number>(0);
  const [tipo, setTipo] = useState<'desconto' | 'acrescimo'>('desconto');
  const [diasSelecionados, setDiasSelecionados] = useState<number[]>([]);

  const promocaoAtiva = temPromocaoAtiva(item.id, item.tipo);
  const infoPromocao = obterInfoPromocao(item.id, item.tipo);

  const calcularPrecoPromocional = () => {
    if (tipo === 'desconto') {
      return item.preco * (1 - percentual / 100);
    } else {
      return item.preco * (1 + percentual / 100);
    }
  };

  const handleDiaToggle = (dia: number) => {
    setDiasSelecionados(prev => 
      prev.includes(dia) 
        ? prev.filter(d => d !== dia)
        : [...prev, dia]
    );
  };

  const handleSalvarPromocao = async () => {
    if (percentual <= 0) {
      return;
    }

    await criarPromocaoProdutoServico(
      item.id,
      item.tipo,
      item.preco,
      percentual,
      tipo,
      diasSelecionados
    );

    setDialogOpen(false);
    setPercentual(0);
    setDiasSelecionados([]);
  };

  const handleRemoverPromocao = async () => {
    await removerPromocao(item.id, item.tipo);
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center justify-between">
          <span>{item.nome}</span>
          {promocaoAtiva && (
            <Badge variant="secondary" className="bg-primary/10 text-primary">
              {infoPromocao?.tipo === 'desconto' ? '-' : '+'}{infoPromocao?.percentual}%
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Preço Original</p>
            <p className="font-semibold">R$ {item.preco.toFixed(2)}</p>
          </div>
          
          {promocaoAtiva && infoPromocao && (
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Preço Promocional</p>
              <p className="font-semibold text-primary">
                R$ {infoPromocao.precoPromocional.toFixed(2)}
              </p>
            </div>
          )}
        </div>

        <div className="flex gap-2">
          {!promocaoAtiva ? (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="flex-1">
                  <Percent className="h-4 w-4 mr-2" />
                  Adicionar %
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Configurar Promoção - {item.nome}</DialogTitle>
                </DialogHeader>
                
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="tipo">Tipo</Label>
                      <Select value={tipo} onValueChange={(value: 'desconto' | 'acrescimo') => setTipo(value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="desconto">Desconto</SelectItem>
                          <SelectItem value="acrescimo">Acréscimo</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="percentual">Percentual (%)</Label>
                      <Input
                        id="percentual"
                        type="number"
                        min="0"
                        max="100"
                        value={percentual}
                        onChange={(e) => setPercentual(Number(e.target.value))}
                        placeholder="Ex: 10"
                      />
                    </div>
                  </div>

                  {percentual > 0 && (
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-sm font-medium">Preview:</p>
                      <p className="text-lg">
                        R$ {item.preco.toFixed(2)} → R$ {calcularPrecoPromocional().toFixed(2)}
                      </p>
                    </div>
                  )}

                  <div className="space-y-3">
                    <Label>Dias da Semana para Repetir</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {DIAS_SEMANA.map(dia => (
                        <div key={dia.valor} className="flex items-center space-x-2">
                          <Checkbox
                            id={`dia-${dia.valor}`}
                            checked={diasSelecionados.includes(dia.valor)}
                            onCheckedChange={() => handleDiaToggle(dia.valor)}
                          />
                          <Label htmlFor={`dia-${dia.valor}`} className="text-sm">
                            {dia.label}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <DialogFooter>
                  <Button 
                    onClick={handleSalvarPromocao}
                    disabled={percentual <= 0}
                  >
                    Salvar Promoção
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          ) : (
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1"
              onClick={handleRemoverPromocao}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Remover
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};