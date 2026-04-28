import { useState, useEffect } from 'react';
import { Wifi, WifiOff, Zap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';

export const RealtimeStatus = () => {
  const [isConnected, setIsConnected] = useState(true);
  const [isRealtimeActive, setIsRealtimeActive] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  useEffect(() => {
    // Verificar conectividade com Supabase
    const checkConnection = async () => {
      try {
        const { error } = await supabase.from('barbeiros').select('id').limit(1);
        setIsConnected(!error);
        if (!error) {
          setLastUpdate(new Date());
        }
      } catch {
        setIsConnected(false);
      }
    };

    // Verificar status do realtime
    const checkRealtime = () => {
      const hasChannels = supabase.realtime.channels.length > 0;
      const hasConnectedChannels = supabase.realtime.channels.some(
        channel => channel.state === 'joined'
      );
      setIsRealtimeActive(hasChannels && hasConnectedChannels);
    };

    // Verificar conectividade inicial
    checkConnection();
    checkRealtime();

    // Verificar conectividade periodicamente
    const connectivityInterval = setInterval(checkConnection, 30000); // 30 segundos
    const realtimeInterval = setInterval(checkRealtime, 5000); // 5 segundos

    // Verificar conectividade online/offline
    const handleOnline = () => setIsConnected(true);
    const handleOffline = () => setIsConnected(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      clearInterval(connectivityInterval);
      clearInterval(realtimeInterval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const formatLastUpdate = (date: Date | null) => {
    if (!date) return 'Verificando...';
    
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const seconds = Math.floor(diff / 1000);
    
    if (seconds < 60) return 'Agora mesmo';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}min atrás`;
    return date.toLocaleTimeString();
  };

  return (
    <div className="flex items-center gap-2 text-sm">
      <Badge 
        variant={isConnected ? "default" : "destructive"}
        className="flex items-center gap-1"
      >
        {isConnected ? (
          <Wifi className="h-3 w-3" />
        ) : (
          <WifiOff className="h-3 w-3" />
        )}
        {isConnected ? 'Conectado' : 'Desconectado'}
      </Badge>
      
      {isConnected && (
        <Badge 
          variant={isRealtimeActive ? "secondary" : "outline"}
          className="flex items-center gap-1"
        >
          <Zap className={`h-3 w-3 ${isRealtimeActive ? 'text-green-500' : 'text-gray-400'}`} />
          {isRealtimeActive ? 'Real-time' : 'Estático'}
        </Badge>
      )}
      
      {lastUpdate && (
        <span className="text-muted-foreground text-xs">
          {formatLastUpdate(lastUpdate)}
        </span>
      )}
    </div>
  );
};