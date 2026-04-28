-- Create function to set current barbeiro ID for RLS
CREATE OR REPLACE FUNCTION public.set_current_barbeiro_id(barbeiro_id UUID)
RETURNS VOID AS $$
BEGIN
  PERFORM set_config('app.current_barbeiro_id', barbeiro_id::text, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;