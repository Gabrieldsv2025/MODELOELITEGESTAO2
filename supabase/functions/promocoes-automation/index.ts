import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('🤖 Iniciando automação de promoções...');

    // Obter dia da semana atual (0 = domingo, 1 = segunda, etc.)
    const hoje = new Date().getDay();
    console.log(`📅 Hoje é dia da semana: ${hoje}`);

    // 1. Desativar todas as promoções de produtos/serviços primeiro
    console.log('🔄 Desativando todas as promoções...');
    const { error: desativarError } = await supabase
      .from('promocoes_produtos_servicos')
      .update({ ativo: false })
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Atualizar todas

    if (desativarError) {
      console.error('❌ Erro ao desativar promoções:', desativarError);
      throw desativarError;
    }

    // 2. Buscar promoções que devem ser ativadas hoje
    console.log(`🔍 Buscando promoções para o dia ${hoje}...`);
    const { data: promocoesHoje, error: buscarError } = await supabase
      .from('promocoes')
      .select(`
        id,
        nome,
        tipo,
        percentual,
        dias_semana,
        ativo
      `)
      .eq('ativo', true)
      .contains('dias_semana', [hoje]);

    if (buscarError) {
      console.error('❌ Erro ao buscar promoções:', buscarError);
      throw buscarError;
    }

    console.log(`📊 Encontradas ${promocoesHoje?.length || 0} promoções para hoje`);

    let promocoesAtivadas = 0;

    // 3. Para cada promoção ativa hoje, ativar os produtos/serviços vinculados
    if (promocoesHoje && promocoesHoje.length > 0) {
      for (const promocao of promocoesHoje) {
        console.log(`🎯 Ativando promoção: ${promocao.nome} (${promocao.tipo} ${promocao.percentual}%)`);

        // Ativar produtos/serviços desta promoção
        const { data: itensAtivados, error: ativarError } = await supabase
          .from('promocoes_produtos_servicos')
          .update({ ativo: true })
          .eq('promocao_id', promocao.id)
          .select('item_id, item_tipo, preco_promocional');

        if (ativarError) {
          console.error(`❌ Erro ao ativar promoção ${promocao.nome}:`, ativarError);
          continue;
        }

        if (itensAtivados) {
          console.log(`✅ ${itensAtivados.length} itens ativados para promoção: ${promocao.nome}`);
          promocoesAtivadas += itensAtivados.length;
          
          // Log dos itens ativados
          itensAtivados.forEach(item => {
            console.log(`  📦 ${item.item_tipo}: ${item.item_id} → R$ ${item.preco_promocional}`);
          });
        }
      }
    }

    // 4. Registrar log da atividade
    const logMessage = `Automação executada: ${promocoesAtivadas} promoções ativadas para o dia da semana ${hoje}`;
    console.log(`📝 ${logMessage}`);

    // Log na base de dados (se houver tabela de logs)
    try {
      await supabase.from('activity_logs').insert({
        action: 'promocoes_automation',
        details: {
          dia_semana: hoje,
          promocoes_ativadas: promocoesAtivadas,
          promocoes_encontradas: promocoesHoje?.length || 0
        }
      });
    } catch (logError) {
      console.log('ℹ️  Tabela de logs não encontrada, prosseguindo...');
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: logMessage,
        data: {
          dia_semana: hoje,
          promocoes_ativadas: promocoesAtivadas,
          promocoes_encontradas: promocoesHoje?.length || 0
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('❌ Erro na automação de promoções:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});