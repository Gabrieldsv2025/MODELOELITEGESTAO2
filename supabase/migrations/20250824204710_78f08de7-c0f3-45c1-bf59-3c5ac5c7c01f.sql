-- Remover políticas baseadas em auth.role() que não funcionam com autenticação customizada
DROP POLICY IF EXISTS "Public access to avatar images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can update any avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete any avatar" ON storage.objects;

-- Criar políticas mais permissivas para funcionar com autenticação customizada
CREATE POLICY "Public read access to avatars" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'avatars');

CREATE POLICY "Allow avatar uploads" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'avatars');

CREATE POLICY "Allow avatar updates" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'avatars');

CREATE POLICY "Allow avatar deletions" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'avatars');