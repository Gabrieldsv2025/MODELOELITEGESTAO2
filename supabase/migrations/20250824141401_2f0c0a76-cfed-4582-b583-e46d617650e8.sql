-- Habilitar realtime para as tabelas principais
ALTER TABLE public.vendas REPLICA IDENTITY FULL;
ALTER TABLE public.clientes REPLICA IDENTITY FULL;
ALTER TABLE public.produtos REPLICA IDENTITY FULL;
ALTER TABLE public.itens_venda REPLICA IDENTITY FULL;
ALTER TABLE public.barbeiros REPLICA IDENTITY FULL;
ALTER TABLE public.servicos REPLICA IDENTITY FULL;

-- Adicionar tabelas à publicação do realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.vendas;
ALTER PUBLICATION supabase_realtime ADD TABLE public.clientes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.produtos;
ALTER PUBLICATION supabase_realtime ADD TABLE public.itens_venda;
ALTER PUBLICATION supabase_realtime ADD TABLE public.barbeiros;
ALTER PUBLICATION supabase_realtime ADD TABLE public.servicos;