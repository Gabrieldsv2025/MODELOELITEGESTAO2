import { ReactNode } from 'react';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/app-sidebar';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { Separator } from '@/components/ui/separator';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { PWAInstallPrompt } from '@/components/ui/pwa-install-prompt';

interface ResponsiveLayoutProps {
  children: ReactNode;
}

export const ResponsiveLayout = ({ children }: ResponsiveLayoutProps) => {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        <SidebarInset>
          {/* Header Premium */}
          <header className="sticky top-0 z-30 flex h-14 md:h-16 shrink-0 items-center gap-2 elite-header px-3 md:px-4">
            <SidebarTrigger className="-ml-1 tap-target text-foreground hover:text-primary hover:bg-primary/10" />
            <Separator orientation="vertical" className="mr-2 h-4 bg-border" />
            
            {/* Logo da Barbearia e Breadcrumb */}
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg border border-primary/20 bg-white dark:bg-card p-1 flex-shrink-0 shadow-sm">
                <img
                  src="/lovable-uploads/85865227-f6ae-4901-b782-2034c0187d48.png"
                  alt="Igor Queiroz Barbearia"
                  className="w-full h-full object-contain" />
                
              </div>
              <Breadcrumb className="hidden sm:flex min-w-0">
                <BreadcrumbList className="text-sm">
                  <BreadcrumbItem>
                    <BreadcrumbLink href="/" className="truncate font-medium text-foreground hover:text-primary">
                      Nome e logo da sua Empresa
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator className="text-muted-foreground" />
                  <BreadcrumbItem>
                    <BreadcrumbPage className="truncate text-primary font-medium">Dashboard</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
              <span className="sm:hidden text-sm font-medium truncate text-foreground">Barbearia ERP</span>
            </div>

            {/* Right side actions */}
            <div className="flex items-center gap-1 flex-shrink-0">
              <ThemeToggle />
            </div>
          </header>

          {/* Main content com fundo premium */}
          <main className="flex-1 overflow-auto elite-content-bg">
            <div className="container mx-auto px-3 sm:px-4 lg:px-6 py-3 sm:py-4 lg:py-6 max-w-none relative z-10">
              <div className="animate-fade-in">
                {children}
              </div>
            </div>
          </main>

          {/* Footer Premium */}
          <footer className="elite-footer">
            <div className="flex flex-col sm:flex-row items-center justify-between px-3 sm:px-4 lg:px-6 py-2 sm:py-3 gap-2">
              {/* Elite Sistemas Branding */}
              <div className="flex items-center gap-2">
                <img
                  src="/logos/elite-sistemas.png"
                  alt="Elite Sistemas"
                  className="w-5 h-5 sm:w-6 sm:h-6 object-contain opacity-70" />
                
                <span className="text-xs sm:text-sm text-muted-foreground">© Desenvolvido Por: Elite Sistemas | Todos os Direitos Reservados | CEO: Lucas Gabriel Da Silva

                </span>
              </div>
              
              {/* Status do sistema */}
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-primary rounded-full animate-pulse shadow-sm shadow-primary/50" />
                  <span>Sistema Online</span>
                </div>
              </div>
            </div>
          </footer>
        </SidebarInset>
        
        {/* PWA Install Prompt */}
        <PWAInstallPrompt />
      </div>
    </SidebarProvider>);

};