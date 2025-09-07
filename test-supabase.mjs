import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://tecvgnrqcfqcrcodrjtt.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRlY3ZnbnJxY2ZxY3Jjb2RyanR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzI3MjE1MzQsImV4cCI6MjA0ODI5NzUzNH0.j6rk4Y9GMZu0CAr20gbLlGdZPnGCB-yiwfjxRWxiuZE';

async function testConnection() {
  console.log('Testing Supabase connection...');
  console.log('URL:', supabaseUrl);
  
  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Test query
    const { data, error, count } = await supabase
      .from('estoque')
      .select('*', { count: 'exact', head: true });
    
    if (error) {
      console.error('❌ Error:', error);
      return;
    }
    
    console.log('✅ Connection successful!');
    console.log('Total records:', count);
    
    // Get a sample with specific product
    const { data: sample } = await supabase
      .from('estoque')
      .select('*')
      .eq('codigo_produto', '000032')
      .limit(5);
    
    console.log('Product 000032 data:', sample);
    
  } catch (err) {
    console.error('❌ Connection failed:', err);
  }
}

testConnection();
