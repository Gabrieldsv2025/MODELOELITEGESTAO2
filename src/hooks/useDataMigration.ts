import { useState, useEffect } from 'react';
import { 
  migrateLocalStorageToSupabase,
  checkLocalStorageData,
  cleanOldLocalStorage
} from '@/utils/migrationUtils';
import { useToast } from '@/hooks/use-toast';

export const useDataMigration = () => {
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationComplete, setMigrationComplete] = useState(false);
  const { toast } = useToast();

  const migrateData = async () => {
    setIsMigrating(true);
    console.log('Iniciando migração de dados do localStorage para Supabase...');

    try {
      const results = await migrateLocalStorageToSupabase();
      
      const totalMigrated = results.clientes + results.barbeiros + results.servicos + results.produtos + results.vendas;
      
      if (totalMigrated > 0) {
        toast({
          title: "Migração Concluída!",
          description: `${totalMigrated} registros migrados com sucesso do localStorage para o Supabase.`,
        });
      }

      if (results.errors.length > 0) {
        console.error('Erros durante a migração:', results.errors);
        toast({
          title: "Migração com Alertas",
          description: `${results.errors.length} erros ocorreram. Verifique o console.`,
          variant: "destructive"
        });
      }

      console.log('Migração concluída:', results);
      setMigrationComplete(true);
    } catch (error) {
      console.error('Erro durante a migração:', error);
      toast({
        title: "Erro na Migração",
        description: "Erro ao migrar dados. Verifique o console.",
        variant: "destructive"
      });
    } finally {
      setIsMigrating(false);
    }
  };

  const checkAndMigrate = async () => {
    const localData = checkLocalStorageData();
    const hasAnyData = Object.values(localData).some(Boolean);

    if (hasAnyData) {
      console.log('Dados encontrados no localStorage:', localData);
      await migrateData();
    }
  };

  useEffect(() => {
    // Verificar se há dados para migrar quando o hook é inicializado
    checkAndMigrate();
  }, []);

  return {
    isMigrating,
    migrationComplete,
    migrateData,
    cleanOldLocalStorage
  };
};