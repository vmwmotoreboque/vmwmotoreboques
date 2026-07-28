#!/bin/bash

echo "🚀 Deploy do Worker Cloudflare VMW..."

# Instalar dependências
npm install

# Criar KV namespace
echo "📦 Criando KV namespace..."
npx wrangler kv:namespace create VMV_CONFIG || true
npx wrangler kv:namespace create VMV_CONFIG --preview || true

# Fazer deploy
echo "📤 Fazendo deploy..."
npx wrangler deploy

echo "✅ Worker deployado com sucesso!"
echo "📍 URL: https://vmw-config-api.vmwreboques.workers.dev"