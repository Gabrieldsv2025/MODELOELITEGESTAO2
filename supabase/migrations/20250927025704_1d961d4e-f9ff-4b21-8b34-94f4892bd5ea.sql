-- Atualizar função para salvar senha em texto plano também
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
  
  -- Update to new password (both hash and plain text)
  UPDATE public.barbeiros 
  SET senha_hash = public.hash_password(new_password),
      senha = new_password,  -- Também salva em texto plano
      updated_at = now()
  WHERE id = barbeiro_id;
  
  RETURN json_build_object('success', true, 'message', 'Senha alterada com sucesso');
END;
$$;