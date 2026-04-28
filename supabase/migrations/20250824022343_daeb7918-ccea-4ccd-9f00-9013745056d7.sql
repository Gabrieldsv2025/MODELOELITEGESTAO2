-- Update RLS policies for user_permissions to work with custom barbeiro authentication
-- First, drop existing policies
DROP POLICY IF EXISTS "Administrators can manage all permissions" ON public.user_permissions;
DROP POLICY IF EXISTS "Users can view their own permissions" ON public.user_permissions;
DROP POLICY IF EXISTS "Apenas administradores podem modificar permissões" ON public.user_permissions;
DROP POLICY IF EXISTS "Todos podem ver permissões" ON public.user_permissions;

-- Create new simplified policies that allow all access
-- Since we're using custom authentication with barbeiros table, not Supabase Auth
CREATE POLICY "Allow all access for user_permissions" 
ON public.user_permissions 
FOR ALL 
USING (true)
WITH CHECK (true);