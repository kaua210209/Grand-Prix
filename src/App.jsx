import React, { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import { AlertTriangle, Package, DollarSign, Activity, Clock, Play, Trash2 } from 'lucide-react';
import Swal from 'sweetalert2'; // Importação do SweetAlert2

const COLORS = ['#ef4444', '#f97316', '#3b82f6', '#eab308'];

function App() {
  const [data, setData] = useState([]);

  useEffect(() => {
    fetchDeteccoes();

    // Inscrição em Tempo Real
    const subscription = supabase
      .channel('deteccoes_realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'deteccoes' }, 
        payload => {
          setData(prev => [payload.new, ...prev]);
          
          // DISPARAR ALERTA AUTOMÁTICO
          dispararAlertaContaminacao(payload.new.tipo_contaminante);
        })
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

  // Configuração do Alerta Visual Estilizado
  const dispararAlertaContaminacao = (tipo) => {
    Swal.fire({
      title: '⚠️ ALERTA DE QUALIDADE',
      html: `Detectado material <b>${tipo.toUpperCase()}</b> na linha!<br><small>O item foi desviado para a caixa de refugo.</small>`,
      icon: 'error',
      timer: 3500,
      timerProgressBar: true,
      toast: false,
      position: 'center',
      showConfirmButton: false,
      background: '#fff',
      color: '#1f2937',
      backdrop: `rgba(239, 68, 68, 0.2)`
    });
  };

  async function simularDeteccao() {
    const tipos = ['Ferroso', 'Não Ferroso', 'Inox', 'Metálico'];
    const tipoSorteado = tipos[Math.floor(Math.random() * tipos.length)];
    
    const { error } = await supabase
      .from('deteccoes')
      .insert([{ 
        tipo_contaminante: tipoSorteado, 
        custo_prejuizo: 1.50, 
        status: 'Contaminado' 
      }]);
    
    if (error) {
      Swal.fire('Erro de Conexão', 'Verifique a RLS no Supabase', 'warning');
    }
  }

  async function resetarProducao() {
    Swal.fire({
      title: 'Reiniciar Turno?',
      text: "Isso apagará todos os registros de contaminação!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#4f46e5',
      cancelButtonColor: '#ef4444',
      confirmButtonText: 'Sim, resetar!',
      cancelButtonText: 'Cancelar'
    }).then(async (result) => {
      if (result.isConfirmed) {
        const { error } = await supabase.from('deteccoes').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        if (!error) {
          setData([]);
          Swal.fire('Sucesso', 'Dados limpos com sucesso!', 'success');
        }
      }
    });
  }

  // Regra de Negócio: 1 contaminado para 13 não contaminados
  const totalDefeitos = data.length;
  const totalProducaoCalculado = totalDefeitos * 14; 
  const prejuizoTotal = data.reduce((acc, curr) => acc + Number(curr.custo_prejuizo), 0);
  const taxaContaminacao = totalProducaoCalculado > 0 ? ((totalDefeitos / totalProducaoCalculado) * 100).toFixed(2) : "0.00";

  const dadosPizza = [
    { name: 'Ferroso', value: data.filter(d => d.tipo_contaminante === 'Ferroso').length },
    { name: 'Não Ferroso', value: data.filter(d => d.tipo_contaminante === 'Não Ferroso').length },
    { name: 'Inox', value: data.filter(d => d.tipo_contaminante === 'Inox').length },
    { name: 'Metálico', value: data.filter(d => d.tipo_contaminante === 'Metálico').length },
  ].filter(d => d.value > 0);

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans">
      <header className="mb-8 flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
        <div>
          <h1 className="text-4xl font-black text-indigo-950 tracking-tight">Doces Mirahy</h1>
          <p className="text-slate-400 font-bold text-xs uppercase tracking-[0.3em]">Monitoramento em Tempo Real</p>
        </div>
        
        <div className="flex gap-4">
          <button onClick={simularDeteccao} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-2xl font-black shadow-lg shadow-indigo-200 transition-all active:scale-95">
            <Play size={20} fill="currentColor" /> SIMULAR SENSOR
          </button>
          <button onClick={resetarProducao} className="flex items-center gap-2 bg-slate-100 hover:bg-red-50 text-slate-400 hover:text-red-500 px-6 py-3 rounded-2xl font-bold transition-all">
            <Trash2 size={20} /> RESET
          </button>
        </div>
      </header>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 text-white">
        <CardKpi icon={<Package size={28}/>} title="Produção Total" value={`${totalProducaoCalculado} un`} color="bg-blue-600" />
        <CardKpi icon={<AlertTriangle size={28}/>} title="Contaminados" value={`${totalDefeitos} un`} color="bg-red-500" />
        <CardKpi icon={<Activity size={28}/>} title="Taxa de Erro" value={`${taxaContaminacao}%`} color="bg-amber-500" />
        <CardKpi icon={<DollarSign size={28}/>} title="Prejuízo" value={`R$ ${prejuizoTotal.toFixed(2)}`} color="bg-emerald-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Gráfico */}
        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
          <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-8 text-center">Tipos de Materiais</h3>
          <div className="h-64">
            {data.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={dadosPizza} innerRadius={70} outerRadius={90} paddingAngle={10} dataKey="value">
                    {dadosPizza.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" />)}
                  </Pie>
                  <Tooltip />
                  <Legend verticalAlign="bottom" height={36}/>
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-300 italic text-sm">Aguardando sinais do sensor...</div>
            )}
          </div>
        </div>

        {/* Lista */}
        <div className="lg:col-span-2 bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
          <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-8 flex items-center gap-2">
            <Clock size={18}/> Histórico da Linha
          </h3>
          <div className="overflow-y-auto max-h-[350px] pr-4 custom-scrollbar">
            <table className="w-full text-left">
              <thead>
                <tr className="text-slate-300 text-[10px] font-black uppercase tracking-widest">
                  <th className="pb-4">Data/Hora</th>
                  <th className="pb-4">Material</th>
                  <th className="pb-4 text-right">Perda</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {data.map((item) => (
                  <tr key={item.id} className="group transition-colors hover:bg-slate-50">
                    <td className="py-4 text-sm font-bold text-slate-500">{new Date(item.data_hora).toLocaleString('pt-BR')}</td>
                    <td className="py-4">
                      <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase ${
                        item.tipo_contaminante === 'Ferroso' ? 'bg-red-500 text-white' :
                        item.tipo_contaminante === 'Não Ferroso' ? 'bg-orange-500 text-white' :
                        item.tipo_contaminante === 'Metálico' ? 'bg-yellow-500 text-white' : 'bg-blue-500 text-white'
                      }`}>
                        {item.tipo_contaminante}
                      </span>
                    </td>
                    <td className="py-4 text-right font-black text-red-500">- R$ {Number(item.custo_prejuizo).toFixed(2)}</td>
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
    <div className={`p-8 rounded-[2.5rem] shadow-xl ${color} flex items-center gap-6 transition-transform hover:scale-[1.03]`}>
      <div className="bg-white/20 p-4 rounded-3xl text-white">{icon}</div>
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest opacity-70 mb-1">{title}</p>
        <p className="text-3xl font-black tracking-tight">{value}</p>
      </div>
    </div>
  );
}

export default App;