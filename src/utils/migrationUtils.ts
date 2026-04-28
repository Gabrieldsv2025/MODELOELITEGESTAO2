import { 
  supabaseClienteStorage,
  supabaseBarbeiroStorage,
  supabaseServicoStorage,
  supabaseProdutoStorage,
  supabaseVendaStorage
} from './supabaseStorage';
import { STORAGE_KEYS } from './localStorage';
import { Cliente, Barbeiro, Servico, Produto, Venda } from '@/types';

// Função para verificar se há dados no localStorage
export const checkLocalStorageData = () => {
  const hasClientes = localStorage.getItem(STORAGE_KEYS.CLIENTES);
  const hasBarbeiros = localStorage.getItem(STORAGE_KEYS.BARBEIROS);
  const hasServicos = localStorage.getItem(STORAGE_KEYS.SERVICOS);
  const hasProdutos = localStorage.getItem(STORAGE_KEYS.PRODUTOS);
  const hasVendas = localStorage.getItem(STORAGE_KEYS.VENDAS);

  return {
    hasClientes: !!hasClientes && JSON.parse(hasClientes).length > 0,
    hasBarbeiros: !!hasBarbeiros && JSON.parse(hasBarbeiros).length > 0,
    hasServicos: !!hasServicos && JSON.parse(hasServicos).length > 0,
    hasProdutos: !!hasProdutos && JSON.parse(hasProdutos).length > 0,
    hasVendas: !!hasVendas && JSON.parse(hasVendas).length > 0,
  };
};

// Função para migrar todos os dados do localStorage para o Supabase
export const migrateLocalStorageToSupabase = async () => {
  const results = {
    clientes: 0,
    barbeiros: 0,
    servicos: 0,
    produtos: 0,
    vendas: 0,
    errors: [] as string[]
  };

  try {
    // Migrar clientes
    const clientesData = localStorage.getItem(STORAGE_KEYS.CLIENTES);
    if (clientesData) {
      const clientes: Cliente[] = JSON.parse(clientesData);
      for (const cliente of clientes) {
        try {
          await supabaseClienteStorage.add(cliente);
          results.clientes++;
        } catch (error) {
          console.error('Erro ao migrar cliente:', error);
          results.errors.push(`Cliente ${cliente.nome}: ${error}`);
        }
      }
      localStorage.removeItem(STORAGE_KEYS.CLIENTES);
    }

    // Migrar barbeiros
    const barbeirosData = localStorage.getItem(STORAGE_KEYS.BARBEIROS);
    if (barbeirosData) {
      const barbeiros: Barbeiro[] = JSON.parse(barbeirosData);
      for (const barbeiro of barbeiros) {
        try {
          await supabaseBarbeiroStorage.add(barbeiro);
          results.barbeiros++;
        } catch (error) {
          console.error('Erro ao migrar barbeiro:', error);
          results.errors.push(`Barbeiro ${barbeiro.nome}: ${error}`);
        }
      }
      localStorage.removeItem(STORAGE_KEYS.BARBEIROS);
    }

    // Migrar serviços
    const servicosData = localStorage.getItem(STORAGE_KEYS.SERVICOS);
    if (servicosData) {
      const servicos: Servico[] = JSON.parse(servicosData);
      for (const servico of servicos) {
        try {
          await supabaseServicoStorage.add(servico);
          results.servicos++;
        } catch (error) {
          console.error('Erro ao migrar serviço:', error);
          results.errors.push(`Serviço ${servico.nome}: ${error}`);
        }
      }
      localStorage.removeItem(STORAGE_KEYS.SERVICOS);
    }

    // Migrar produtos
    const produtosData = localStorage.getItem(STORAGE_KEYS.PRODUTOS);
    if (produtosData) {
      const produtos: Produto[] = JSON.parse(produtosData);
      for (const produto of produtos) {
        try {
          await supabaseProdutoStorage.add(produto);
          results.produtos++;
        } catch (error) {
          console.error('Erro ao migrar produto:', error);
          results.errors.push(`Produto ${produto.nome}: ${error}`);
        }
      }
      localStorage.removeItem(STORAGE_KEYS.PRODUTOS);
    }

    // Migrar vendas
    const vendasData = localStorage.getItem(STORAGE_KEYS.VENDAS);
    if (vendasData) {
      const vendas: Venda[] = JSON.parse(vendasData);
      for (const venda of vendas) {
        try {
          await supabaseVendaStorage.add(venda);
          results.vendas++;
        } catch (error) {
          console.error('Erro ao migrar venda:', error);
          results.errors.push(`Venda ${venda.id}: ${error}`);
        }
      }
      localStorage.removeItem(STORAGE_KEYS.VENDAS);
    }

    return results;
  } catch (error) {
    console.error('Erro geral na migração:', error);
    results.errors.push(`Erro geral: ${error}`);
    return results;
  }
};

// Função para limpar localStorage de dados antigos
export const cleanOldLocalStorage = () => {
  const keysToRemove = [
    STORAGE_KEYS.CLIENTES,
    STORAGE_KEYS.BARBEIROS,
    STORAGE_KEYS.SERVICOS,
    STORAGE_KEYS.PRODUTOS,
    STORAGE_KEYS.VENDAS,
    STORAGE_KEYS.HISTORICO,
    STORAGE_KEYS.COMISSOES
  ];

  keysToRemove.forEach(key => {
    localStorage.removeItem(key);
  });

  console.log('localStorage limpo dos dados antigos');
};