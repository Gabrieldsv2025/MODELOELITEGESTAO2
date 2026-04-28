-- Script para correção retroativa das comissões históricas
-- Este script recalcula todas as comissões de vendas que tiveram desconto aplicado

-- Primeiro, criar uma função para recalcular comissões com desconto
CREATE OR REPLACE FUNCTION recalcular_comissoes_com_desconto()
RETURNS void AS $$
DECLARE
  venda_record RECORD;
  item_record RECORD;
  barbeiro_comissao_servicos numeric;
  barbeiro_comissao_produtos numeric;
  percentual_usado numeric;
  valor_comissao_corrigido numeric;
  fator_desconto numeric;
  subtotal_original numeric;
  subtotal_ajustado numeric;
BEGIN
  RAISE NOTICE 'Iniciando correção de comissões históricas...';
  
  -- Para cada venda com desconto > 0
  FOR venda_record IN 
    SELECT v.id, v.barbeiro_id, v.desconto, v.total
    FROM vendas v 
    WHERE v.desconto > 0
  LOOP
    RAISE NOTICE 'Processando venda %', venda_record.id;
    
    -- Buscar dados do barbeiro para esta venda
    SELECT b.comissao_servicos, b.comissao_produtos
    INTO barbeiro_comissao_servicos, barbeiro_comissao_produtos
    FROM barbeiros b
    WHERE b.id = venda_record.barbeiro_id;
    
    -- Calcular subtotal original da venda (soma dos subtotais dos itens)
    SELECT COALESCE(SUM(iv.subtotal), 0)
    INTO subtotal_original
    FROM itens_venda iv
    WHERE iv.venda_id = venda_record.id;
    
    -- Calcular fator de desconto se subtotal > 0
    IF subtotal_original > 0 THEN
      fator_desconto := (subtotal_original - venda_record.desconto) / subtotal_original;
    ELSE
      fator_desconto := 1;
    END IF;
    
    RAISE NOTICE 'Subtotal original: %, Desconto: %, Fator: %', 
      subtotal_original, venda_record.desconto, fator_desconto;
    
    -- Para cada item desta venda
    FOR item_record IN
      SELECT iv.id, iv.item_id, iv.tipo, iv.subtotal
      FROM itens_venda iv
      WHERE iv.venda_id = venda_record.id
    LOOP
      -- Calcular subtotal ajustado com o desconto
      subtotal_ajustado := item_record.subtotal * fator_desconto;
      
      -- Buscar percentual personalizado ou usar padrão do barbeiro
      SELECT cc.percentual
      INTO percentual_usado
      FROM configuracoes_comissao cc
      WHERE cc.barbeiro_id = venda_record.barbeiro_id
        AND cc.tipo = item_record.tipo
        AND (
          (item_record.tipo = 'servico' AND cc.servico_id = item_record.item_id) OR
          (item_record.tipo = 'produto' AND cc.produto_id = item_record.item_id)
        )
      LIMIT 1;
      
      -- Se não encontrou configuração personalizada, usar padrão do barbeiro
      IF percentual_usado IS NULL THEN
        IF item_record.tipo = 'servico' THEN
          percentual_usado := barbeiro_comissao_servicos;
        ELSE
          percentual_usado := barbeiro_comissao_produtos;
        END IF;
      END IF;
      
      -- Calcular nova comissão baseada no subtotal ajustado
      valor_comissao_corrigido := (subtotal_ajustado * percentual_usado) / 100.0;
      
      RAISE NOTICE 'Item %: Subtotal original %, ajustado %, comissão %', 
        item_record.item_id, item_record.subtotal, subtotal_ajustado, valor_comissao_corrigido;
      
      -- Atualizar comissão histórica existente ou inserir nova
      UPDATE comissoes_historico 
      SET 
        percentual_comissao = percentual_usado,
        valor_comissao = valor_comissao_corrigido
      WHERE venda_id = venda_record.id 
        AND item_id = item_record.item_id;
      
      -- Se não existia registro histórico, criar um
      IF NOT FOUND THEN
        INSERT INTO comissoes_historico (
          venda_id,
          barbeiro_id,
          item_id,
          item_tipo,
          percentual_comissao,
          valor_comissao
        ) VALUES (
          venda_record.id,
          venda_record.barbeiro_id,
          item_record.item_id,
          item_record.tipo,
          percentual_usado,
          valor_comissao_corrigido
        );
      END IF;
    END LOOP;
  END LOOP;
  
  RAISE NOTICE 'Correção de comissões históricas concluída!';
END;
$$ LANGUAGE plpgsql;

-- Executar a correção
SELECT recalcular_comissoes_com_desconto();

-- Remover a função após o uso
DROP FUNCTION recalcular_comissoes_com_desconto();