// Health Check API
export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { createClient } = await import('@supabase/supabase-js');
    
    const SUPABASE_URL = process.env.SUPABASE_URL || 'https://tecvgnrqcfqcrcodrjtt.supabase.co';
    const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRlY3ZnbnJxY2ZxY3Jjb2RyanR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcxNzYyNzUsImV4cCI6MjA3Mjc1MjI3NX0.zj1LLK8iDRCDq9SpedhTwZNnSOdG3WNc9nH5xBBcx1A';
    
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    
    // Test connection
    const { count, error } = await supabase
      .from('estoque')
      .select('*', { count: 'exact', head: true });
    
    const isConnected = !error && count !== null;
    
    return res.status(200).json({
      success: true,
      status: isConnected ? 'healthy' : 'degraded',
      database: {
        connected: isConnected,
        totalRecords: count || 0,
        message: isConnected ? `Connected - ${count} records available` : 'Connection failed'
      },
      environment: process.env.NODE_ENV || 'production',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    return res.status(500).json({
      success: false,
      status: 'error',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}