#!/bin/bash
set -e

echo "🚀 Setting up Voice Agent Workshop development environment..."

# Install root dependencies (wrangler, typescript, workers-types)
echo "📦 Installing root dependencies..."
npm install

# Install client dependencies (Vue, Vite, etc.)
echo "📦 Installing client dependencies..."
cd client && npm install && cd ..

echo ""
echo "✅ Setup complete!"
echo ""
echo "Available commands:"
echo "  npm run dev          - Start Wrangler dev server (worker + assets)"
echo "  npm run client:dev   - Start Vite client dev server only"
echo "  npm run client:build - Build the client SPA"
echo "  npm run deploy       - Deploy to Cloudflare Workers"
echo "  wrangler login       - Authenticate with Cloudflare"
echo ""
