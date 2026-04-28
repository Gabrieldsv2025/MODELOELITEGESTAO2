import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { ProtectedModuleRoute } from "@/components/auth/ProtectedModuleRoute";
import { Login } from "./pages/Login";
import { Clientes } from "./pages/Clientes";
import { Servicos } from "./pages/Servicos";
import Produtos from "./pages/Produtos";
import Vendas from "./pages/Vendas";
import Comissoes from "./pages/Comissoes";
import Relatorios from "./pages/Relatorios";
import Configuracoes from "./pages/Configuracoes";
import Despesas from "./pages/Despesas";
import Insumos from "./pages/Insumos";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={
            <ProtectedRoute>
              <ProtectedModuleRoute module="vendas">
                <Vendas />
              </ProtectedModuleRoute>
            </ProtectedRoute>
          } />
          <Route path="/clientes" element={
            <ProtectedRoute>
              <ProtectedModuleRoute module="clientes">
                <Clientes />
              </ProtectedModuleRoute>
            </ProtectedRoute>
          } />
          <Route path="/servicos" element={
            <ProtectedRoute>
              <ProtectedModuleRoute module="servicos">
                <Servicos />
              </ProtectedModuleRoute>
            </ProtectedRoute>
          } />
          <Route path="/produtos" element={
            <ProtectedRoute>
              <ProtectedModuleRoute module="produtos">
                <Produtos />
              </ProtectedModuleRoute>
            </ProtectedRoute>
          } />
          <Route path="/insumos" element={
            <ProtectedRoute>
              <ProtectedModuleRoute module="insumos">
                <Insumos />
              </ProtectedModuleRoute>
            </ProtectedRoute>
          } />
          <Route path="/comissoes" element={
            <ProtectedRoute>
              <ProtectedModuleRoute module="comissoes">
                <Comissoes />
              </ProtectedModuleRoute>
            </ProtectedRoute>
          } />
            <Route path="/relatorios" element={
              <ProtectedRoute>
                <ProtectedModuleRoute module="relatorios">
                  <Relatorios />
                </ProtectedModuleRoute>
              </ProtectedRoute>
            } />
            <Route path="/despesas" element={
              <ProtectedRoute>
                <ProtectedModuleRoute module="despesas">
                  <Despesas />
                </ProtectedModuleRoute>
              </ProtectedRoute>
            } />
            <Route path="/configuracoes" element={
              <ProtectedRoute>
                <ProtectedModuleRoute module="configuracoes">
                  <Configuracoes />
                </ProtectedModuleRoute>
              </ProtectedRoute>
            } />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
