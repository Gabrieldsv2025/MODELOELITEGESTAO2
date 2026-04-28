export interface Cliente {
  id: string;
  nome: string;
  telefone: string;
  email?: string;
  aniversario?: string;
  preferencias?: {
    corteFavorito?: string;
    barbeiroPreferido?: string;
    observacoes?: string;
  };
  observacoes?: string;
  pontosFidelidade: number;
  dataCadastro: string;
  ultimoAtendimento?: string;
  status: 'ativo' | 'perdido';
}

export interface Barbeiro {
  id: string;
  nome: string;
  usuario: string;
  senha: string;
  telefone?: string;
  email?: string;
  horarioTrabalho: {
    segunda: { inicio: string; fim: string; ativo: boolean };
    terca: { inicio: string; fim: string; ativo: boolean };
    quarta: { inicio: string; fim: string; ativo: boolean };
    quinta: { inicio: string; fim: string; ativo: boolean };
    sexta: { inicio: string; fim: string; ativo: boolean };
    sabado: { inicio: string; fim: string; ativo: boolean };
    domingo: { inicio: string; fim: string; ativo: boolean };
  };
  comissaoServicos: number; // porcentagem
  comissaoProdutos: number; // porcentagem
  dataCadastro: string;
  ativo: boolean;
  nivel?: 'administrador' | 'colaborador';
  isProprietario?: boolean;
  fotoPerfilUrl?: string;
  empresaId?: string; // ID da empresa
}

export interface Servico {
  id: string;
  nome: string;
  descricao?: string;
  preco: number;
  ativo: boolean;
  categoria: 'corte' | 'barba' | 'combo' | 'sobrancelha' | 'outros';
  barbeiroIds?: string[]; // barbeiros que podem realizar o serviço
  comissaoPersonalizada?: { [barbeiroId: string]: number }; // comissão específica por barbeiro
  duracaoMinutos?: number; // duração do serviço em minutos
  pacote?: {
    servicoIds: string[];
    desconto: number; // porcentagem de desconto
  };
  dataCadastro: string;
}

export interface Fornecedor {
  id: string;
  nome: string;
  cnpj?: string;
  telefone?: string;
  email?: string;
  endereco?: string;
  ativo: boolean;
  dataCadastro: string;
}

export interface MovimentacaoEstoque {
  id: string;
  produtoId: string;
  tipo: 'entrada' | 'saida';
  quantidade: number;
  precoUnitario?: number;
  motivo: string;
  observacoes?: string;
  dataMovimento: string;
}

export interface Produto {
  id: string;
  nome: string;
  descricao?: string;
  precoCompra: number;
  precoVenda: number;
  estoque: number;
  estoqueMinimo: number;
  categoria: string;
  fornecedorId?: string;
  ativo: boolean;
  dataCadastro: string;
  isComposto?: boolean;
  custoProducao?: number; // calculado, não persistido
}

export type UnidadeMedidaInsumo = 'kg' | 'g' | 'l' | 'ml' | 'un';

