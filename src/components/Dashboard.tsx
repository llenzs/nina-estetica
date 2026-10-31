import React, { useEffect, useState } from 'react';
import { Activity, Sparkles, MessageSquare, Heart, Loader2, TrendingUp, TrendingDown, ArrowUpRight } from 'lucide-react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { StatMetric } from '../types';
import { api } from '../services/api';
import { OnboardingBanner } from './OnboardingBanner';
import { SystemHealthCard } from './SystemHealthCard';
import { useOutletContext } from 'react-router-dom';

interface OutletContext {
  showOnboarding: boolean;
  setShowOnboarding: (show: boolean) => void;
}

type PeriodFilter = 'today' | '7days' | '30days';

const periodLabels: Record<PeriodFilter, string> = {
  today: 'Hoje',
  '7days': '7 Dias',
  '30days': '30 Dias'
};

const periodDays: Record<PeriodFilter, number> = {
  today: 1,
  '7days': 7,
  '30days': 30
};

const Dashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<StatMetric[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<PeriodFilter>('today');
  const { setShowOnboarding } = useOutletContext<OutletContext>();

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const days = periodDays[period];
        const [metricsData, chartDataResponse] = await Promise.all([
          api.fetchDashboardMetrics(days),
          api.fetchChartData(days)
        ]);
        setMetrics(metricsData);
        setChartData(chartDataResponse);
      } catch (error) {
        console.error("Erro ao carregar dashboard:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [period]);

  const getIcon = (label: string) => {
    if (label.includes('Agendament') || label.includes('Procedim')) return <Sparkles className="h-5 w-5 text-amber-400" />;
    if (label.includes('Atendimento') || label.includes('Conversa')) return <MessageSquare className="h-5 w-5 text-rose-400" />;
    if (label.includes('Cliente') || label.includes('Lead')) return <Heart className="h-5 w-5 text-pink-400" />;
    return <Activity className="h-5 w-5 text-orange-400" />;
  };

  const getGradient = (label: string) => {
    if (label.includes('Agendament') || label.includes('Procedim')) return 'from-amber-500/20 to-amber-500/5 border-amber-500/20';
    if (label.includes('Atendimento') || label.includes('Conversa')) return 'from-rose-500/20 to-rose-500/5 border-rose-500/20';
    if (label.includes('Cliente') || label.includes('Lead')) return 'from-pink-500/20 to-pink-500/5 border-pink-500/20';
    return 'from-orange-500/20 to-orange-500/5 border-orange-500/20';
  };

  const getMetricLabel = (baseLabel: string) => {
    // Mantemos os labels que vêm do backend (api.fetchDashboardMetrics) mas
    // mapeamos os antigos rótulos de "SDR" para o vocabulário de beleza.
    const map: Record<string, string> = {
      'Atendimentos Hoje': 'Atendimentos da Nina hoje',
      'Vendas Convertidas': 'Receita estimada',
      'Tempo Médio (TMA)': 'Tempo médio de resposta',
      'Novos Leads': 'Novas clientes interessadas',
    };
    if (map[baseLabel]) return map[baseLabel];

    if (baseLabel.includes('Atendimentos')) {
      return period === 'today' ? 'Atendimentos da Nina hoje' : `Atendimentos (${periodLabels[period]})`;
    }
    if (baseLabel.includes('Leads')) {
      return period === 'today' ? 'Novas clientes interessadas' : `Novas clientes (${periodLabels[period]})`;
    }
    return baseLabel;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
             <div className="absolute inset-0 bg-primary/30 blur-xl rounded-full"></div>
             <Loader2 className="h-10 w-10 animate-spin text-primary relative z-10" />
          </div>
          <p className="text-sm text-muted-foreground font-medium animate-pulse">Preparando seu espelho de performance...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8 overflow-y-auto h-full bg-background text-foreground custom-scrollbar" data-testid="dashboard-root">
      <OnboardingBanner onOpenWizard={() => setShowOnboarding(true)} />

      <SystemHealthCard />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.35em] text-accent font-semibold">Sua clínica em tempo real</p>
          <h2 className="text-3xl font-bold tracking-tight text-foreground mt-1" data-testid="dashboard-title">Visão Geral</h2>
          <p className="text-muted-foreground mt-1">
            Como a Nina está cuidando das suas clientes {period === 'today' ? 'hoje' : `nos últimos ${periodLabels[period].toLowerCase()}`}.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-card p-1 rounded-lg border border-border" role="tablist" aria-label="Período">
          {(['today', '7days', '30days'] as PeriodFilter[]).map((p) => (
            <button
              key={p}
              type="button"
              role="tab"
              aria-selected={period === p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                period === p
                  ? 'bg-primary/15 text-primary shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {periodLabels[p]}
            </button>
          ))}
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {metrics.map((stat, index) => (
          <div
            key={index}
            data-testid="metric-card"
            className={`relative overflow-hidden rounded-2xl border bg-card/60 backdrop-blur-sm p-6 shadow-xl transition-all duration-300 hover:translate-y-[-2px] hover:bg-card group ${getGradient(stat.label)}`}
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <div className="flex flex-row items-center justify-between space-y-0 pb-4">
              <div className="text-sm font-medium text-muted-foreground">{getMetricLabel(stat.label)}</div>
              <div className="p-2 rounded-lg bg-background/60 border border-border/70 group-hover:border-primary/40 transition-colors">
                 {getIcon(stat.label)}
              </div>
            </div>
            <div className="flex items-end justify-between">
                <div className="text-3xl font-bold text-foreground tracking-tight">{stat.value}</div>
                <div className={`flex items-center text-xs font-medium px-2 py-1 rounded-full ${stat.trendUp ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                    {stat.trendUp ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
                    {stat.trend}
                </div>
            </div>
            <div className="absolute -bottom-10 -right-10 w-24 h-24 bg-primary/10 blur-2xl rounded-full group-hover:bg-accent/15 transition-all"></div>
          </div>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid gap-6 md:grid-cols-7">
        <div className="col-span-4 rounded-2xl border border-border bg-card/60 backdrop-blur-sm p-6 shadow-lg">
          <div className="mb-6 flex items-center justify-between">
            <div>
                <h3 className="text-lg font-semibold text-foreground">Volume de Atendimentos da Nina</h3>
                <p className="text-sm text-muted-foreground">
                  Conversas com clientes {period === 'today' ? 'hoje' : `nos últimos ${periodDays[period]} dias`}
                </p>
            </div>
            <button className="text-primary hover:text-primary/80 transition-colors p-2 hover:bg-primary/10 rounded-lg" aria-label="Ver detalhe">
                <ArrowUpRight className="w-5 h-5" />
            </button>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorChats" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.35}/>
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#3a1e26" />
                <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tickMargin={10}
                    fontSize={12}
                    stroke="#a18589"
                />
                <YAxis
                    axisLine={false}
                    tickLine={false}
                    fontSize={12}
                    stroke="#a18589"
                />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1c0d12', borderRadius: '12px', border: '1px solid #3a1e26', color: '#fef2f2', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.5)' }}
                  itemStyle={{ color: '#f43f5e' }}
                />
                <Area
                  type="monotone"
                  dataKey="chats"
                  stroke="#f43f5e"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorChats)"
                  activeDot={{ r: 6, strokeWidth: 0, fill: '#fff' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="col-span-3 rounded-2xl border border-border bg-card/60 backdrop-blur-sm p-6 shadow-lg flex flex-col">
           <div className="mb-6">
            <h3 className="text-lg font-semibold text-foreground">Procedimentos Agendados</h3>
            <p className="text-sm text-muted-foreground">Avaliações, sessões e protocolos confirmados</p>
          </div>

          <div className="flex-1 flex flex-col justify-center space-y-5">
            {chartData.slice(0, 5).map((day, i) => (
              <div key={i} className="group">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-foreground/80">{day.name}</span>
                    <span className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">{day.sales} sessões</span>
                </div>
                <div className="h-2.5 bg-secondary rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-primary to-accent rounded-full shadow-[0_0_10px_rgba(244,63,94,0.3)] transition-all duration-1000 ease-out group-hover:shadow-[0_0_15px_rgba(244,63,94,0.6)]"
                    style={{ width: `${Math.min((day.sales / Math.max(...chartData.map(d => d.sales), 1)) * 100, 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 pt-4 border-t border-border">
             <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Total no período</span>
                <span className="text-accent font-bold">
                  {chartData.reduce((sum, d) => sum + d.sales, 0)} agendamentos
                </span>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
