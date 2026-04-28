-- Adicionar colunas para controle de pagamento
ALTER TABLE despesas 
ADD COLUMN IF NOT EXISTS status_pagamento text DEFAULT 'pendente' CHECK (status_pagamento IN ('pendente', 'pago')),
ADD COLUMN IF NOT EXISTS data_pagamento date;

-- Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_despesas_status_pagamento ON despesas(status_pagamento);

-- Comentários para documentação
COMMENT ON COLUMN despesas.status_pagamento IS 'Status de pagamento: pendente ou pago (fluxo de caixa)';
COMMENT ON COLUMN despesas.data_pagamento IS 'Data em que a despesa foi efetivamente paga';

-- Atualizar despesas existentes para status 'pendente'
UPDATE despesas SET status_pagamento = 'pendente' WHERE status_pagamento IS NULL;

-- Migração especial: Despesas recorrentes criadas devem ter status pendente
UPDATE despesas 
SET status_pagamento = 'pendente' 
WHERE is_recurring = true 
  AND status_pagamento IS NULL;