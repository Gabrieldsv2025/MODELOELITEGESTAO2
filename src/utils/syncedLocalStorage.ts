import { 
  Cliente, 
  Barbeiro, 
  Servico, 
  Produto, 
  Fornecedor,
  MovimentacaoEstoque,
  Venda, 
  HistoricoAtendimento,
  ConfiguracaoComissao,
  UsuarioLogado 
} from '@/types';

const STORAGE_KEYS = {
  CLIENTES: 'barbearia_clientes',
  BARBEIROS: 'barbearia_barbeiros',
  SERVICOS: 'barbearia_servicos',
  PRODUTOS: 'barbearia_produtos',
  FORNECEDORES: 'barbearia_fornecedores',
  MOVIMENTACOES_ESTOQUE: 'barbearia_movimentacoes_estoque',
  VENDAS: 'barbearia_vendas',
  HISTORICO: 'barbearia_historico',
  COMISSOES: 'barbearia_comissoes',
  USUARIO_LOGADO: 'barbearia_usuario_logado',
} as const;

// Função para emitir eventos de sincronização
const emitSyncEvent = (key: string) => {
  // Emitir via BroadcastChannel para outras abas
  const channel = new BroadcastChannel('barbearia_sync');
  channel.postMessage({ type: 'storage_updated', key });
  channel.close();
  
  // Emitir evento local
  window.dispatchEvent(new CustomEvent('storage_updated', { 
    detail: { key } 
  }));
};

