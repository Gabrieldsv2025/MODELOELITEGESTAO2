import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const usePhotoUpload = () => {
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  const uploadPhoto = async (file: File, barbeiroId: string): Promise<string> => {
    setIsUploading(true);
    
    try {
      // Gerar nome único para o arquivo
      const fileExtension = file.name.split('.').pop();
      const fileName = `${barbeiroId}_${Date.now()}.${fileExtension}`;
      const filePath = `barbeiros/${fileName}`;

      // Fazer upload para o Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true // Sobrescrever se já existir
        });

      if (uploadError) {
        throw uploadError;
      }

      // Obter URL pública da imagem
      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const photoUrl = urlData.publicUrl;

      // Atualizar o banco de dados com a nova URL
      const { error: updateError } = await supabase
        .from('barbeiros')
        .update({ foto_perfil_url: photoUrl })
        .eq('id', barbeiroId);

      if (updateError) {
        throw updateError;
      }

      return photoUrl;
    } catch (error) {
      console.error('Erro no upload da foto:', error);
      throw error;
    } finally {
      setIsUploading(false);
    }
  };

  const removePhoto = async (barbeiroId: string, currentPhotoUrl?: string): Promise<void> => {
    setIsUploading(true);
    
    try {
      // Se houver foto atual, tentar removê-la do storage
      if (currentPhotoUrl) {
        try {
          const fileName = currentPhotoUrl.split('/').pop();
          const filePath = `barbeiros/${fileName}`;
          
          await supabase.storage
            .from('avatars')
            .remove([filePath]);
        } catch (error) {
          // Não falhar se não conseguir remover do storage
          console.warn('Erro ao remover arquivo do storage:', error);
        }
      }

      // Limpar URL do banco de dados
      const { error } = await supabase
        .from('barbeiros')
        .update({ foto_perfil_url: null })
        .eq('id', barbeiroId);

      if (error) {
        throw error;
      }

      toast({
        title: "Foto removida",
        description: "A foto de perfil foi removida com sucesso.",
      });
    } catch (error) {
      console.error('Erro ao remover foto:', error);
      toast({
        title: "Erro",
        description: "Não foi possível remover a foto. Tente novamente.",
        variant: "destructive"
      });
      throw error;
    } finally {
      setIsUploading(false);
    }
  };

  return {
    uploadPhoto,
    removePhoto,
    isUploading
  };
};