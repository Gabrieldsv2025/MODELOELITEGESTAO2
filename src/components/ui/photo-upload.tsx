import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Camera, Upload, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface PhotoUploadProps {
  currentPhotoUrl?: string;
  onPhotoUpload: (file: File) => Promise<string>;
  onPhotoRemove?: () => void;
  fallbackText?: string;
  className?: string;
  disabled?: boolean;
}

export const PhotoUpload = ({
  currentPhotoUrl,
  onPhotoUpload,
  onPhotoRemove,
  fallbackText = "?",
  className,
  disabled = false
}: PhotoUploadProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validações
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Arquivo inválido",
        description: "Selecione apenas arquivos de imagem (JPG, PNG, WebP).",
        variant: "destructive"
      });
      return;
    }

    if (file.size > 2 * 1024 * 1024) { // 2MB
      toast({
        title: "Arquivo muito grande",
        description: "A imagem deve ter no máximo 2MB.",
        variant: "destructive"
      });
      return;
    }

    // Mostrar preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Upload
    handleUpload(file);
  };

  const handleUpload = async (file: File) => {
    setIsUploading(true);
    try {
      console.log('📤 Iniciando upload da foto...');
      const photoUrl = await onPhotoUpload(file);
      console.log('✅ Upload concluído, URL:', photoUrl);
      
      toast({
        title: "Foto atualizada",
        description: "Sua foto de perfil foi atualizada com sucesso.",
      });
      
      setPreviewUrl(null);
    } catch (error) {
      console.error('Erro no upload:', error);
      toast({
        title: "Erro no upload",
        description: "Não foi possível fazer o upload da foto. Tente novamente.",
        variant: "destructive"
      });
      setPreviewUrl(null);
    } finally {
      setIsUploading(false);
      // Limpar o input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemovePhoto = () => {
    if (onPhotoRemove) {
      console.log('🗑️ Removendo foto...');
      onPhotoRemove();
      setPreviewUrl(null);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  // Add cache busting parameter to force refresh
  const displayUrl = previewUrl || (currentPhotoUrl ? `${currentPhotoUrl}?t=${Date.now()}` : undefined);

  return (
    <div className={cn("flex flex-col items-center space-y-4", className)}>
      <div className="relative group">
        <Avatar className="h-20 w-20 border-2 border-border">
          <AvatarImage src={displayUrl} alt="Foto de perfil" />
          <AvatarFallback className="text-lg font-semibold bg-primary/20 text-primary">
            {fallbackText}
          </AvatarFallback>
        </Avatar>
        
        {isUploading && (
          <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center">
            <Loader2 className="h-6 w-6 text-white animate-spin" />
          </div>
        )}
        
        {!disabled && (
          <Button
            type="button"
            variant="secondary"
            size="icon"
            className="absolute -bottom-2 -right-2 rounded-full h-8 w-8 shadow-lg"
            onClick={triggerFileInput}
            disabled={isUploading}
          >
            <Camera className="h-4 w-4" />
          </Button>
        )}
      </div>

      <div className="flex flex-col items-center space-y-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
          disabled={disabled || isUploading}
        />
        
        {!disabled && (
          <div className="flex space-x-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={triggerFileInput}
              disabled={isUploading}
            >
              <Upload className="h-4 w-4 mr-2" />
              Alterar Foto
            </Button>
            
            {displayUrl && onPhotoRemove && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleRemovePhoto}
                disabled={isUploading}
              >
                <X className="h-4 w-4 mr-2" />
                Remover
              </Button>
            )}
          </div>
        )}
        
        <p className="text-xs text-muted-foreground text-center">
          JPG, PNG ou WebP • Máximo 2MB
        </p>
      </div>
    </div>
  );
};