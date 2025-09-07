// Mock data for demonstration when Supabase is unavailable
export const mockInventoryData = [
  {
    id: 1,
    codigo_produto: "000032",
    descricao_produto: "PRODUTO TESTE EXEMPLO 032",
    saldo_disponivel_produto: 150.5,
    saldo_bloqueado_produto: "Avaria",
    lote_industria_produto: "L2024001",
    local_produto: "A-01-B",
    armazem: "BARUERI"
  },
  {
    id: 2,
    codigo_produto: "000032",
    descricao_produto: "PRODUTO TESTE EXEMPLO 032",
    saldo_disponivel_produto: 200,
    saldo_bloqueado_produto: null,
    lote_industria_produto: "L2024002",
    local_produto: "A-01-C",
    armazem: "BARUERI"
  },
  {
    id: 3,
    codigo_produto: "000032",
    descricao_produto: "PRODUTO TESTE EXEMPLO 032",
    saldo_disponivel_produto: 75,
    saldo_bloqueado_produto: "Vencido",
    lote_industria_produto: "L2024003",
    local_produto: "A-01-D",
    armazem: "BARUERI"
  },
  {
    id: 4,
    codigo_produto: "000004",
    descricao_produto: "PRODUTO ESPECIAL 004",
    saldo_disponivel_produto: 500,
    saldo_bloqueado_produto: null,
    lote_industria_produto: "L2024010",
    local_produto: "B-02-A",
    armazem: "BARUERI"
  },
  {
    id: 5,
    codigo_produto: "000004",
    descricao_produto: "PRODUTO ESPECIAL 004",
    saldo_disponivel_produto: 350,
    saldo_bloqueado_produto: null,
    lote_industria_produto: "L2024011",
    local_produto: "B-02-B",
    armazem: "BARUERI"
  },
  {
    id: 6,
    codigo_produto: "000123",
    descricao_produto: "PRODUTO PREMIUM 123",
    saldo_disponivel_produto: 1000,
    saldo_bloqueado_produto: null,
    lote_industria_produto: "L2024020",
    local_produto: "C-03-A",
    armazem: "SAO PAULO"
  },
  {
    id: 7,
    codigo_produto: "000123",
    descricao_produto: "PRODUTO PREMIUM 123",
    saldo_disponivel_produto: 50,
    saldo_bloqueado_produto: "Avaria",
    lote_industria_produto: "L2024021",
    local_produto: "C-03-B",
    armazem: "SAO PAULO"
  }
];

export function getMockData() {
  console.log('⚠️ Using mock data for demonstration (Supabase key invalid)');
  return mockInventoryData;
}

export function searchMockProduct(productCode: string) {
  return mockInventoryData.filter(item => item.codigo_produto === productCode);
}

export function getMockSummary() {
  const totalRecords = mockInventoryData.length;
  const uniqueProducts = new Set(mockInventoryData.map(item => item.codigo_produto)).size;
  const totalBalance = mockInventoryData.reduce((sum, item) => sum + item.saldo_disponivel_produto, 0);
  const blockedCount = mockInventoryData.filter(item => 
    item.saldo_bloqueado_produto === 'Avaria' || 
    item.saldo_bloqueado_produto === 'Vencido'
  ).length;
  
  return {
    totalRecords,
    uniqueProducts,
    totalBalance,
    blockedCount
  };
}