export interface Insumo {
  id: string;
  nome: string;
  descricao?: string;
  unidadeMedida: UnidadeMedidaInsumo;
  quantidadeEstoque: number;
  custoTotalCompra: number;
  quantidadeCompra: number;
  custoUnitario: number; // por unidade base (g, ml, un)
  estoqueMinimoAlerta: number;
  ativo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProdutoReceita {
  id?: string;
  produtoId: string;
  insumoId: string;
  quantidadeUtilizada: number; // na unidade base do insumo
  insumo?: Insumo; // hidratado
}

export interface ItemVenda {
  id: string;
  tipo: 'servico' | 'produto';
  itemId: string;
  nome: string;
  preco: number;
  quantidade: number;
  subtotal: number;
  precoOriginal?: number; // Preço original quando há promoção
  promocaoInfo?: string; // Informação sobre a promoção aplicada
  descontoPercentual?: number; // Desconto percentual individual
  descontoValor?: number; // Desconto em valor individual
  valorDesconto?: number; // Valor calculado do desconto
  custoCmv?: number; // Custo de Mercadoria Vendida (snapshot)
}

export interface Venda {
  id: string;
  clienteId: string;
  barbeiroId: string;
  itens: ItemVenda[];
  total: number;
  desconto?: number; // Valor do desconto aplicado na venda
  formaPagamento: 'dinheiro' | 'cartao' | 'pix' | 'fiado';
  status: 'aguardando' | 'pago' | 'cancelado';
  observacoes?: string;
  dataVenda: string;
  dataAtualizacao: string;
  horarioAtendimento: string; // data e hora do atendimento
  userId?: string;
  empresaId?: string;
}

export interface HistoricoAtendimento {
  id: string;
  clienteId: string;
  barbeiroId: string;
  vendaId: string;
  servicos: string[];
  produtos: string[];
  total: number;
  observacoes?: string;
  dataAtendimento: string;
}

export interface ConfiguracaoComissao {
  id: string;
  servicoId?: string;
  produtoId?: string;
  barbeiroId: string;
  tipo: 'servico' | 'produto';
  percentual: number;
  createdAt: string;
  updatedAt: string;
}

export interface ComissaoHistorico {
  id: string;
  vendaId: string;
  barbeiroId: string;
  itemId: string;
  itemTipo: 'servico' | 'produto';
  percentualComissao: number;
  valorComissao: number;
  createdAt: string;
}

export interface RelatorioFinanceiro {
  periodo: string;
  totalVendas: number;
  totalRecebido: number;
  totalPendente: number;
  quantidadeVendas: number;
  ticketMedio: number;
  comissaoTotal: number;
}

export interface UsuarioLogado {
  id: string;
  nome: string;
  tipo: 'administrador' | 'colaborador';
  barbeiroId: string;
  isProprietario?: boolean;
  fotoPerfilUrl?: string;
}

export interface Despesa {
  id: string;
  descricao: string;
  categoria: 'fixa' | 'variavel' | 'investimento' | 'impostos' | 'comissao' | 'insumo' | 'outro';
  valor: number;
  dataDespesa: string;
  formaPagamento: 'dinheiro' | 'pix' | 'cartao' | 'transferencia';
  fornecedor?: string;
  observacao?: string;
  status: 'ativo' | 'inativo';
  statusPagamento?: 'pendente' | 'pago'; // Status de pagamento (fluxo de caixa)
  dataPagamento?: string; // Data em que foi pago (formato YYYY-MM-DD)
  barbeiroId?: string;
  isRecurring?: boolean;
  recurringGroupId?: string;
  recurrenceEndDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface IndicadorFinanceiro {
  id: string;
  mesReferencia: number;
  anoReferencia: number;
  faturamentoBruto: number;
  faturamentoLiquido: number;
  totalDespesas: number;
  custoProdutos: number;
  lucroBruto: number;
  lucroLiquido: number;
  margemBruta: number;
  margemLiquida: number;
  totalComissoes: number;
  numeroVendas: number;
  ticketMedio: number;
  createdAt: string;
  updatedAt: string;
}

export interface ResumoDespesas {
  totalGeral: number;
  porCategoria: {
    [categoria: string]: number;
  };
  porFormaPagamento: {
    [formaPagamento: string]: number;
  };
  mediaDiaria: number;
  mediaMensal: number;
}

export interface PagamentoVenda {
  id: string;
  vendaId: string;
  formaPagamento: 'dinheiro' | 'cartao' | 'pix' | 'fiado';
  valor: number;
  empresaId?: string;
  createdAt?: string;
}

export interface ContaReceber {
  id: string;
  vendaId: string;
  clienteId: string;
  barbeiroId: string;
  valorTotalVenda: number;
  valorPago: number;
  saldoDevedor: number;
  status: 'pendente' | 'quitado';
  dataQuitacao?: string;
  empresaId?: string;
  createdAt: string;
  updatedAt?: string;
}