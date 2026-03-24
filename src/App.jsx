import React, { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { AlertTriangle, Package, DollarSign, Activity, Clock } from 'lucide-react';

const COLORS = ['#ef4444', '#f97316', '#3b82f6'];

function App() {
  const [data, setData] = useState([]);
  const [totalProducao, setTotalProducao] = useState(1500); // Exemplo de meta/total

  useEffect(() => {
    fetchDeteccoes();

    // Inscrição em Tempo Real
    const subscription = supabase
      .channel('deteccoes_realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'deteccoes' }, 
        payload => setData(prev => [payload.new, ...prev]))
      .subscribe();

    return () => supabase.removeChannel(subscription);
  }, []);

  async function fetchDeteccoes() {
    const { data: logs, error } = await supabase
      .from('deteccoes')
      .select('*')
      .order('data_hora', { ascending: false });
    if (!error) setData(logs);
  }

  // Cálculos
  const totalDefeitos = data.length;
  const prejuizoTotal = data.reduce((acc, curr) => acc + Number(curr.custo_prejuizo), 0);
  const taxaContaminacao = ((totalDefeitos / totalProducao) * 100).toFixed(2);

  const dadosPizza = [
    { name: 'Ferroso', value: data.filter(d => d.tipo_contaminante === 'Ferroso').length },
    { name: 'Não Ferroso', value: data.filter(d => d.tipo_contaminante === 'Não Ferroso').length },
    { name: 'Inox', value: data.filter(d => d.tipo_contaminante === 'Inox').length },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8 font-sans">
      <header className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Doces Mirahy</h1>
          <p className="text-gray-500">Monitoramento Sensorial de Barras 30g</p>
        </div>
        <div className="bg-green-100 text-green-700 px-4 py-2 rounded-full flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          Sistema Online
        </div>
      </header>

      {/* Grid de KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <CardKpi icon={<Package size={24}/>} title="Total Produzido" value={`${totalProducao} un`} color="bg-blue-500" />
        <CardKpi icon={<AlertTriangle size={24}/>} title="Defeitos Detectados" value={`${totalDefeitos} un`} color="bg-red-500" />
        <CardKpi icon={<Activity size={24}/>} title="Taxa de Contaminação" value={`${taxaContaminacao}%`} color="bg-orange-500" />
        <CardKpi icon={<DollarSign size={24}/>} title="Prejuízo Acumulado" value={`R$ ${prejuizoTotal.toFixed(2)}`} color="bg-red-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Gráfico de Distribuição */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold mb-4">Tipos de Contaminantes</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={dadosPizza} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                  {dadosPizza.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Log de Ocorrências */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Clock size={20}/> Histórico de Detecções (Tempo Real)
          </h3>
          <div className="overflow-y-auto max-h-64">
            <table className="w-full text-left">
              <thead>
                <tr className="text-gray-400 border-b">
                  <th className="pb-2 font-medium">Data/Hora</th>
                  <th className="pb-2 font-medium">Tipo</th>
                  <th className="pb-2 font-medium text-right">Prejuízo</th>
                </tr>
              </thead>
              <tbody>
                {data.map((item) => (
                  <tr key={item.id} className="border-b last:border-0 hover:bg-gray-50 transition-colors">
                    <td className="py-3 text-sm">{new Date(item.data_hora).toLocaleString()}</td>
                    <td className="py-3"><span className="px-2 py-1 bg-red-100 text-red-600 rounded text-xs">{item.tipo_contaminante}</span></td>
                    <td className="py-3 text-right font-semibold text-red-500">R$ {item.custo_prejuizo}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function CardKpi({ icon, title, value, color }) {
  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
      <div className={`${color} p-3 rounded-lg text-white`}>{icon}</div>
      <div>
        <p className="text-sm text-gray-500 font-medium">{title}</p>
        <p className="text-2xl font-bold text-gray-800">{value}</p>
      </div>
    </div>
  );
}

export default App;