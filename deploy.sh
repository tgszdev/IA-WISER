#!/bin/bash

# Deploy Script para Wiser IA v2.0
echo "🚀 Deploy do Wiser IA Assistant v2.0"
echo "======================================"
echo ""
echo "📦 Criando arquivo tar.gz do projeto..."

# Criar arquivo compactado
cd /home/user
tar -czf wiser-ia-v2-complete.tar.gz webapp/

echo "✅ Arquivo criado: wiser-ia-v2-complete.tar.gz"
echo ""
echo "📋 Instruções para deploy manual:"
echo ""
echo "1. Copie o arquivo wiser-ia-v2-complete.tar.gz para seu computador"
echo ""
echo "2. No seu computador, execute:"
echo "   tar -xzf wiser-ia-v2-complete.tar.gz"
echo "   cd webapp"
echo ""
echo "3. Configure git e faça push:"
echo "   git init"
echo "   git add ."
echo "   git commit -m '✨ Wiser IA v2.0 - Sistema completo'"
echo "   git branch -M main"
echo "   git remote add origin https://github.com/tgszdev/IA-WISER.git"
echo "   git push -f origin main"
echo ""
echo "4. Ou use GitHub Desktop/VS Code para fazer o push"
echo ""
echo "📦 Backup online disponível em:"
echo "https://page.gensparksite.com/project_backups/toolu_019V9oiKsWotEZUhkPze2PNa.tar.gz"
echo ""
echo "✅ Projeto 100% completo e pronto para deploy!"