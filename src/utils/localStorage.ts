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

export const STORAGE_KEYS = {
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

// Utilitários genéricos para localStorage
export const storage = {
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
      // Emitir evento customizado para sincronização
      window.dispatchEvent(new CustomEvent('storage_updated', { 
        detail: { key, data } 
      }));
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
      // Emitir evento customizado para sincronização
      window.dispatchEvent(new CustomEvent('storage_updated', { 
        detail: { key, data } 
      }));
    } catch (error) {
      console.error(`Erro ao salvar ${key}:`, error);
    }
  },

  remove: (key: string): void => {
    localStorage.removeItem(key);
  }
};

// Funções específicas para cada entidade
export const clienteStorage = {
  getAll: (): Cliente[] => storage.get<Cliente>(STORAGE_KEYS.CLIENTES),
  save: (clientes: Cliente[]): void => storage.set(STORAGE_KEYS.CLIENTES, clientes),
  add: (cliente: Cliente): void => {
    const clientes = clienteStorage.getAll();
    clientes.push(cliente);
    clienteStorage.save(clientes);
  },
  update: (clienteAtualizado: Cliente): void => {
    const clientes = clienteStorage.getAll();
    const index = clientes.findIndex(c => c.id === clienteAtualizado.id);
    if (index >= 0) {
      clientes[index] = clienteAtualizado;
      clienteStorage.save(clientes);
    }
  },
  delete: (id: string): void => {
    const clientes = clienteStorage.getAll().filter(c => c.id !== id);
    clienteStorage.save(clientes);
  },
  getById: (id: string): Cliente | undefined => {
    return clienteStorage.getAll().find(c => c.id === id);
  }
};

export const barbeiroStorage = {
  getAll: (): Barbeiro[] => storage.get<Barbeiro>(STORAGE_KEYS.BARBEIROS),
  save: (barbeiros: Barbeiro[]): void => storage.set(STORAGE_KEYS.BARBEIROS, barbeiros),
  add: (barbeiro: Barbeiro): void => {
    const barbeiros = barbeiroStorage.getAll();
    barbeiros.push(barbeiro);
    barbeiroStorage.save(barbeiros);
  },
  update: (barbeiroAtualizado: Barbeiro): void => {
    const barbeiros = barbeiroStorage.getAll();
    const index = barbeiros.findIndex(b => b.id === barbeiroAtualizado.id);
    if (index >= 0) {
      barbeiros[index] = barbeiroAtualizado;
      barbeiroStorage.save(barbeiros);
    }
  },
  delete: (id: string): void => {
    const barbeiros = barbeiroStorage.getAll().filter(b => b.id !== id);
    barbeiroStorage.save(barbeiros);
  },
  getById: (id: string): Barbeiro | undefined => {
    return barbeiroStorage.getAll().find(b => b.id === id);
  },
  authenticate: (usuario: string, senha: string): Barbeiro | null => {
    const barbeiro = barbeiroStorage.getAll().find(b => 
      b.usuario === usuario && b.senha === senha && b.ativo
    );
    return barbeiro || null;
  }
};

export const servicoStorage = {
  getAll: (): Servico[] => storage.get<Servico>(STORAGE_KEYS.SERVICOS),
  save: (servicos: Servico[]): void => storage.set(STORAGE_KEYS.SERVICOS, servicos),
  add: (servico: Servico): void => {
    const servicos = servicoStorage.getAll();
    servicos.push(servico);
    servicoStorage.save(servicos);
  },
  update: (servicoAtualizado: Servico): void => {
    const servicos = servicoStorage.getAll();
    const index = servicos.findIndex(s => s.id === servicoAtualizado.id);
    if (index >= 0) {
      servicos[index] = servicoAtualizado;
      servicoStorage.save(servicos);
    }
  },
  delete: (id: string): void => {
    const servicos = servicoStorage.getAll().filter(s => s.id !== id);
    servicoStorage.save(servicos);
  },
  getById: (id: string): Servico | undefined => {
    return servicoStorage.getAll().find(s => s.id === id);
  }
};

export const produtoStorage = {
  getAll: (): Produto[] => storage.get<Produto>(STORAGE_KEYS.PRODUTOS),
  save: (produtos: Produto[]): void => storage.set(STORAGE_KEYS.PRODUTOS, produtos),
  add: (produto: Produto): void => {
    const produtos = produtoStorage.getAll();
    produtos.push(produto);
    produtoStorage.save(produtos);
  },
  update: (produtoAtualizado: Produto): void => {
    const produtos = produtoStorage.getAll();
    const index = produtos.findIndex(p => p.id === produtoAtualizado.id);
    if (index >= 0) {
      produtos[index] = produtoAtualizado;
      produtoStorage.save(produtos);
    }
  },
  delete: (id: string): void => {
    const produtos = produtoStorage.getAll().filter(p => p.id !== id);
    produtoStorage.save(produtos);
  },
  getById: (id: string): Produto | undefined => {
    return produtoStorage.getAll().find(p => p.id === id);
  }
};

