-- Add has_access column to user_permissions table for simplified permission management
ALTER TABLE public.user_permissions 
ADD COLUMN has_access BOOLEAN DEFAULT false;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_user_permissions_has_access 
ON public.user_permissions(user_id, module_name, has_access);