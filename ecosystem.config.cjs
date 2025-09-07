// PM2 Configuration for Wiser IA Assistant
module.exports = {
  apps: [
    {
      name: 'wiser-ia',
      script: 'npx',
      args: 'wrangler pages dev dist --kv=KV --ip 0.0.0.0 --port 3000',
      env: {
        NODE_ENV: 'development',
        PORT: 3000
      },
      watch: false,
      instances: 1,
      exec_mode: 'fork',
      autorestart: false,
      max_restarts: 3
    }
  ]
}