export const vendaStorage = {
  getAll: (): Venda[] => storage.get<Venda>(STORAGE_KEYS.VENDAS),
  save: (vendas: Venda[]): void => storage.set(STORAGE_KEYS.VENDAS, vendas),
  add: (venda: Venda): void => {
    const vendas = vendaStorage.getAll();
    vendas.push(venda);
    vendaStorage.save(vendas);
  },
  update: (vendaAtualizada: Venda): void => {
    const vendas = vendaStorage.getAll();
    const index = vendas.findIndex(v => v.id === vendaAtualizada.id);
    if (index >= 0) {
      vendas[index] = vendaAtualizada;
      vendaStorage.save(vendas);
    }
  },
  delete: (id: string): void => {
    const vendas = vendaStorage.getAll().filter(v => v.id !== id);
    vendaStorage.save(vendas);
  },
  getById: (id: string): Venda | undefined => {
    return vendaStorage.getAll().find(v => v.id === id);
  }
};

export const fornecedorStorage = {
  getAll: (): Fornecedor[] => storage.get<Fornecedor>(STORAGE_KEYS.FORNECEDORES),
  save: (fornecedores: Fornecedor[]): void => storage.set(STORAGE_KEYS.FORNECEDORES, fornecedores),
  add: (fornecedor: Fornecedor): void => {
    const fornecedores = fornecedorStorage.getAll();
    fornecedores.push(fornecedor);
    fornecedorStorage.save(fornecedores);
  },
  update: (fornecedorAtualizado: Fornecedor): void => {
    const fornecedores = fornecedorStorage.getAll();
    const index = fornecedores.findIndex(f => f.id === fornecedorAtualizado.id);
    if (index >= 0) {
      fornecedores[index] = fornecedorAtualizado;
      fornecedorStorage.save(fornecedores);
    }
  },
  delete: (id: string): void => {
    const fornecedores = fornecedorStorage.getAll().filter(f => f.id !== id);
    fornecedorStorage.save(fornecedores);
  },
  getById: (id: string): Fornecedor | undefined => {
    return fornecedorStorage.getAll().find(f => f.id === id);
  }
};

export const movimentacaoEstoqueStorage = {
  getAll: (): MovimentacaoEstoque[] => storage.get<MovimentacaoEstoque>(STORAGE_KEYS.MOVIMENTACOES_ESTOQUE),
  save: (movimentacoes: MovimentacaoEstoque[]): void => storage.set(STORAGE_KEYS.MOVIMENTACOES_ESTOQUE, movimentacoes),
  add: (movimentacao: MovimentacaoEstoque): void => {
    const movimentacoes = movimentacaoEstoqueStorage.getAll();
    movimentacoes.push(movimentacao);
    movimentacaoEstoqueStorage.save(movimentacoes);
    
    // Atualizar estoque do produto
    const produto = produtoStorage.getById(movimentacao.produtoId);
    if (produto) {
      const novoEstoque = movimentacao.tipo === 'entrada' 
        ? produto.estoque + movimentacao.quantidade
        : produto.estoque - movimentacao.quantidade;
      
      produtoStorage.update({ ...produto, estoque: Math.max(0, novoEstoque) });
    }
  },
  getByProdutoId: (produtoId: string): MovimentacaoEstoque[] => {
    return movimentacaoEstoqueStorage.getAll().filter(m => m.produtoId === produtoId);
  }
};

export const historicoStorage = {
  getAll: (): HistoricoAtendimento[] => storage.get<HistoricoAtendimento>(STORAGE_KEYS.HISTORICO),
  save: (historico: HistoricoAtendimento[]): void => storage.set(STORAGE_KEYS.HISTORICO, historico),
  add: (item: HistoricoAtendimento): void => {
    const historico = historicoStorage.getAll();
    historico.push(item);
    historicoStorage.save(historico);
  },
  getByClienteId: (clienteId: string): HistoricoAtendimento[] => {
    return historicoStorage.getAll().filter(h => h.clienteId === clienteId);
  },
  getByBarbeiroId: (barbeiroId: string): HistoricoAtendimento[] => {
    return historicoStorage.getAll().filter(h => h.barbeiroId === barbeiroId);
  }
};

export const authStorage = {
  setUsuarioLogado: (usuario: UsuarioLogado): void => {
    storage.setSingle(STORAGE_KEYS.USUARIO_LOGADO, usuario);
  },
  getUsuarioLogado: (): UsuarioLogado | null => {
    return storage.getSingle<UsuarioLogado>(STORAGE_KEYS.USUARIO_LOGADO);
  },
  logout: (): void => {
    storage.remove(STORAGE_KEYS.USUARIO_LOGADO);
  }
};

