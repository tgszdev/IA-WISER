const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://tecvgnrqcfqcrcodrjtt.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRlY3ZnbnJxY2ZxY3Jjb2RyanR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzI3MjE1MzQsImV4cCI6MjA0ODI5NzUzNH0.j6rk4Y9GMZu0CAr20gbLlGdZPnGCB-yiwfjxRWxiuZE';

async function testConnection() {
  console.log('Testing Supabase connection...');
  
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
    
    // Get a sample
    const { data: sample } = await supabase
      .from('estoque')
      .select('*')
      .limit(3);
    
    console.log('Sample data:', sample);
    
  } catch (err) {
    console.error('❌ Connection failed:', err);
  }
}

testConnection();
