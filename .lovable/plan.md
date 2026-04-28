Plano de correção emergencial para comissões e memória de cálculo

Diagnóstico confirmado

- O gráfico e a memória de cálculo estão zerando porque hoje eles leem `comissoes_historico` e `indicadores_financeiros`, mas parte do histórico foi zerada por uma migração de emergência anterior.
- A regra que zerou histórico usou `configuracoes_comissao.created_at > vendas.data_venda`. Isso é perigoso porque `data_venda`/horário de atendimento pode ser anterior ao momento real em que a venda foi finalizada, e também porque uma configuração recriada depois pode parecer “nova” mesmo quando a comissão já existia antes.
- Resultado encontrado nos dados: Mickael tinha histórico normal em 09/2025, 10/2025 e 11/2025, mas caiu quase todo para zero em 12/2025, 01/2026 e 02/2026. O painel financeiro então soma esse zero e mostra comissão zerada/baixa.
- A função atual de snapshot também tem outra falha: uma linha específica com `0%` pode sobrescrever uma comissão geral do barbeiro. A regra correta deve ser: percentual específico positivo primeiro; se não existir, percentual geral da categoria; se nenhum existir, 0%.

O que vou implementar

1. Travar a regra correta para novas vendas

- Ajustar `save_commission_history()` para gravar a comissão no momento real do INSERT do item da venda.
- Regra de cálculo:
  - Se houver percentual específico do serviço/produto maior que 0, usa ele.
  - Caso contrário, usa o percentual geral do barbeiro para serviços/produtos, se maior que 0.
  - Caso contrário, grava 0%.
- Manter `ON CONFLICT DO NOTHING`, para o snapshot não ser sobrescrito depois.
- Não usar configuração atual para recalcular venda antiga.
- Não usar `data_venda` para decidir se configuração vale ou não; o snapshot vale no momento em que a venda/item é inserido.

2. Amarrar a comissão ao item da venda

- Adicionar campos de snapshot no item vendido (`itens_venda`) para guardar o percentual e valor de comissão do item no momento da venda.
- Manter `comissoes_historico` como tabela de leitura/relatório, mas os dados passam a estar também presos ao item da venda, reduzindo risco de divergência.
- Para novas vendas, o trigger gravará os dois lados de forma consistente.

3. Recuperar o histórico perdido sem usar comissão atual retroativamente

- Criar uma migração controlada para reparar somente registros zerados de vendas pagas onde há evidência histórica anterior.
- Regra segura de recuperação:
  - Para cada item com comissão zerada, buscar o último snapshot positivo anterior do mesmo barbeiro + mesmo serviço/produto.
  - Se existir, restaurar o percentual histórico e recalcular o valor pelo subtotal do item daquela venda.
  - Se não existir evidência anterior, manter 0% para não inventar comissão nem aplicar regra atual no passado.
- Isso deve recuperar o histórico de Mickael onde já havia padrão histórico anterior, sem repetir o erro de aplicar a configuração atual para meses antigos.
- Registrar os ajustes numa tabela/log de auditoria da correção, com valor anterior, valor novo e motivo.

4. Recalcular os indicadores financeiros

- Após reparar o histórico, recalcular `indicadores_financeiros` para todos os meses afetados.
- A memória de cálculo da margem passará a puxar o valor corrigido de `total_comissoes`.
- Conferir especificamente Abril/2026, onde a imagem mostra comissão zerada, e os meses do histórico de Mickael.

5. Ajustar frontend para não mascarar erro

- `ComissoesChart.tsx`: continuar lendo snapshots, mas garantir que a consulta agregue corretamente por período/barbeiro e reflita os dados reparados.
- `Comissoes.tsx` e detalhes de comissão: remover fallback dinâmico restante que ainda usa configuração atual para venda sem histórico; para vendas antigas sem evidência, mostrar 0 e não recalcular com regra atual.
- `MemoriaCalculoModal.tsx`: exibir o valor vindo dos indicadores recalculados, usando formatação monetária padrão do sistema.
- Manter Realtime em `comissoes_historico`, `itens_venda`, `vendas` e `indicadores_financeiros`, para os gráficos atualizarem após venda/cancelamento.

6. Validar cancelamentos/estornos

- Confirmar que venda cancelada remove/zera a comissão do relatório do período e dispara recálculo dos indicadores.
- Confirmar que venda excluída também remove do financeiro e do gráfico.
- Não mexer em vendas pagas históricas fora da regra de reparo segura.

Validações que farei depois da implementação

- Comparar antes/depois do total mensal de comissões de Mickael.
- Verificar quantidade de itens com snapshot zerado por mês e por barbeiro.
- Testar uma venda nova com comissão geral.
- Testar uma venda nova com comissão específica por serviço/produto.
- Alterar comissão depois da venda e confirmar que a venda antiga não muda.
- Cancelar venda e confirmar que gráfico/memória de cálculo removem a comissão.
- Reabrir o módulo Relatórios e Comissões e confirmar que gráfico e margem bruta não ficam zerados indevidamente.

Observação importante

A recuperação não vai aplicar percentuais atuais em massa para o passado. Quando não houver evidência histórica anterior para um item, o sistema não deve inventar comissão, porque isso repetiria o problema original de corromper o passado.