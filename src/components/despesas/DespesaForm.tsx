import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Despesa } from '@/types';
import { Switch } from '@/components/ui/switch';
import { Info } from 'lucide-react';

const despesaSchema = z.object({
  descricao: z.string().min(3, 'Descrição deve ter no mínimo 3 caracteres'),
  categoria: z.enum(['fixa', 'variavel', 'investimento', 'impostos', 'comissao', 'insumo', 'outro']),
  valor: z.number().min(0.01, 'Valor deve ser maior que zero'),
  dataDespesa: z.string(),
  formaPagamento: z.enum(['dinheiro', 'pix', 'cartao', 'transferencia']),
  fornecedor: z.string().optional(),
  observacao: z.string().optional(),
  status: z.enum(['ativo', 'inativo']),
  isRecurring: z.boolean().default(false),
});

type DespesaFormData = z.infer<typeof despesaSchema>;

interface DespesaFormProps {
  despesa?: Despesa;
  onSubmit: (data: DespesaFormData) => Promise<boolean>;
  onCancel: () => void;
}

export function DespesaForm({ despesa, onSubmit, onCancel }: DespesaFormProps) {
  const form = useForm<DespesaFormData>({
    resolver: zodResolver(despesaSchema),
    defaultValues: despesa ? {
      descricao: despesa.descricao,
      categoria: despesa.categoria,
      valor: despesa.valor,
      dataDespesa: despesa.dataDespesa,
      formaPagamento: despesa.formaPagamento,
      fornecedor: despesa.fornecedor || '',
      observacao: despesa.observacao || '',
      status: despesa.status,
      isRecurring: despesa.isRecurring || false,
    } : {
      descricao: '',
      categoria: 'fixa',
      valor: 0,
      dataDespesa: new Date().toISOString().split('T')[0],
      formaPagamento: 'dinheiro',
      fornecedor: '',
      observacao: '',
      status: 'ativo',
      isRecurring: false,
    },
  });

  const handleSubmit = async (data: DespesaFormData) => {
    const success = await onSubmit(data);
    if (success) {
      form.reset();
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="descricao"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descrição *</FormLabel>
              <FormControl>
                <Input placeholder="Ex: Aluguel, Energia, Compra de material..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="categoria"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Categoria *</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="fixa">Fixa</SelectItem>
                    <SelectItem value="variavel">Variável</SelectItem>
                    <SelectItem value="investimento">Investimento</SelectItem>
                    <SelectItem value="impostos">Impostos</SelectItem>
                    <SelectItem value="comissao">Comissão</SelectItem>
                    <SelectItem value="insumo">Insumo</SelectItem>
                    <SelectItem value="outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="valor"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Valor (R$) *</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0,00"
                    {...field}
                    onChange={(e) => field.onChange(parseFloat(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="dataDespesa"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Data *</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="formaPagamento"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Forma de Pagamento *</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="dinheiro">Dinheiro</SelectItem>
                    <SelectItem value="pix">PIX</SelectItem>
                    <SelectItem value="cartao">Cartão</SelectItem>
                    <SelectItem value="transferencia">Transferência</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="fornecedor"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Fornecedor</FormLabel>
              <FormControl>
                <Input placeholder="Nome do fornecedor (opcional)" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="observacao"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Observação</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Observações adicionais (opcional)"
                  className="resize-none"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Status *</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="ativo">Ativo</SelectItem>
                  <SelectItem value="inativo">Inativo</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="isRecurring"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border border-border p-4 bg-muted/50">
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel className="text-sm font-medium">
                  Despesa recorrente mensalmente
                </FormLabel>
                <p className="text-xs text-muted-foreground flex items-start gap-1">
                  <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
                  <span>
                    Ao marcar, o sistema criará automaticamente 12 despesas projetadas para os próximos meses com a mesma data de pagamento.
                  </span>
                </p>
              </div>
            </FormItem>
          )}
        />

        <div className="flex gap-2 justify-end pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="submit">
            {despesa ? 'Atualizar' : 'Adicionar'} Despesa
          </Button>
        </div>
      </form>
    </Form>
  );
}
