// Database connection handler for Cloudflare Workers
// Using HTTP-based connection for PostgreSQL compatibility

interface DatabaseQueryResult {
  rows: any[];
  rowCount: number;
}

export class DatabaseClient {
  private connectionString: string;
  
  constructor(connectionString: string) {
    this.connectionString = connectionString;
  }
  
  // Parse PostgreSQL connection string
  private parseConnectionString(url: string): {
    host: string;
    port: string;
    database: string;
    username: string;
    password: string;
  } {
    const parsed = new URL(url);
    return {
      host: parsed.hostname,
      port: parsed.port || '5432',
      database: parsed.pathname.slice(1),
      username: parsed.username,
      password: parsed.password
    };
  }
  
  // For Cloudflare Workers, we'll use a PostgreSQL REST API approach
  // This is a simplified version - in production, use services like:
  // - Neon (https://neon.tech) with their serverless driver
  // - Supabase REST API
  // - PlanetScale serverless driver
  async query(sql: string, params: any[] = []): Promise<DatabaseQueryResult> {
    // Check if it's a Neon database URL
    if (this.connectionString.includes('neon.tech')) {
      return this.queryNeon(sql, params);
    }
    
    // Check if it's a Supabase URL
    if (this.connectionString.includes('supabase')) {
      return this.querySupabase(sql, params);
    }
    
    // For local development or other databases, return mock data
    // In production, you'd need to use a compatible service
    console.warn('Database connection not fully implemented for this provider');
    console.log('Query:', sql, 'Params:', params);
    
    return {
      rows: [],
      rowCount: 0
    };
  }
  
  // Neon serverless driver implementation
  private async queryNeon(sql: string, params: any[]): Promise<DatabaseQueryResult> {
    try {
      // Extract connection details
      const { host, database, username, password } = this.parseConnectionString(this.connectionString);
      
      // Neon provides a SQL-over-HTTP endpoint
      const apiUrl = `https://${host}/sql`;
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${btoa(`${username}:${password}`)}`,
          'Content-Type': 'application/json',
          'Neon-Connection-String': this.connectionString
        },
        body: JSON.stringify({
          query: sql,
          params: params
        })
      });
      
      if (!response.ok) {
        throw new Error(`Database query failed: ${response.statusText}`);
      }
      
      const data = await response.json();
      return {
        rows: data.rows || [],
        rowCount: data.rowCount || 0
      };
    } catch (error) {
      console.error('Neon query error:', error);
      throw error;
    }
  }
  
  // Supabase REST API implementation
  private async querySupabase(sql: string, params: any[]): Promise<DatabaseQueryResult> {
    try {
      // Parse Supabase connection string to get project ref
      const url = new URL(this.connectionString);
      const projectRef = url.hostname.split('.')[0];
      
      // For Supabase, you'd typically use their REST API
      // This is a simplified example
      const apiUrl = `https://${projectRef}.supabase.co/rest/v1/rpc/query`;
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': url.password, // Supabase uses the password as API key
          'Authorization': `Bearer ${url.password}`
        },
        body: JSON.stringify({
          query: sql,
          params: params
        })
      });
      
      if (!response.ok) {
        throw new Error(`Database query failed: ${response.statusText}`);
      }
      
      const data = await response.json();
      return {
        rows: Array.isArray(data) ? data : [data],
        rowCount: Array.isArray(data) ? data.length : 1
      };
    } catch (error) {
      console.error('Supabase query error:', error);
      throw error;
    }
  }
  
  async connect(): Promise<void> {
    // Connection is handled per-request in serverless environment
    console.log('Database client initialized');
  }
  
  async end(): Promise<void> {
    // No persistent connection to close in serverless
    console.log('Database client closed');
  }
}

// Helper function to test database connection
export async function testDatabaseConnection(connectionString: string): Promise<{
  success: boolean;
  message: string;
  serverTime?: string;
}> {
  try {
    const client = new DatabaseClient(connectionString);
    const result = await client.query('SELECT NOW() as now', []);
    
    if (result.rows.length > 0) {
      return {
        success: true,
        message: 'Conexão bem-sucedida!',
        serverTime: result.rows[0].now
      };
    }
    
    return {
      success: false,
      message: 'Conexão estabelecida mas sem resposta do servidor'
    };
  } catch (error: any) {
    return {
      success: false,
      message: `Erro de conexão: ${error.message}`
    };
  }
}