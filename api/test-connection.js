// Vercel serverless function for testing database connection
export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Check Supabase configuration
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return res.status(200).json({
      connected: false,
      error: 'Supabase not configured',
      summary: {
        totalRecords: 0,
        uniqueProducts: 0,
        totalBalance: 0
      }
    });
  }

  try {
    // Try to connect to Supabase
    const response = await fetch(`${supabaseUrl}/rest/v1/estoque_inventario`, {
      method: 'HEAD',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      }
    });

    const connected = response.ok;

    // Return mock data for now
    return res.status(200).json({
      connected,
      summary: {
        totalRecords: 1000,
        uniqueProducts: 50,
        totalBalance: 25000,
        message: connected ? 'Database connected' : 'Using mock data'
      }
    });

  } catch (error) {
    return res.status(200).json({
      connected: false,
      error: error.message,
      summary: {
        totalRecords: 0,
        uniqueProducts: 0,
        totalBalance: 0
      }
    });
  }
}