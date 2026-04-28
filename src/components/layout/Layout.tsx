import { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { RealtimeStatus } from './RealtimeStatus';
import { UserProfile } from './UserProfile';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { Bell, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface LayoutProps {
  children: ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        {/* Modern Header com Logo da Barbearia */}
        <header className="sticky top-0 z-30 border-b metallic-card backdrop-blur-xl supports-[backdrop-filter]:bg-card/60 shadow-sm">
          <div className="flex h-16 items-center justify-between px-6 lg:px-8">
            {/* Left section com Logo */}
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 rounded-lg elite-border bg-white dark:bg-slate-800 p-1">
                <img 
                  src="/lovable-uploads/85865227-f6ae-4901-b782-2034c0187d48.png" 
                  alt="Sua Logo" 
                  className="w-full h-full object-contain" 
                />
              </div>
              <div className="hidden md:block">
                <h2 className="text-xl font-semibold text-foreground">
                  Sua Logo
                </h2>
                <p className="text-sm text-muted-foreground">
                  ERP BARBER 4.0 - Gestão Profissional
                </p>
              </div>
            </div>

            {/* Center section - Search */}
            <div className="hidden lg:flex flex-1 max-w-md mx-8">
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar clientes, produtos..."
                  className="pl-10 bg-background/60 border-border/60 focus:bg-background transition-colors focus:border-emerald-500 focus:ring-emerald-500/20"
                />
              </div>
            </div>

            {/* Right section */}
            <div className="flex items-center space-x-3">
              <RealtimeStatus />
              
              {/* Notifications */}
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                <span className="absolute -top-1 -right-1 h-3 w-3 bg-destructive rounded-full flex items-center justify-center">
                  <span className="text-[10px] text-destructive-foreground font-medium">3</span>
                </span>
              </Button>

              {/* User profile */}
              <div className="flex items-center space-x-3 pl-3 border-l border-border">
                <UserProfile />
                <ThemeToggle />
              </div>
            </div>
          </div>
        </header>

        {/* Main content area */}
        <main className="flex-1 overflow-auto bg-background">
          <div className="container mx-auto px-4 md:px-6 lg:px-8 py-6 md:py-8 max-w-none">
            <div className="animate-fade-in">
              {children}
            </div>
          </div>
        </main>

        {/* Modern Footer com Elite Sistemas */}
        <footer className="elite-footer">
          <div className="flex items-center justify-between px-6 lg:px-8 py-4">
            {/* Elite Sistemas Branding */}
            <div className="flex items-center space-x-3">
              <img 
                src="/logos/elite-sistemas.png" 
                alt="Elite Sistemas" 
                className="w-6 h-6 object-contain opacity-80" 
              />
              <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                <span>© Desenvolvido Por: Elite Sistemas | Todos os Direitos Reservados</span>
              </div>
            </div>
            
            {/* Status do sistema */}
            <div className="flex items-center space-x-2 text-xs text-muted-foreground">
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                <span>Sistema Online</span>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};
