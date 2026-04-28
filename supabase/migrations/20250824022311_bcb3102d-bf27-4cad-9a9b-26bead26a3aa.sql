-- Create user_permissions table for managing user module access
CREATE TABLE public.user_permissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  module_name TEXT NOT NULL,
  has_access BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Foreign key reference to barbeiros table
  CONSTRAINT fk_user_permissions_barbeiros 
    FOREIGN KEY (user_id) REFERENCES public.barbeiros(id) ON DELETE CASCADE,
  
  -- Unique constraint to prevent duplicate permissions for same user/module
  CONSTRAINT unique_user_module_permission UNIQUE (user_id, module_name)
);

-- Enable Row Level Security
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

-- Create policies for user permissions
-- Only administrators can manage permissions
CREATE POLICY "Administrators can manage all permissions" 
ON public.user_permissions 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.barbeiros 
    WHERE id = auth.uid()::uuid 
    AND nivel = 'administrador'
  )
);

-- Users can view their own permissions
CREATE POLICY "Users can view their own permissions" 
ON public.user_permissions 
FOR SELECT 
USING (user_id = auth.uid()::uuid);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_user_permissions_updated_at
BEFORE UPDATE ON public.user_permissions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add index for better performance on user lookups
CREATE INDEX idx_user_permissions_user_id ON public.user_permissions(user_id);
CREATE INDEX idx_user_permissions_module_name ON public.user_permissions(module_name);