// Função para inicializar dados padrão
export const initializeDefaultData = (): void => {
  // Criar usuários específicos se não existirem
  const barbeiros = barbeiroStorage.getAll();
  if (barbeiros.length === 0) {
    const usuariosDefault: Barbeiro[] = [
      {
        id: 'igor-001',
        nome: 'Igor Bezerra de Queiroz',
        usuario: 'Igor',
        senha: '123456',
        telefone: '(85) 99999-0001',
        email: 'igor@barbearia.com',
        horarioTrabalho: {
          segunda: { inicio: '08:00', fim: '18:00', ativo: true },
          terca: { inicio: '08:00', fim: '18:00', ativo: true },
          quarta: { inicio: '08:00', fim: '18:00', ativo: true },
          quinta: { inicio: '08:00', fim: '18:00', ativo: true },
          sexta: { inicio: '08:00', fim: '18:00', ativo: true },
          sabado: { inicio: '08:00', fim: '16:00', ativo: true },
          domingo: { inicio: '08:00', fim: '14:00', ativo: false },
        },
        comissaoServicos: 0, // Proprietário não recebe comissão
        comissaoProdutos: 0,
        dataCadastro: new Date().toISOString(),
        ativo: true,
        nivel: 'administrador',
        isProprietario: true
      },
      {
        id: 'mickael-001',
        nome: 'Douglas Mickael Queiroz da Silva',
        usuario: 'mickael',
        senha: '654321',
        telefone: '(85) 99999-0002',
        email: 'mickael@barbearia.com',
        horarioTrabalho: {
          segunda: { inicio: '08:00', fim: '18:00', ativo: true },
          terca: { inicio: '08:00', fim: '18:00', ativo: true },
          quarta: { inicio: '08:00', fim: '18:00', ativo: true },
          quinta: { inicio: '08:00', fim: '18:00', ativo: true },
          sexta: { inicio: '08:00', fim: '18:00', ativo: true },
          sabado: { inicio: '08:00', fim: '16:00', ativo: true },
          domingo: { inicio: '08:00', fim: '14:00', ativo: false },
        },
        comissaoServicos: 50,
        comissaoProdutos: 20,
        dataCadastro: new Date().toISOString(),
        ativo: true,
        nivel: 'colaborador',
        isProprietario: false
      }
    ];
    usuariosDefault.forEach(barbeiro => barbeiroStorage.add(barbeiro));
  }

  // Criar serviços padrão se não existirem
  const servicos = servicoStorage.getAll();
  if (servicos.length === 0) {
    const servicosDefault: Servico[] = [
      {
        id: 'servico-1',
        nome: 'Corte Masculino',
        descricao: 'Corte tradicional masculino',
        preco: 25,
        ativo: true,
        categoria: 'corte',
        dataCadastro: new Date().toISOString()
      },
      {
        id: 'servico-2',
        nome: 'Barba Completa',
        descricao: 'Corte e modelagem de barba com acabamento',
        preco: 20,
        ativo: true,
        categoria: 'barba',
        dataCadastro: new Date().toISOString()
      },
      {
        id: 'servico-3',
        nome: 'Combo Corte + Barba',
        descricao: 'Pacote completo com corte e barba',
        preco: 40,
        ativo: true,
        categoria: 'combo',
        pacote: {
          servicoIds: ['servico-1', 'servico-2'],
          desconto: 11.11 // (25+20)*0.1111 = 5 de desconto
        },
        dataCadastro: new Date().toISOString()
      },
      {
        id: 'servico-4',
        nome: 'Sobrancelha Masculina',
        descricao: 'Aparar e modelar sobrancelha',
        preco: 15,
        ativo: true,
        categoria: 'sobrancelha',
        dataCadastro: new Date().toISOString()
      }
    ];
    servicos.forEach(servico => servicoStorage.add(servico));
  }

  // Criar clientes de exemplo se não existirem
  const clientes = clienteStorage.getAll();
  if (clientes.length === 0) {
    const clientesDefault: Cliente[] = [
      {
        id: 'cliente-1',
        nome: 'João Silva',
        telefone: '(11) 99999-0001',
        email: 'joao@email.com',
        aniversario: '1990-05-15',
        preferencias: {
          corteFavorito: 'Degradê baixo',
          barbeiroPreferido: 'Igor',
          observacoes: 'Corte baixo nas laterais'
        },
        observacoes: 'Cliente pontual',
        pontosFidelidade: 25,
        dataCadastro: new Date().toISOString(),
        status: 'ativo'
      },
      {
        id: 'cliente-2',
        nome: 'Maria Santos',
        telefone: '(11) 99999-0002',
        email: 'maria@email.com',
        aniversario: '1985-08-22',
        preferencias: {
          corteFavorito: 'Corte feminino',
          barbeiroPreferido: 'Igor',
          observacoes: 'Barba bem aparada'
        },
        observacoes: 'Gosta de conversar sobre futebol',
        pontosFidelidade: 15,
        dataCadastro: new Date().toISOString(),
        status: 'ativo'
      }
    ];
    clientes.forEach(cliente => clienteStorage.add(cliente));
  }
};
