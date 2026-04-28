import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, LabelList } from 'recharts';
import { Clock, Calendar, TrendingUp } from 'lucide-react';
import { HourAnalytics, DayOfWeekAnalytics } from '@/utils/analyticsCalculations';
interface BusiestTimesAnalysisProps {
  hourAnalytics: HourAnalytics[];
  dayOfWeekAnalytics: DayOfWeekAnalytics[];
}
const COLORS = {
  primary: '#3B82F6',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444'
};
export const BusiestTimesAnalysis: React.FC<BusiestTimesAnalysisProps> = ({
  hourAnalytics,
  dayOfWeekAnalytics
}) => {
  return <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Análise por Horário */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Horários Mais Movimentados
          </CardTitle>
          <CardDescription>
            Distribuição de atendimentos ao longo do dia
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={hourAnalytics.slice(0, 13)} margin={{
              top: 20,
              right: 30,
              left: 20,
              bottom: 5
            }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis dataKey="hora" tick={{
                fontSize: 12,
                fill: 'hsl(var(--foreground))'
              }} axisLine={{
                stroke: 'hsl(var(--border))'
              }} />
                <YAxis tick={{
                fontSize: 12,
                fill: 'hsl(var(--foreground))'
              }} axisLine={{
                stroke: 'hsl(var(--border))'
              }} />
                <Tooltip formatter={(value, name) => [name === 'atendimentos' ? `${value} atendimentos` : `R$ ${Number(value).toFixed(2)}`, name === 'atendimentos' ? 'Atendimentos' : 'Faturamento']} contentStyle={{
                backgroundColor: 'hsl(var(--popover))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px'
              }} />
                <Line type="monotone" dataKey="atendimentos" stroke={COLORS.primary} strokeWidth={3} dot={{
                fill: COLORS.primary,
                strokeWidth: 2,
                r: 4
              }} />
              </LineChart>
            </ResponsiveContainer>
            
            <div className="space-y-2">
              <h4 className="font-semibold text-sm">Top 5 Horários</h4>
              {hourAnalytics.slice(0, 5).map((item, index) => <div key={item.hora} className="flex justify-between items-center p-2 rounded border">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-muted-foreground">#{index + 1}</span>
                    <span className="font-medium">{item.hora}</span>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-sm">{item.atendimentos} atendimentos</div>
                    <div className="text-xs text-muted-foreground">R$ {item.faturamento.toFixed(2)}</div>
                  </div>
                </div>)}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Análise por Dia da Semana */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-success" />
            Dias da Semana Mais Movimentados
          </CardTitle>
          <CardDescription>
            Distribuição de atendimentos por dia da semana
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dayOfWeekAnalytics} margin={{
              top: 20,
              right: 30,
              left: 20,
              bottom: 5
            }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis dataKey="diaSemana" tick={{
                fontSize: 11,
                fill: 'hsl(var(--foreground))'
              }} axisLine={{
                stroke: 'hsl(var(--border))'
              }} angle={-45} textAnchor="end" height={60} />
                <YAxis tick={{
                fontSize: 12,
                fill: 'hsl(var(--foreground))'
              }} axisLine={{
                stroke: 'hsl(var(--border))'
              }} />
                <Tooltip formatter={(value, name) => [name === 'atendimentos' ? `${value} atendimentos` : `${Number(value).toFixed(1)}%`, name === 'atendimentos' ? 'Atendimentos' : 'Percentual']} contentStyle={{
                backgroundColor: 'hsl(var(--popover))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px'
              }} />
                <Bar dataKey="atendimentos" fill={COLORS.success} radius={[4, 4, 0, 0]}>
                  <LabelList dataKey="atendimentos" position="top" offset={5} fontSize="12" fill="hsl(var(--foreground))" />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            
            <div className="space-y-2">
              <h4 className="font-semibold text-sm">Ranking dos Dias</h4>
              {dayOfWeekAnalytics.slice(0, 7).map((item, index) => <div key={item.diaSemana} className="flex justify-between items-center p-2 rounded border">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-muted-foreground">#{index + 1}</span>
                    <span className="font-medium">{item.diaSemana}</span>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-sm">{item.atendimentos} atendimentos</div>
                    <div className="text-xs text-muted-foreground">
                      {item.percentual.toFixed(1)}% • R$ {item.faturamento.toFixed(2)}
                    </div>
                  </div>
                </div>)}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabela Resumo Completa */}
      
    </div>;
};