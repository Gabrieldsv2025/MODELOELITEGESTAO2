-- Script para corrigir dados históricos de comissão
-- Recalcula valor_comissao baseado no subtotal dos itens em vez do preço * quantidade

UPDATE public.comissoes_historico 
SET valor_comissao = ROUND((iv.subtotal * comissoes_historico.percentual_comissao) / 100.0, 2)
FROM public.itens_venda iv
WHERE comissoes_historico.venda_id = iv.venda_id 
  AND comissoes_historico.item_id = iv.item_id;

-- Verificar se a correção foi aplicada corretamente
SELECT 
  ch.barbeiro_id,
  b.nome as barbeiro_nome,
  COUNT(*) as total_registros_corrigidos,
  SUM(ch.valor_comissao) as novo_total_comissoes
FROM public.comissoes_historico ch
JOIN public.barbeiros b ON b.id = ch.barbeiro_id
GROUP BY ch.barbeiro_id, b.nome
ORDER BY b.nome;