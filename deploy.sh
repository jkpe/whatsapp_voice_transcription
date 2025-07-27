#!/bin/bash

# WA Transcript Cloudflare Workers Deployment Script
# This script helps set up and deploy the Cloudflare Workers version

set -e

echo "🚀 WA Transcript - Cloudflare Workers Deployment"
echo "================================================"

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo "❌ Wrangler CLI not found. Installing..."
    npm install -g wrangler
fi

echo "✅ Wrangler CLI found"

# Check if user is authenticated
if ! wrangler whoami &> /dev/null; then
    echo "🔐 Please authenticate with Cloudflare..."
    wrangler auth login
fi

echo "✅ Cloudflare authentication confirmed"

# Create src directory if it doesn't exist
mkdir -p src

echo "📝 Setting up environment variables..."

# Function to set a secret if not already set
set_secret_if_needed() {
    local secret_name=$1
    local description=$2
    
    echo "Setting $secret_name ($description):"
    read -s -p "Enter value (leave empty to skip): " secret_value
    echo
    
    if [ ! -z "$secret_value" ]; then
        echo "$secret_value" | wrangler secret put "$secret_name"
        echo "✅ $secret_name set successfully"
    else
        echo "⏭️  Skipping $secret_name"
    fi
}

echo
echo "🔑 Required Secrets:"
set_secret_if_needed "OPENAI_API_KEY" "OpenAI API Key for transcription and summaries"
set_secret_if_needed "WHATSAPP_ACCESS_TOKEN" "WhatsApp Business API Access Token"
set_secret_if_needed "WHATSAPP_PHONE_NUMBER_ID" "WhatsApp Business Phone Number ID"
set_secret_if_needed "WEBHOOK_SECRET" "Webhook verification secret"

echo
echo "🔑 Optional Secrets:"
set_secret_if_needed "ANTHROPIC_API_KEY" "Anthropic API Key (for Claude summaries)"
set_secret_if_needed "DEEPGRAM_API_KEY" "Deepgram API Key (alternative transcription)"

echo
echo "🚀 Deploying to Cloudflare Workers..."
wrangler deploy

echo
echo "✅ Deployment complete!"
echo
echo "📋 Next Steps:"
echo "1. Note your Worker URL from the deployment output above"
echo "2. Go to Facebook Developer Console > WhatsApp > Configuration"
echo "3. Set Webhook URL to: https://your-worker-url.workers.dev/webhook"
echo "4. Set Verify Token to the same value you used for WEBHOOK_SECRET"
echo "5. Subscribe to 'messages' webhook events"
echo "6. Test by sending a voice note to your WhatsApp Business number"
echo
echo "📊 Monitor your worker:"
echo "- View logs: wrangler tail"
echo "- Dashboard: https://dash.cloudflare.com/"
echo
echo "🎉 Happy transcribing!"