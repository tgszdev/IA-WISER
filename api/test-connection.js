// API para testar conexões (usado pela página debug.html)
import { testConnection as testSupabase, getEstoqueData } from './supabase-client.js';

export default async function handler(req, res) {
  // Habilitar CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { test } = req.body;

    if (test === 'supabase') {
      // Test Supabase connection
      console.log('Testing Supabase connection...');
      
      // Check if environment variables are set
      const hasUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL;
      const hasKey = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      
      if (!hasUrl || !hasKey) {
        return res.status(200).json({
          success: false,
          error: 'Variáveis NEXT_PUBLIC_SUPABASE_URL ou NEXT_PUBLIC_SUPABASE_ANON_KEY não configuradas',
          details: {
            hasUrl,
            hasKey
          }
        });
      }

      // Try to connect and get data
      try {
        const result = await testSupabase();
        
        if (result.success) {
          // Try to get record count
          const data = await getEstoqueData(1);
          const fullData = await getEstoqueData(); // Busca TODOS os registros sem limite
          
          return res.status(200).json({
            success: true,
            message: 'Conexão Supabase funcionando',
            recordCount: fullData.length,
            sample: data[0] || null
          });
        } else {
          return res.status(200).json({
            success: false,
            error: result.error || 'Erro ao conectar com Supabase'
          });
        }
      } catch (error) {
        return res.status(200).json({
          success: false,
          error: `Erro de conexão: ${error.message}`
        });
      }
    }

    if (test === 'google') {
      // Test Google AI configuration
      const hasGoogleKey = !!process.env.GOOGLE_API_KEY;
      
      if (!hasGoogleKey) {
        return res.status(200).json({
          success: false,
          error: 'GOOGLE_API_KEY não configurada no Vercel'
        });
      }

      // Try a simple test with Google AI
      try {
        const { GoogleGenerativeAI } = await import('@google/generative-ai');
        const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        
        const result = await model.generateContent("Responda apenas: OK");
        const response = await result.response;
        const text = response.text();
        
        return res.status(200).json({
          success: true,
          message: 'Google AI configurado e funcionando',
          test: text.includes('OK')
        });
      } catch (error) {
        return res.status(200).json({
          success: false,
          error: `Erro Google AI: ${error.message}`
        });
      }
    }

    return res.status(400).json({
      error: 'Tipo de teste inválido. Use "supabase" ou "google"'
    });

  } catch (error) {
    console.error('Test connection error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}