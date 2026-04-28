-- Habilitar REPLICA IDENTITY FULL para as tabelas que ainda não têm
DO $$
BEGIN
    -- Vendas
    IF NOT EXISTS (
        SELECT 1 FROM pg_class 
        WHERE relname = 'vendas' 
        AND relreplident = 'f'
    ) THEN
        ALTER TABLE public.vendas REPLICA IDENTITY FULL;
    END IF;

    -- Clientes
    IF NOT EXISTS (
        SELECT 1 FROM pg_class 
        WHERE relname = 'clientes' 
        AND relreplident = 'f'
    ) THEN
        ALTER TABLE public.clientes REPLICA IDENTITY FULL;
    END IF;

    -- Produtos
    IF NOT EXISTS (
        SELECT 1 FROM pg_class 
        WHERE relname = 'produtos' 
        AND relreplident = 'f'
    ) THEN
        ALTER TABLE public.produtos REPLICA IDENTITY FULL;
    END IF;

    -- Itens venda
    IF NOT EXISTS (
        SELECT 1 FROM pg_class 
        WHERE relname = 'itens_venda' 
        AND relreplident = 'f'
    ) THEN
        ALTER TABLE public.itens_venda REPLICA IDENTITY FULL;
    END IF;
END $$;

-- Tentar adicionar tabelas à publicação (ignorar erros se já existirem)
DO $$
BEGIN
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.vendas;
    EXCEPTION WHEN duplicate_object THEN
        -- Tabela já existe na publicação
        NULL;
    END;

    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.clientes;
    EXCEPTION WHEN duplicate_object THEN
        -- Tabela já existe na publicação
        NULL;
    END;

    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.produtos;
    EXCEPTION WHEN duplicate_object THEN
        -- Tabela já existe na publicação
        NULL;
    END;

    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.itens_venda;
    EXCEPTION WHEN duplicate_object THEN
        -- Tabela já existe na publicação
        NULL;
    END;

    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.servicos;
    EXCEPTION WHEN duplicate_object THEN
        -- Tabela já existe na publicação
        NULL;
    END;
END $$;