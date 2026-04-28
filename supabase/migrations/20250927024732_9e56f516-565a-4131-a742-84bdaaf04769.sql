-- Fix pgcrypto extension access and function references
-- Ensure pgcrypto is properly available
CREATE EXTENSION IF NOT EXISTS pgcrypto SCHEMA extensions;

-- Drop and recreate functions with explicit extension references
DROP FUNCTION IF EXISTS public.hash_password(text);
DROP FUNCTION IF EXISTS public.verify_password(text, text);
DROP FUNCTION IF EXISTS public.change_barbeiro_password(uuid, text, text);

-- Create function to hash passwords with explicit extension reference
CREATE OR REPLACE FUNCTION public.hash_password(password_text TEXT)
RETURNS TEXT 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  RETURN extensions.crypt(password_text, extensions.gen_salt('bf', 10));
END;
$$;

-- Create function to verify passwords with explicit extension reference
CREATE OR REPLACE FUNCTION public.verify_password(password_text TEXT, password_hash TEXT)
RETURNS BOOLEAN 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  RETURN password_hash = extensions.crypt(password_text, password_hash);
END;
$$;

-- Create function to change password with explicit extension reference
CREATE OR REPLACE FUNCTION public.change_barbeiro_password(
  barbeiro_id UUID,
  current_password TEXT,
  new_password TEXT
)
RETURNS JSON 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  current_hash TEXT;
  is_valid BOOLEAN;
BEGIN
  -- Get current password hash
  SELECT senha_hash INTO current_hash 
  FROM public.barbeiros 
  WHERE id = barbeiro_id;
  
  IF current_hash IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Usuário não encontrado');
  END IF;
  
  -- Verify current password
  SELECT public.verify_password(current_password, current_hash) INTO is_valid;
  
  IF NOT is_valid THEN
    RETURN json_build_object('success', false, 'error', 'Senha atual incorreta');
  END IF;
  
  -- Update to new password
  UPDATE public.barbeiros 
  SET senha_hash = public.hash_password(new_password),
      updated_at = now()
  WHERE id = barbeiro_id;
  
  RETURN json_build_object('success', true, 'message', 'Senha alterada com sucesso');
END;
$$;