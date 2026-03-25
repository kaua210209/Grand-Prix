import { supabase } from './supabaseClient';

export const iniciarSimulador = () => {
  console.log("🚀 Simulador de Esteira Doces Mirahy Iniciado...");
  
  setInterval(async () => {
    const tipos = ['Ferroso', 'Não Ferroso', 'Inox'];
    const sorteio = Math.random();

    // Simula que 20% das barras podem estar contaminadas (para teste)
    if (sorteio > 0.8) {
      const tipoSorteado = tipos[Math.floor(Math.random() * tipos.length)];
      
      const { error } = await supabase
        .from('deteccoes')
        .insert([{ 
          tipo_contaminante: tipoSorteado, 
          custo_prejuizo: 1.50,
          status: 'Contaminado' 
        }]);

      if (!error) console.log(`⚠️ Alerta: Metal ${tipoSorteado} detectado!`);
    }
  }, 5000); // Tenta detectar a cada 5 segundos
};