// Utilitários genéricos para localStorage com sincronização
export const syncedStorage = {
  get: <T>(key: string): T[] => {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  set: <T>(key: string, data: T[]): void => {
    try {
      localStorage.setItem(key, JSON.stringify(data));
      emitSyncEvent(key);
    } catch (error) {
      console.error(`Erro ao salvar ${key}:`, error);
    }
  },

  getSingle: <T>(key: string): T | null => {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },

  setSingle: <T>(key: string, data: T): void => {
    try {
      localStorage.setItem(key, JSON.stringify(data));
      emitSyncEvent(key);
    } catch (error) {
      console.error(`Erro ao salvar ${key}:`, error);
    }
  },

  remove: (key: string): void => {
    localStorage.removeItem(key);
    emitSyncEvent(key);
  }
};

// Funções específicas para cada entidade com sincronização automática
export const syncedClienteStorage = {
  getAll: (): Cliente[] => syncedStorage.get<Cliente>(STORAGE_KEYS.CLIENTES),
  save: (clientes: Cliente[]): void => syncedStorage.set(STORAGE_KEYS.CLIENTES, clientes),
  add: (cliente: Cliente): void => {
    const clientes = syncedClienteStorage.getAll();
    clientes.push(cliente);
    syncedClienteStorage.save(clientes);
  },
  update: (clienteAtualizado: Cliente): void => {
    const clientes = syncedClienteStorage.getAll();
    const index = clientes.findIndex(c => c.id === clienteAtualizado.id);
    if (index >= 0) {
      clientes[index] = clienteAtualizado;
      syncedClienteStorage.save(clientes);
    }
  },
  delete: (id: string): void => {
    const clientes = syncedClienteStorage.getAll().filter(c => c.id !== id);
    syncedClienteStorage.save(clientes);
  },
  getById: (id: string): Cliente | undefined => {
    return syncedClienteStorage.getAll().find(c => c.id === id);
  }
};

export const syncedVendaStorage = {
  getAll: (): Venda[] => syncedStorage.get<Venda>(STORAGE_KEYS.VENDAS),
  save: (vendas: Venda[]): void => syncedStorage.set(STORAGE_KEYS.VENDAS, vendas),
  add: (venda: Venda): void => {
    const vendas = syncedVendaStorage.getAll();
    vendas.push(venda);
    syncedVendaStorage.save(vendas);
    
    // Atualizar estoque automaticamente para produtos vendidos
    venda.itens.forEach(item => {
      if (item.tipo === 'produto') {
        const produto = syncedProdutoStorage.getById(item.itemId);
        if (produto) {
          const novoEstoque = produto.estoque - item.quantidade;
          syncedProdutoStorage.update({ 
            ...produto, 
            estoque: Math.max(0, novoEstoque) 
          });
          
          // Registrar movimentação de estoque
          const movimentacao: MovimentacaoEstoque = {
            id: crypto.randomUUID(),
            produtoId: item.itemId,
            tipo: 'saida',
            quantidade: item.quantidade,
            motivo: `Venda ${venda.id}`,
            dataMovimento: venda.dataVenda
          };
          syncedMovimentacaoEstoqueStorage.add(movimentacao);
        }
      }
    });
  },
  update: (vendaAtualizada: Venda): void => {
    const vendas = syncedVendaStorage.getAll();
    const index = vendas.findIndex(v => v.id === vendaAtualizada.id);
    if (index >= 0) {
      vendas[index] = vendaAtualizada;
      syncedVendaStorage.save(vendas);
    }
  },
  delete: (id: string): void => {
    const vendas = syncedVendaStorage.getAll().filter(v => v.id !== id);
    syncedVendaStorage.save(vendas);
  },
  getById: (id: string): Venda | undefined => {
    return syncedVendaStorage.getAll().find(v => v.id === id);
  }
};

export const syncedProdutoStorage = {
  getAll: (): Produto[] => syncedStorage.get<Produto>(STORAGE_KEYS.PRODUTOS),
  save: (produtos: Produto[]): void => syncedStorage.set(STORAGE_KEYS.PRODUTOS, produtos),
  add: (produto: Produto): void => {
    const produtos = syncedProdutoStorage.getAll();
    produtos.push(produto);
    syncedProdutoStorage.save(produtos);
  },
  update: (produtoAtualizado: Produto): void => {
    const produtos = syncedProdutoStorage.getAll();
    const index = produtos.findIndex(p => p.id === produtoAtualizado.id);
    if (index >= 0) {
      produtos[index] = produtoAtualizado;
      syncedProdutoStorage.save(produtos);
    }
  },
  delete: (id: string): void => {
    const produtos = syncedProdutoStorage.getAll().filter(p => p.id !== id);
    syncedProdutoStorage.save(produtos);
  },
  getById: (id: string): Produto | undefined => {
    return syncedProdutoStorage.getAll().find(p => p.id === id);
  }
};

export const syncedServicoStorage = {
  getAll: (): Servico[] => syncedStorage.get<Servico>(STORAGE_KEYS.SERVICOS),
  save: (servicos: Servico[]): void => syncedStorage.set(STORAGE_KEYS.SERVICOS, servicos),
  add: (servico: Servico): void => {
    const servicos = syncedServicoStorage.getAll();
    servicos.push(servico);
    syncedServicoStorage.save(servicos);
  },
  update: (servicoAtualizado: Servico): void => {
    const servicos = syncedServicoStorage.getAll();
    const index = servicos.findIndex(s => s.id === servicoAtualizado.id);
    if (index >= 0) {
      servicos[index] = servicoAtualizado;
      syncedServicoStorage.save(servicos);
    }
  },
  delete: (id: string): void => {
    const servicos = syncedServicoStorage.getAll().filter(s => s.id !== id);
    syncedServicoStorage.save(servicos);
  },
  getById: (id: string): Servico | undefined => {
    return syncedServicoStorage.getAll().find(s => s.id === id);
  }
};

export const syncedBarbeiroStorage = {
  getAll: (): Barbeiro[] => syncedStorage.get<Barbeiro>(STORAGE_KEYS.BARBEIROS),
  save: (barbeiros: Barbeiro[]): void => syncedStorage.set(STORAGE_KEYS.BARBEIROS, barbeiros),
  add: (barbeiro: Barbeiro): void => {
    const barbeiros = syncedBarbeiroStorage.getAll();
    barbeiros.push(barbeiro);
    syncedBarbeiroStorage.save(barbeiros);
  },
  update: (barbeiroAtualizado: Barbeiro): void => {
    const barbeiros = syncedBarbeiroStorage.getAll();
    const index = barbeiros.findIndex(b => b.id === barbeiroAtualizado.id);
    if (index >= 0) {
      barbeiros[index] = barbeiroAtualizado;
      syncedBarbeiroStorage.save(barbeiros);
    }
  },
  delete: (id: string): void => {
    const barbeiros = syncedBarbeiroStorage.getAll().filter(b => b.id !== id);
    syncedBarbeiroStorage.save(barbeiros);
  },
  getById: (id: string): Barbeiro | undefined => {
    return syncedBarbeiroStorage.getAll().find(b => b.id === id);
  },
  authenticate: (usuario: string, senha: string): Barbeiro | null => {
    const barbeiro = syncedBarbeiroStorage.getAll().find(b => 
      b.usuario === usuario && b.senha === senha && b.ativo
    );
    return barbeiro || null;
  }
};

export const syncedMovimentacaoEstoqueStorage = {
  getAll: (): MovimentacaoEstoque[] => syncedStorage.get<MovimentacaoEstoque>(STORAGE_KEYS.MOVIMENTACOES_ESTOQUE),
  save: (movimentacoes: MovimentacaoEstoque[]): void => syncedStorage.set(STORAGE_KEYS.MOVIMENTACOES_ESTOQUE, movimentacoes),
  add: (movimentacao: MovimentacaoEstoque): void => {
    const movimentacoes = syncedMovimentacaoEstoqueStorage.getAll();
    movimentacoes.push(movimentacao);
    syncedMovimentacaoEstoqueStorage.save(movimentacoes);
  },
  getByProdutoId: (produtoId: string): MovimentacaoEstoque[] => {
    return syncedMovimentacaoEstoqueStorage.getAll().filter(m => m.produtoId === produtoId);
  }
};

// Re-exportar funções originais para compatibilidade
export {
  clienteStorage,
  vendaStorage,
  produtoStorage,
  servicoStorage,
  barbeiroStorage,
  movimentacaoEstoqueStorage,
  fornecedorStorage,
  historicoStorage,
  authStorage,
  initializeDefaultData
} from './localStorage';