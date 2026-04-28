import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { LogOut, Settings, User } from "lucide-react";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNavigate } from "react-router-dom";

export const UserProfile = () => {
  const { usuario, logout } = useSupabaseAuth();
  const navigate = useNavigate();

  if (!usuario) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="flex items-center space-x-2 h-auto p-2">
          <Avatar className="w-8 h-8">
            <AvatarImage 
              src={usuario.fotoPerfilUrl} 
              alt={usuario.nome}
              onError={(e) => {
                console.log('❌ Erro ao carregar imagem:', usuario.fotoPerfilUrl);
                e.currentTarget.style.display = 'none';
              }}
              onLoad={() => {
                console.log('✅ Imagem carregada com sucesso:', usuario.fotoPerfilUrl);
              }}
            />
            <AvatarFallback className="bg-primary/20 text-primary text-sm">
              {usuario.nome.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="hidden sm:block text-left">
            <p className="text-sm font-medium text-foreground">{usuario.nome}</p>
            <p className="text-xs text-muted-foreground">
              {usuario.tipo === 'administrador' ? 'Administrador' : 'Colaborador'}
            </p>
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem 
          onClick={() => navigate('/configuracoes')}
          className="cursor-pointer"
        >
          <Settings className="mr-2 h-4 w-4" />
          <span>Configurações</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem 
          onClick={logout}
          className="cursor-pointer text-destructive focus:text-destructive"
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>Sair</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};