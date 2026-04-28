-- Criar bucket para avatars dos barbeiros
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);

-- Adicionar coluna foto_perfil_url na tabela barbeiros
ALTER TABLE public.barbeiros 
ADD COLUMN foto_perfil_url text;

-- Políticas para o bucket avatars
-- Permitir visualização pública das imagens
CREATE POLICY "Avatar images are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'avatars');

-- Permitir upload de avatars (sem restrições por agora, pois não temos auth.users)
CREATE POLICY "Anyone can upload avatar" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'avatars');

-- Permitir atualização de avatars
CREATE POLICY "Anyone can update avatar" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'avatars');

-- Permitir exclusão de avatars
CREATE POLICY "Anyone can delete avatar" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'avatars');