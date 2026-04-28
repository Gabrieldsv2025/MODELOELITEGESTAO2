-- Função para recalcular indicadores quando vendas são modificadas
CREATE OR REPLACE FUNCTION public.trigger_recalcular_indicadores_venda()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Recalcular para o mês da venda quando status muda para 'pago'
  IF (TG_OP = 'INSERT' AND NEW.status = 'pago') OR 
     (TG_OP = 'UPDATE' AND OLD.status != 'pago' AND NEW.status = 'pago') THEN
    PERFORM recalcular_indicadores_mensais(
      EXTRACT(MONTH FROM NEW.data_venda)::INTEGER,
      EXTRACT(YEAR FROM NEW.data_venda)::INTEGER
    );
  END IF;
  
  -- Se uma venda foi cancelada, recalcular também
  IF (TG_OP = 'UPDATE' AND OLD.status = 'pago' AND NEW.status != 'pago') THEN
    PERFORM recalcular_indicadores_mensais(
      EXTRACT(MONTH FROM OLD.data_venda)::INTEGER,
      EXTRACT(YEAR FROM OLD.data_venda)::INTEGER
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Criar o trigger
DROP TRIGGER IF EXISTS vendas_recalcular_indicadores ON public.vendas;
CREATE TRIGGER vendas_recalcular_indicadores
  AFTER INSERT OR UPDATE ON public.vendas
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_recalcular_indicadores_venda();