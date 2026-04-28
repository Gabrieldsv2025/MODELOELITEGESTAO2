export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      atualizar: {
        Row: {
          created_at: string
          id: number
          numero: number | null
        }
        Insert: {
          created_at?: string
          id?: number
          numero?: number | null
        }
        Update: {
          created_at?: string
          id?: number
          numero?: number | null
        }
        Relationships: []
      }
      barbeiros: {
        Row: {
          ativo: boolean
          auth_user_id: string | null
          comissao_produtos: number
          comissao_servicos: number
          created_at: string
          data_cadastro: string
          email: string | null
          empresa_id: string
          foto_perfil_url: string | null
          horario_trabalho: Json | null
          id: string
          intervalo_agenda_minutos: number
          is_proprietario: boolean
          nivel: string
          nome: string
          senha: string
          senha_hash: string | null
          telefone: string | null
          updated_at: string
          usuario: string
        }
        Insert: {
          ativo?: boolean
          auth_user_id?: string | null
          comissao_produtos?: number
          comissao_servicos?: number
          created_at?: string
          data_cadastro?: string
          email?: string | null
          empresa_id: string
          foto_perfil_url?: string | null
          horario_trabalho?: Json | null
          id?: string
          intervalo_agenda_minutos?: number
          is_proprietario?: boolean
          nivel?: string
          nome: string
          senha: string
          senha_hash?: string | null
          telefone?: string | null
          updated_at?: string
          usuario: string
        }
        Update: {
          ativo?: boolean
          auth_user_id?: string | null
          comissao_produtos?: number
          comissao_servicos?: number
          created_at?: string
          data_cadastro?: string
          email?: string | null
          empresa_id?: string
          foto_perfil_url?: string | null
          horario_trabalho?: Json | null
          id?: string
          intervalo_agenda_minutos?: number
          is_proprietario?: boolean
          nivel?: string
          nome?: string
          senha?: string
          senha_hash?: string | null
          telefone?: string | null
          updated_at?: string
          usuario?: string
        }
        Relationships: [
          {
            foreignKeyName: "barbeiros_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      clientes: {
        Row: {
          aniversario: string | null
          created_at: string
          data_cadastro: string
          email: string | null
          empresa_id: string | null
          id: string
          nome: string
          observacoes: string | null
          pontos_fidelidade: number
          preferencias: Json | null
          status: string
          telefone: string
          ultimo_atendimento: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          aniversario?: string | null
          created_at?: string
          data_cadastro?: string
          email?: string | null
          empresa_id?: string | null
          id?: string
          nome: string
          observacoes?: string | null
          pontos_fidelidade?: number
          preferencias?: Json | null
          status?: string
          telefone: string
          ultimo_atendimento?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          aniversario?: string | null
          created_at?: string
          data_cadastro?: string
          email?: string | null
          empresa_id?: string | null
          id?: string
          nome?: string
          observacoes?: string | null
          pontos_fidelidade?: number
          preferencias?: Json | null
          status?: string
          telefone?: string
          ultimo_atendimento?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clientes_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      comissoes_historico: {
        Row: {
          barbeiro_id: string
          created_at: string
          empresa_id: string | null
          id: string
          item_id: string
          item_tipo: string
          percentual_comissao: number
          valor_comissao: number
          venda_id: string
        }
        Insert: {
          barbeiro_id: string
          created_at?: string
          empresa_id?: string | null
          id?: string
          item_id: string
          item_tipo: string
          percentual_comissao: number
          valor_comissao: number
          venda_id: string
        }
        Update: {
          barbeiro_id?: string
          created_at?: string
          empresa_id?: string | null
          id?: string
          item_id?: string
          item_tipo?: string
          percentual_comissao?: number
          valor_comissao?: number
          venda_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comissoes_historico_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comissoes_historico_venda_id_fkey"
            columns: ["venda_id"]
            isOneToOne: false
            referencedRelation: "vendas"
            referencedColumns: ["id"]
          },
        ]
      }
      comissoes_historico_auditoria: {
        Row: {
          barbeiro_id: string
          comissao_id: string
          created_at: string
          empresa_id: string | null
          id: string
          item_id: string
          item_tipo: string
          motivo: string
          percentual_anterior: number
          percentual_novo: number
          valor_anterior: number
          valor_novo: number
          venda_id: string
        }
        Insert: {
          barbeiro_id: string
          comissao_id: string
          created_at?: string
          empresa_id?: string | null
          id?: string
          item_id: string
          item_tipo: string
          motivo: string
          percentual_anterior: number
          percentual_novo: number
          valor_anterior: number
          valor_novo: number
          venda_id: string
        }
        Update: {
          barbeiro_id?: string
          comissao_id?: string
          created_at?: string
          empresa_id?: string | null
          id?: string
          item_id?: string
          item_tipo?: string
          motivo?: string
          percentual_anterior?: number
          percentual_novo?: number
          valor_anterior?: number
          valor_novo?: number
          venda_id?: string
        }
        Relationships: []
      }
      configuracoes_comissao: {
        Row: {
          barbeiro_id: string
          created_at: string
          empresa_id: string | null
          id: string
          percentual: number
          produto_id: string | null
          servico_id: string | null
          tipo: string
          updated_at: string
        }
        Insert: {
          barbeiro_id: string
          created_at?: string
          empresa_id?: string | null
          id?: string
          percentual: number
          produto_id?: string | null
          servico_id?: string | null
          tipo: string
          updated_at?: string
        }
        Update: {
          barbeiro_id?: string
          created_at?: string
          empresa_id?: string | null
          id?: string
          percentual?: number
          produto_id?: string | null
          servico_id?: string | null
          tipo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "configuracoes_comissao_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "configuracoes_comissao_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "configuracoes_comissao_servico_id_fkey"
            columns: ["servico_id"]
            isOneToOne: false
            referencedRelation: "servicos"
            referencedColumns: ["id"]
          },
        ]
      }
      configuracoes_sistema: {
        Row: {
          chave: string
          created_at: string | null
          descricao: string | null
          empresa_id: string | null
          id: string
          tipo_dado: string
          updated_at: string | null
          valor: string
        }
        Insert: {
          chave: string
          created_at?: string | null
          descricao?: string | null
          empresa_id?: string | null
          id?: string
          tipo_dado?: string
          updated_at?: string | null
          valor: string
        }
        Update: {
          chave?: string
          created_at?: string | null
          descricao?: string | null
          empresa_id?: string | null
          id?: string
          tipo_dado?: string
          updated_at?: string | null
          valor?: string
        }
        Relationships: [
          {
            foreignKeyName: "configuracoes_sistema_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      contas_receber: {
        Row: {
          barbeiro_id: string
          cliente_id: string
          created_at: string
          data_quitacao: string | null
          empresa_id: string | null
          id: string
          saldo_devedor: number
          status: string
          updated_at: string
          valor_pago: number
          valor_total_venda: number
          venda_id: string
        }
        Insert: {
          barbeiro_id: string
          cliente_id: string
          created_at?: string
          data_quitacao?: string | null
          empresa_id?: string | null
          id?: string
          saldo_devedor: number
          status?: string
          updated_at?: string
          valor_pago?: number
          valor_total_venda: number
          venda_id: string
        }
        Update: {
          barbeiro_id?: string
          cliente_id?: string
          created_at?: string
          data_quitacao?: string | null
          empresa_id?: string | null
          id?: string
          saldo_devedor?: number
          status?: string
          updated_at?: string
          valor_pago?: number
          valor_total_venda?: number
          venda_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contas_receber_barbeiro_id_fkey"
            columns: ["barbeiro_id"]
            isOneToOne: false
            referencedRelation: "barbeiros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contas_receber_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contas_receber_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contas_receber_venda_id_fkey"
            columns: ["venda_id"]
            isOneToOne: false
            referencedRelation: "vendas"
            referencedColumns: ["id"]
          },
        ]
      }
      despesas: {
        Row: {
          barbeiro_id: string | null
          categoria: string
          created_at: string | null
          data_despesa: string
          data_pagamento: string | null
          descricao: string
          empresa_id: string | null
          forma_pagamento: string
          fornecedor: string | null
          id: string
          is_recurring: boolean | null
          observacao: string | null
          recurrence_end_date: string | null
          recurring_group_id: string | null
          status: string
          status_pagamento: string | null
          updated_at: string | null
          valor: number
        }
        Insert: {
          barbeiro_id?: string | null
          categoria: string
          created_at?: string | null
          data_despesa: string
          data_pagamento?: string | null
          descricao: string
          empresa_id?: string | null
          forma_pagamento: string
          fornecedor?: string | null
          id?: string
          is_recurring?: boolean | null
          observacao?: string | null
          recurrence_end_date?: string | null
          recurring_group_id?: string | null
          status?: string
          status_pagamento?: string | null
          updated_at?: string | null
          valor: number
        }
        Update: {
          barbeiro_id?: string | null
          categoria?: string
          created_at?: string | null
          data_despesa?: string
          data_pagamento?: string | null
          descricao?: string
          empresa_id?: string | null
          forma_pagamento?: string
          fornecedor?: string | null
          id?: string
          is_recurring?: boolean | null
          observacao?: string | null
          recurrence_end_date?: string | null
          recurring_group_id?: string | null
          status?: string
          status_pagamento?: string | null
          updated_at?: string | null
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "despesas_barbeiro_id_fkey"
            columns: ["barbeiro_id"]
            isOneToOne: false
            referencedRelation: "barbeiros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "despesas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      empresas: {
        Row: {
          ativo: boolean
          cep: string | null
          cidade: string | null
          cnpj: string | null
          configuracoes: Json | null
          created_at: string | null
          data_expiracao: string | null
          email: string | null
          endereco: string | null
          estado: string | null
          id: string
          logo_url: string | null
          nome: string
          plano: string | null
          slug: string
          telefone: string | null
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean
          cep?: string | null
          cidade?: string | null
          cnpj?: string | null
          configuracoes?: Json | null
          created_at?: string | null
          data_expiracao?: string | null
          email?: string | null
          endereco?: string | null
          estado?: string | null
          id?: string
          logo_url?: string | null
          nome: string
          plano?: string | null
          slug: string
          telefone?: string | null
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean
          cep?: string | null
          cidade?: string | null
          cnpj?: string | null
          configuracoes?: Json | null
          created_at?: string | null
          data_expiracao?: string | null
          email?: string | null
          endereco?: string | null
          estado?: string | null
          id?: string
          logo_url?: string | null
          nome?: string
          plano?: string | null
          slug?: string
          telefone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      fornecedores: {
        Row: {
          ativo: boolean
          cnpj: string | null
          created_at: string
          data_cadastro: string
          email: string | null
          empresa_id: string | null
          endereco: string | null
          id: string
          nome: string
          telefone: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          ativo?: boolean
          cnpj?: string | null
          created_at?: string
          data_cadastro?: string
          email?: string | null
          empresa_id?: string | null
          endereco?: string | null
          id?: string
          nome: string
          telefone?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          ativo?: boolean
          cnpj?: string | null
          created_at?: string
          data_cadastro?: string
          email?: string | null
          empresa_id?: string | null
          endereco?: string | null
          id?: string
          nome?: string
          telefone?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fornecedores_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      historico_atendimentos: {
        Row: {
          barbeiro_id: string
          cliente_id: string
          created_at: string
          data_atendimento: string
          empresa_id: string | null
          id: string
          observacoes: string | null
          produtos: Json | null
          servicos: Json | null
          total: number
          venda_id: string
        }
        Insert: {
          barbeiro_id: string
          cliente_id: string
          created_at?: string
          data_atendimento?: string
          empresa_id?: string | null
          id?: string
          observacoes?: string | null
          produtos?: Json | null
          servicos?: Json | null
          total: number
          venda_id: string
        }
        Update: {
          barbeiro_id?: string
          cliente_id?: string
          created_at?: string
          data_atendimento?: string
          empresa_id?: string | null
          id?: string
          observacoes?: string | null
          produtos?: Json | null
          servicos?: Json | null
          total?: number
          venda_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "historico_atendimentos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "historico_atendimentos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "historico_atendimentos_venda_id_fkey"
            columns: ["venda_id"]
            isOneToOne: false
            referencedRelation: "vendas"
            referencedColumns: ["id"]
          },
        ]
      }
      indicadores_financeiros: {
        Row: {
          ano_referencia: number
          created_at: string | null
          custo_produtos: number
          empresa_id: string | null
          faturamento_bruto: number
          faturamento_liquido: number
          id: string
          lucro_bruto: number
          lucro_liquido: number
          margem_bruta: number
          margem_liquida: number
          mes_referencia: number
          numero_vendas: number
          ticket_medio: number
          total_comissoes: number
          total_despesas: number
          updated_at: string | null
        }
        Insert: {
          ano_referencia: number
          created_at?: string | null
          custo_produtos?: number
          empresa_id?: string | null
          faturamento_bruto?: number
          faturamento_liquido?: number
          id?: string
          lucro_bruto?: number
          lucro_liquido?: number
          margem_bruta?: number
          margem_liquida?: number
          mes_referencia: number
          numero_vendas?: number
          ticket_medio?: number
          total_comissoes?: number
          total_despesas?: number
          updated_at?: string | null
        }
        Update: {
          ano_referencia?: number
          created_at?: string | null
          custo_produtos?: number
          empresa_id?: string | null
          faturamento_bruto?: number
          faturamento_liquido?: number
          id?: string
          lucro_bruto?: number
          lucro_liquido?: number
          margem_bruta?: number
          margem_liquida?: number
          mes_referencia?: number
          numero_vendas?: number
          ticket_medio?: number
          total_comissoes?: number
          total_despesas?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "indicadores_financeiros_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      insumos: {
        Row: {
          ativo: boolean
          created_at: string
          custo_total_compra: number
          custo_unitario: number
          descricao: string | null
          empresa_id: string | null
          estoque_minimo_alerta: number
          id: string
          nome: string
          quantidade_compra: number
          quantidade_estoque: number
          unidade_medida: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          custo_total_compra?: number
          custo_unitario?: number
          descricao?: string | null
          empresa_id?: string | null
          estoque_minimo_alerta?: number
          id?: string
          nome: string
          quantidade_compra?: number
          quantidade_estoque?: number
          unidade_medida: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          custo_total_compra?: number
          custo_unitario?: number
          descricao?: string | null
          empresa_id?: string | null
          estoque_minimo_alerta?: number
          id?: string
          nome?: string
          quantidade_compra?: number
          quantidade_estoque?: number
          unidade_medida?: string
          updated_at?: string
        }
        Relationships: []
      }
      itens_venda: {
        Row: {
          created_at: string
          custo_cmv: number | null
          empresa_id: string | null
          id: string
          item_id: string
          nome: string
          preco: number
          quantidade: number
          subtotal: number
          tipo: string
          venda_id: string
        }
        Insert: {
          created_at?: string
          custo_cmv?: number | null
          empresa_id?: string | null
          id?: string
          item_id: string
          nome: string
          preco: number
          quantidade?: number
          subtotal: number
          tipo: string
          venda_id: string
        }
        Update: {
          created_at?: string
          custo_cmv?: number | null
          empresa_id?: string | null
          id?: string
          item_id?: string
          nome?: string
          preco?: number
          quantidade?: number
          subtotal?: number
          tipo?: string
          venda_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "itens_venda_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "itens_venda_venda_id_fkey"
            columns: ["venda_id"]
            isOneToOne: false
            referencedRelation: "vendas"
            referencedColumns: ["id"]
          },
        ]
      }
      movimentacoes_estoque: {
        Row: {
          created_at: string
          data_movimento: string
          empresa_id: string | null
          id: string
          motivo: string
          observacoes: string | null
          preco_unitario: number | null
          produto_id: string
          quantidade: number
          tipo: string
        }
        Insert: {
          created_at?: string
          data_movimento?: string
          empresa_id?: string | null
          id?: string
          motivo: string
          observacoes?: string | null
          preco_unitario?: number | null
          produto_id: string
          quantidade: number
          tipo: string
        }
        Update: {
          created_at?: string
          data_movimento?: string
          empresa_id?: string | null
          id?: string
          motivo?: string
          observacoes?: string | null
          preco_unitario?: number | null
          produto_id?: string
          quantidade?: number
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "movimentacoes_estoque_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimentacoes_estoque_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      movimentacoes_insumos: {
        Row: {
          created_at: string
          custo_unitario: number | null
          data_movimento: string
          empresa_id: string | null
          id: string
          insumo_id: string
          motivo: string
          observacoes: string | null
          quantidade: number
          tipo: string
        }
        Insert: {
          created_at?: string
          custo_unitario?: number | null
          data_movimento?: string
          empresa_id?: string | null
          id?: string
          insumo_id: string
          motivo: string
          observacoes?: string | null
          quantidade: number
          tipo: string
        }
        Update: {
          created_at?: string
          custo_unitario?: number | null
          data_movimento?: string
          empresa_id?: string | null
          id?: string
          insumo_id?: string
          motivo?: string
          observacoes?: string | null
          quantidade?: number
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "movimentacoes_insumos_insumo_id_fkey"
            columns: ["insumo_id"]
            isOneToOne: false
            referencedRelation: "insumos"
            referencedColumns: ["id"]
          },
        ]
      }
      pagamentos_venda: {
        Row: {
          created_at: string
          empresa_id: string | null
          forma_pagamento: string
          id: string
          valor: number
          venda_id: string
        }
        Insert: {
          created_at?: string
          empresa_id?: string | null
          forma_pagamento: string
          id?: string
          valor: number
          venda_id: string
        }
        Update: {
          created_at?: string
          empresa_id?: string | null
          forma_pagamento?: string
          id?: string
          valor?: number
          venda_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pagamentos_venda_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pagamentos_venda_venda_id_fkey"
            columns: ["venda_id"]
            isOneToOne: false
            referencedRelation: "vendas"
            referencedColumns: ["id"]
          },
        ]
      }
      produtos: {
        Row: {
          ativo: boolean
          categoria: string
          created_at: string
          data_cadastro: string
          descricao: string | null
          empresa_id: string | null
          estoque: number
          estoque_minimo: number
          fornecedor_id: string | null
          id: string
          is_composto: boolean
          nome: string
          preco_compra: number
          preco_venda: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          ativo?: boolean
          categoria: string
          created_at?: string
          data_cadastro?: string
          descricao?: string | null
          empresa_id?: string | null
          estoque?: number
          estoque_minimo?: number
          fornecedor_id?: string | null
          id?: string
          is_composto?: boolean
          nome: string
          preco_compra: number
          preco_venda: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          ativo?: boolean
          categoria?: string
          created_at?: string
          data_cadastro?: string
          descricao?: string | null
          empresa_id?: string | null
          estoque?: number
          estoque_minimo?: number
          fornecedor_id?: string | null
          id?: string
          is_composto?: boolean
          nome?: string
          preco_compra?: number
          preco_venda?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "produtos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "produtos_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
        ]
      }
      produtos_receitas: {
        Row: {
          created_at: string
          empresa_id: string | null
          id: string
          insumo_id: string
          produto_id: string
          quantidade_utilizada: number
        }
        Insert: {
          created_at?: string
          empresa_id?: string | null
          id?: string
          insumo_id: string
          produto_id: string
          quantidade_utilizada: number
        }
        Update: {
          created_at?: string
          empresa_id?: string | null
          id?: string
          insumo_id?: string
          produto_id?: string
          quantidade_utilizada?: number
        }
        Relationships: [
          {
            foreignKeyName: "produtos_receitas_insumo_id_fkey"
            columns: ["insumo_id"]
            isOneToOne: false
            referencedRelation: "insumos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "produtos_receitas_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      promocoes: {
        Row: {
          ativo: boolean
          created_at: string
          descricao: string | null
          dias_semana: number[]
          empresa_id: string | null
          id: string
          nome: string
          percentual: number
          tipo: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          dias_semana?: number[]
          empresa_id?: string | null
          id?: string
          nome: string
          percentual: number
          tipo: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          dias_semana?: number[]
          empresa_id?: string | null
          id?: string
          nome?: string
          percentual?: number
          tipo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "promocoes_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      promocoes_produtos_servicos: {
        Row: {
          ativo: boolean
          created_at: string
          empresa_id: string | null
          id: string
          item_id: string
          item_tipo: string
          preco_original: number
          preco_promocional: number
          promocao_id: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          empresa_id?: string | null
          id?: string
          item_id: string
          item_tipo: string
          preco_original: number
          preco_promocional: number
          promocao_id: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          empresa_id?: string | null
          id?: string
          item_id?: string
          item_tipo?: string
          preco_original?: number
          preco_promocional?: number
          promocao_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "promocoes_produtos_servicos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      servicos: {
        Row: {
          ativo: boolean
          barbeiro_ids: Json | null
          categoria: string
          comissao_personalizada: Json | null
          created_at: string
          data_cadastro: string
          descricao: string | null
          duracao_minutos: number | null
          empresa_id: string | null
          id: string
          nome: string
          pacote: Json | null
          preco: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          ativo?: boolean
          barbeiro_ids?: Json | null
          categoria: string
          comissao_personalizada?: Json | null
          created_at?: string
          data_cadastro?: string
          descricao?: string | null
          duracao_minutos?: number | null
          empresa_id?: string | null
          id?: string
          nome: string
          pacote?: Json | null
          preco: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          ativo?: boolean
          barbeiro_ids?: Json | null
          categoria?: string
          comissao_personalizada?: Json | null
          created_at?: string
          data_cadastro?: string
          descricao?: string | null
          duracao_minutos?: number | null
          empresa_id?: string | null
          id?: string
          nome?: string
          pacote?: Json | null
          preco?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "servicos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      user_permissions: {
        Row: {
          can_admin: boolean | null
          can_delete: boolean | null
          can_read: boolean | null
          can_write: boolean | null
          created_at: string | null
          empresa_id: string | null
          has_access: boolean | null
          id: string
          module_name: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          can_admin?: boolean | null
          can_delete?: boolean | null
          can_read?: boolean | null
          can_write?: boolean | null
          created_at?: string | null
          empresa_id?: string | null
          has_access?: boolean | null
          id?: string
          module_name: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          can_admin?: boolean | null
          can_delete?: boolean | null
          can_read?: boolean | null
          can_write?: boolean | null
          created_at?: string | null
          empresa_id?: string | null
          has_access?: boolean | null
          id?: string
          module_name?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_permissions_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      usuarios_empresas: {
        Row: {
          ativo: boolean | null
          barbeiro_id: string
          created_at: string | null
          empresa_id: string
          id: string
          is_owner: boolean | null
        }
        Insert: {
          ativo?: boolean | null
          barbeiro_id: string
          created_at?: string | null
          empresa_id: string
          id?: string
          is_owner?: boolean | null
        }
        Update: {
          ativo?: boolean | null
          barbeiro_id?: string
          created_at?: string | null
          empresa_id?: string
          id?: string
          is_owner?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "usuarios_empresas_barbeiro_id_fkey"
            columns: ["barbeiro_id"]
            isOneToOne: false
            referencedRelation: "barbeiros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "usuarios_empresas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      vendas: {
        Row: {
          barbeiro_id: string
          cliente_id: string
          created_at: string
          data_atualizacao: string
          data_venda: string
          desconto: number | null
          empresa_id: string | null
          forma_pagamento: string
          horario_atendimento: string | null
          id: string
          observacoes: string | null
          status: string
          total: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          barbeiro_id: string
          cliente_id: string
          created_at?: string
          data_atualizacao?: string
          data_venda?: string
          desconto?: number | null
          empresa_id?: string | null
          forma_pagamento: string
          horario_atendimento?: string | null
          id?: string
          observacoes?: string | null
          status?: string
          total: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          barbeiro_id?: string
          cliente_id?: string
          created_at?: string
          data_atualizacao?: string
          data_venda?: string
          desconto?: number | null
          empresa_id?: string | null
          forma_pagamento?: string
          horario_atendimento?: string | null
          id?: string
          observacoes?: string | null
          status?: string
          total?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vendas_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calcular_cmv_item: {
        Args: { p_item_id: string; p_quantidade: number; p_tipo: string }
        Returns: number
      }
      change_barbeiro_password: {
        Args: {
          barbeiro_id: string
          current_password: string
          new_password: string
        }
        Returns: Json
      }
      create_auth_user_for_barbeiro: {
        Args: {
          barbeiro_id_input: string
          email_input: string
          senha_input: string
        }
        Returns: Json
      }
      criar_nova_barbearia: {
        Args: {
          p_empresa_email: string
          p_empresa_nome: string
          p_empresa_slug: string
          p_empresa_telefone: string
          p_proprietario_email: string
          p_proprietario_nome: string
          p_proprietario_senha: string
          p_proprietario_telefone: string
          p_proprietario_usuario: string
        }
        Returns: Json
      }
      dar_baixa_insumos_venda: { Args: { p_venda_id: string }; Returns: Json }
      estornar_estoque_por_venda: {
        Args: { p_empresa_id?: string; p_venda_id: string }
        Returns: Json
      }
      excluir_venda_com_estorno: { Args: { p_venda_id: string }; Returns: Json }
      get_current_barbeiro_id: { Args: never; Returns: string }
      get_current_barbeiro_role: { Args: never; Returns: string }
      get_current_empresa_id: { Args: never; Returns: string }
      has_submodule_permission: {
        Args: { p_module_path: string; p_user_id: string }
        Returns: boolean
      }
      hash_password: { Args: { password_text: string }; Returns: string }
      inserir_itens_venda: { Args: { p_itens: Json }; Returns: undefined }
      inserir_venda: {
        Args: { p_barbeiro_id: string; p_venda_data: Json }
        Returns: string
      }
      is_admin: { Args: { user_uuid?: string }; Returns: boolean }
      log_activity: {
        Args: {
          p_action: string
          p_details?: Json
          p_resource_id?: string
          p_resource_type?: string
          p_user_id: string
        }
        Returns: string
      }
      recalcular_indicadores_mensais: {
        Args: { p_ano: number; p_mes: number }
        Returns: undefined
      }
      sanitize_numeric: {
        Args: {
          p_allow_null?: boolean
          p_max_value?: number
          p_min_value?: number
          p_value: string
        }
        Returns: number
      }
      set_current_barbeiro_id: {
        Args: { barbeiro_id: string }
        Returns: undefined
      }
      usuario_pertence_empresa: {
        Args: { p_empresa_id: string }
        Returns: boolean
      }
      validar_disponibilidade_insumos: {
        Args: { p_itens: Json }
        Returns: Json
      }
      verify_password: {
        Args: { password_hash: string; password_text: string }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
