import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Scissors, Eye, EyeOff, Shield, Users, Crown, KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { useToast } from '@/hooks/use-toast';
import { ChangePasswordModal } from '@/components/auth/ChangePasswordModal';
export const Login = () => {
  const [usuario, setUsuario] = useState('');
  const [senha, setSenha] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [changePasswordUserId, setChangePasswordUserId] = useState('');
  const navigate = useNavigate();
  const {
    login
  } = useSupabaseAuth();
  const {
    toast
  } = useToast();

  // Verificar se já está logado
  useEffect(() => {
    const usuarioSalvo = sessionStorage.getItem('barbearia_usuario_logado');
    const sessionId = sessionStorage.getItem('barbearia_session_id');
    if (usuarioSalvo && sessionId) {
      navigate('/');
    }
  }, [navigate]);
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const result = await login(usuario, senha);
      if (result.success) {
        navigate('/');
      } else {
        toast({
          title: "Erro no login",
          description: result.error || "Usuário ou senha incorretos",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Ocorreu um erro durante o login",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  const handleChangePasswordClick = async () => {
    if (!usuario.trim()) {
      toast({
        title: "Erro",
        description: "Digite seu usuário primeiro para alterar a senha",
        variant: "destructive"
      });
      return;
    }
    try {
      const {
        supabase
      } = await import('@/integrations/supabase/client');
      const {
        data: barbeiro,
        error
      } = await supabase.from('barbeiros').select('id').ilike('usuario', usuario.trim()).eq('ativo', true).maybeSingle();
      if (error || !barbeiro) {
        toast({
          title: "Erro",
          description: "Usuário não encontrado",
          variant: "destructive"
        });
        return;
      }
      setChangePasswordUserId(barbeiro.id);
      setShowChangePassword(true);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao buscar usuário",
        variant: "destructive"
      });
    }
  };
  const handleChangePasswordSuccess = () => {
    toast({
      title: "Sucesso",
      description: "Senha alterada com sucesso! Faça login com sua nova senha."
    });
    setShowChangePassword(false);
    setSenha('');
  };
  return <div className="min-h-screen relative overflow-hidden elite-hero-bg">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(5,150,105,0.15),rgba(0,0,0,0))]" />
        <div className="absolute top-0 left-0 w-72 h-72 bg-primary/20 rounded-full -translate-x-1/2 -translate-y-1/2 blur-3xl" />
        <div className="absolute bottom-0 right-0 w-72 h-72 bg-primary/15 rounded-full translate-x-1/2 translate-y-1/2 blur-3xl" />
        <div className="absolute top-1/2 left-1/4 w-48 h-48 bg-primary/10 rounded-full blur-3xl" />
      </div>

      {/* Floating Barbershop Elements */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <Scissors className="absolute top-20 left-10 text-primary/20 animate-scissors-float" size={24} />
        <Crown className="absolute top-40 right-20 text-primary/15 animate-float" size={20} style={{
        animationDelay: '1s'
      }} />
        <Scissors className="absolute bottom-40 left-20 text-primary/20 animate-scissors-cut" size={22} style={{
        animationDelay: '2s'
      }} />
        <Shield className="absolute bottom-20 right-10 text-primary/15 animate-float" size={26} style={{
        animationDelay: '3s'
      }} />
      </div>

      <div className="relative z-10 min-h-screen flex">
        {/* Left Panel - Hero Section */}
        <div className="hidden lg:flex lg:w-1/2 xl:w-3/5 relative overflow-hidden">
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-primary/20 to-slate-900" />
          
          {/* Top line accent */}
          <div className="absolute inset-0 opacity-30">
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
          </div>
          
          {/* Decorative Elements */}
          <div className="absolute top-20 left-20 w-32 h-32 bg-primary/10 rounded-full animate-float border border-primary/20" style={{
          animationDelay: '0s'
        }} />
          <div className="absolute bottom-32 right-32 w-24 h-24 bg-primary/10 rounded-full animate-float border border-primary/20" style={{
          animationDelay: '2s'
        }} />
          <div className="absolute top-1/2 left-10 w-16 h-16 bg-primary/10 rounded-full animate-float border border-primary/15" style={{
          animationDelay: '1s'
        }} />
          
          {/* Floating Scissors */}
          <Scissors className="absolute top-1/3 right-20 text-white/15 animate-scissors-float" size={40} style={{
          animationDelay: '0.5s'
        }} />
          <Scissors className="absolute bottom-1/3 left-16 text-primary/20 animate-scissors-cut" size={35} style={{
          animationDelay: '1.5s'
        }} />
          
          <div className="relative z-10 px-12 text-white flex-col flex items-end justify-start xl:px-[200px]">
            <div className="animate-slide-in-from-left flex flex-col items-center text-center">
              {/* Logo Elite Sistemas */}
              <div className="mb-8">
                <img src="/logos/elite-sistemas.png" alt="Elite Sistemas" className="w-64 h-64 lg:w-80 lg:h-80 xl:w-96 xl:h-96 object-contain drop-shadow-[0_8px_40px_rgba(5,150,105,0.4)] hover:scale-105 transition-transform duration-300" />
              </div>
              
              <div className="space-y-6 mb-12">
                <h2 className="text-4xl xl:text-5xl font-bold leading-tight">
                  <span className="bg-gradient-to-r from-white via-slate-200 to-white bg-clip-text text-transparent">
                    Sistema de Gestão
                  </span>
                  <span className="block text-primary">Para o Seu Negócio</span>
                </h2>
                <p className="text-xl text-slate-300/80 leading-relaxed max-w-lg mx-0 px-[23px]">
                  Gerencie Clientes, Vendas, Estoques, Comissões, Despesas, Margens de lucro e Relatórios gerenciais de forma 100% Online e na palma de sua mão.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-6 max-w-md">
                <div className="backdrop-blur-sm rounded-lg p-4 border border-primary/20 bg-white/5 hover:bg-white/10 transition-all duration-300">
                  <Users className="w-8 h-8 text-primary mb-2" />
                  <h3 className="font-semibold mb-1 text-white">Gestão de Clientes</h3>
                  <p className="text-sm text-slate-400">Controle completo</p>
                </div>
                <div className="backdrop-blur-sm rounded-lg p-4 border border-primary/20 bg-white/5 hover:bg-white/10 transition-all duration-300">
                  <Crown className="w-8 h-8 text-primary mb-2" />
                  <h3 className="font-semibold mb-1 text-white">Experiência Premium</h3>
                  <p className="text-sm text-slate-400">Estilo profissional</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel - Login Form */}
        <div className="w-full lg:w-1/2 xl:w-2/5 flex items-center justify-center p-8 bg-gradient-to-br from-slate-900/30 to-slate-950/40 backdrop-blur-sm">
          <div className="w-full max-w-md">
            <Card className="elite-glass-card p-8 animate-scale-in border-0">
              <div className="text-center mb-8">
                {/* Logo da Barbearia */}
                <div className="w-32 h-32 mx-auto mb-6 animate-bounce-in">
                  <img src="/lovable-uploads/sualogo.png" alt="Seu Nome" className="w-full h-full object-contain drop-shadow-xl" />
                </div>
                <h1 className="text-2xl font-bold text-foreground mb-2 animate-fade-in" style={{
                animationDelay: '0.2s'
              }}>
                  Bem-vindo de volta
                </h1>
                <p className="text-muted-foreground animate-fade-in" style={{
                animationDelay: '0.3s'
              }}>
                  Acesse sua conta para continuar
                </p>
              </div>

              <form onSubmit={handleLogin} className="space-y-6">
                <div className="space-y-2 animate-fade-in" style={{
                animationDelay: '0.4s'
              }}>
                  <Label htmlFor="usuario" className="text-sm font-medium">
                    Usuário
                  </Label>
                  <Input id="usuario" type="text" value={usuario} onChange={(e) => setUsuario(e.target.value)} placeholder="Digite seu usuário" required className="elite-input h-12 bg-background border-border/60 transition-all duration-200 focus:border-primary focus:ring-2 focus:ring-primary/25 focus:outline-none" />
                </div>

                <div className="space-y-2 animate-fade-in" style={{
                animationDelay: '0.5s'
              }}>
                  <Label htmlFor="senha" className="text-sm font-medium">
                    Senha
                  </Label>
                  <div className="relative">
                    <Input id="senha" type={showPassword ? 'text' : 'password'} value={senha} onChange={(e) => setSenha(e.target.value)} placeholder="Digite sua senha" required className="elite-input h-12 bg-background border-border/60 pr-12 transition-all duration-200 focus:border-primary focus:ring-2 focus:ring-primary/25 focus:outline-none" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors duration-200">
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                <Button type="submit" className="w-full h-12 elite-button font-medium rounded-lg animate-fade-in" disabled={isLoading} style={{
                animationDelay: '0.6s'
              }}>
                  {isLoading ? <div className="flex items-center">
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                      Entrando...
                    </div> : 'Entrar no Sistema'}
                </Button>

                <div className="mt-4 text-center animate-fade-in" style={{
                animationDelay: '0.7s'
              }}>
                  <Button type="button" variant="ghost" onClick={handleChangePasswordClick} className="text-sm text-muted-foreground hover:text-primary transition-colors duration-200 px-4 py-2" disabled={isLoading}>
                    <KeyRound className="w-4 h-4 mr-2" />
                    Alterar Senha
                  </Button>
                </div>
              </form>

              {/* Features */}
              <div className="mt-8 pt-6 border-t border-border/50">
                <div className="flex items-center justify-center space-x-6 text-sm text-muted-foreground">
                  <div className="flex items-center">
                    <Shield className="w-4 h-4 mr-1 text-primary" />
                    Seguro
                  </div>
                  <div className="flex items-center">
                    
                    Premium
                  </div>
                  <div className="flex items-center">
                    <Scissors className="w-4 h-4 mr-1 text-primary animate-scissors-cut" />
                    Profissional
                  </div>
                </div>
              </div>
            </Card>
            
            {/* Footer */}
            <footer className="mt-8 text-center animate-fade-in" style={{
            animationDelay: '0.8s'
          }}>
              <div className="flex items-center justify-center gap-2 text-sm text-slate-400">
                
                <span className="mx-0 px-[48px]">© Elite Sistemas | Todos os Direitos Reservados 
 CEO: Lucas Gabriel Da Silva</span>
              </div>
            </footer>
          </div>
        </div>
      </div>

      {/* Change Password Modal */}
      <ChangePasswordModal isOpen={showChangePassword} onClose={() => setShowChangePassword(false)} onSuccess={handleChangePasswordSuccess} userId={changePasswordUserId} />
    </div>;};
