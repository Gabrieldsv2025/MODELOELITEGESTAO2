-- Política temporária para proprietários verem todas as vendas
CREATE POLICY "Proprietarios podem ver todas as vendas (temporaria)" 
ON public.vendas 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.barbeiros 
    WHERE id = get_current_barbeiro_id() 
    AND is_proprietario = true
  )
);