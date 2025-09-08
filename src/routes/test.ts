import { Hono } from 'hono'

const app = new Hono()

// Endpoint de teste simples
app.post('/api/test', async (c) => {
  try {
    const body = await c.req.json()
    
    return c.json({
      success: true,
      message: `Recebi sua mensagem: "${body.message}"`,
      timestamp: new Date().toISOString(),
      response: 'Sistema funcionando corretamente!'
    })
  } catch (error: any) {
    return c.json({
      success: false,
      error: error.message
    }, 500)
  }
})

// Endpoint de teste GET
app.get('/api/test', (c) => {
  return c.json({
    success: true,
    status: 'online',
    message: 'API de teste funcionando'
  })
})

export default app