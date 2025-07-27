# Migration Guide: From Baileys to Cloudflare Workers

This guide helps you migrate from the original WhatsApp transcript app (using Baileys) to the new Cloudflare Workers version (using WhatsApp Business API).

## 🔄 Key Changes Overview

| Aspect | Original (Baileys) | New (Cloudflare Workers) |
|--------|-------------------|--------------------------|
| **WhatsApp API** | Unofficial Baileys library | Official WhatsApp Business API |
| **Architecture** | Persistent Node.js process | Serverless functions |
| **Authentication** | QR codes/pairing codes | API tokens |
| **Hosting** | Self-hosted server/Docker | Cloudflare Workers |
| **Scaling** | Manual server management | Automatic scaling |
| **Reliability** | Connection drops possible | Webhook-based, more reliable |

## 📋 Prerequisites for Migration

### What You'll Need
1. **Facebook Developer Account** (new requirement)
2. **WhatsApp Business Account** (new requirement)
3. **Cloudflare Account** (replaces your server)
4. **Your existing API keys** (OpenAI, Anthropic, Deepgram)

### What You Can Keep
- ✅ OpenAI API key
- ✅ Anthropic API key (if using)
- ✅ Deepgram API key (if using)
- ✅ Basic functionality and features

### What Changes
- ❌ No more QR code scanning
- ❌ No more server maintenance
- ❌ No more connection drops
- ❌ No more Docker containers
- ❌ No more auth_info_baileys folders

## 🚀 Step-by-Step Migration

### Step 1: Set Up WhatsApp Business API

This is the biggest change. You'll need to move from the unofficial Baileys API to the official WhatsApp Business API.

1. **Create Facebook Developer Account**
   ```
   → Go to https://developers.facebook.com/
   → Create new app or use existing
   → Add WhatsApp product
   ```

2. **Get Your Phone Number Verified**
   ```
   → You'll need a business phone number
   → This replaces your personal WhatsApp connection
   → The number will be used for your transcription bot
   ```

3. **Obtain Required Tokens**
   ```
   → Phone Number ID
   → Access Token (permanent)
   → Business Account ID
   ```

### Step 2: Prepare Your Environment

1. **Install Wrangler CLI**
   ```bash
   npm install -g wrangler
   ```

2. **Clone/Download the New Version**
   ```bash
   # Your files from this repository
   # Key files: src/worker.js, wrangler.toml, package-worker.json
   ```

3. **Migrate Your Environment Variables**
   
   **Old .env file:**
   ```env
   OPENAI_API_KEY=sk-...
   ANTHROPIC_API_KEY=sk-ant-...
   DEEPGRAM_API_KEY=...
   AI_SERVICE=OPENAI
   VOICE_TRANSCRIPTION_SERVICE=OPENAI
   ```

   **New Cloudflare secrets:**
   ```bash
   wrangler secret put OPENAI_API_KEY
   wrangler secret put WHATSAPP_ACCESS_TOKEN
   wrangler secret put WHATSAPP_PHONE_NUMBER_ID
   wrangler secret put WEBHOOK_SECRET
   ```

### Step 3: Deploy to Cloudflare Workers

1. **Authenticate with Cloudflare**
   ```bash
   wrangler auth login
   ```

2. **Deploy the Worker**
   ```bash
   wrangler deploy
   ```

3. **Note Your Worker URL**
   ```
   Example: https://wa-transcript-worker.your-subdomain.workers.dev
   ```

### Step 4: Configure WhatsApp Webhook

1. **In Facebook Developer Console:**
   ```
   → WhatsApp > Configuration
   → Webhook URL: https://your-worker-url.workers.dev/webhook
   → Verify Token: (same as your WEBHOOK_SECRET)
   → Subscribe to 'messages' events
   ```

### Step 5: Test the Migration

1. **Send a test voice note** to your WhatsApp Business number
2. **Check Cloudflare logs:** `wrangler tail`
3. **Verify transcription and summary** are sent back

### Step 6: Decommission Old Setup

Once everything works:

1. **Stop your old Node.js process**
2. **Remove Docker containers** (if using)
3. **Archive your old code** (keep as backup)
4. **Cancel server hosting** (if applicable)

## 🔧 Configuration Mapping

### Environment Variables Migration

| Old Variable | New Location | Notes |
|-------------|-------------|--------|
| `OPENAI_API_KEY` | Cloudflare secret | Same value |
| `ANTHROPIC_API_KEY` | Cloudflare secret | Same value |
| `DEEPGRAM_API_KEY` | Cloudflare secret | Same value |
| `AI_SERVICE` | `wrangler.toml` | Same values (OPENAI/ANTHROPIC) |
| `VOICE_TRANSCRIPTION_SERVICE` | `wrangler.toml` | Same values (OPENAI/DEEPGRAM) |
| `OPENAI_MODEL` | `wrangler.toml` | Same value |
| `GENERATE_SUMMARY` | `wrangler.toml` | Same value |
| `WHATSAPP_PHONE_NUMBER` | ❌ Not needed | Replaced by Business API |
| `AUTH_METHOD` | ❌ Not needed | No authentication required |
| `SERVER_ENV` | ❌ Not needed | Always serverless now |

### New Variables Required

| Variable | Purpose | How to Get |
|----------|---------|-----------|
| `WHATSAPP_ACCESS_TOKEN` | Business API auth | Facebook Developer Console |
| `WHATSAPP_PHONE_NUMBER_ID` | Business number ID | Facebook Developer Console |
| `WEBHOOK_SECRET` | Webhook verification | Choose your own secret |

## 🆚 Feature Comparison

### What's Better
- ✅ **Reliability**: No more connection drops
- ✅ **Scaling**: Automatic scaling with usage
- ✅ **Maintenance**: No server maintenance required
- ✅ **Compliance**: Official WhatsApp API
- ✅ **Security**: Managed infrastructure
- ✅ **Cost**: Pay only for usage

### What's Different
- 🔄 **Setup complexity**: Higher initial setup (Business API)
- 🔄 **Phone number**: Requires business number
- 🔄 **Account requirements**: Facebook Business account needed

### What's the Same
- ✅ **Core functionality**: Voice note transcription
- ✅ **AI services**: Same OpenAI, Anthropic, Deepgram options
- ✅ **Summary generation**: Same AI-powered summaries
- ✅ **Configuration**: Similar configuration options

## ⚠️ Important Considerations

### Business Requirements
- **Business verification may be required** for WhatsApp Business API
- **Phone number ownership verification** needed
- **Facebook Business Manager** account required

### Usage Limits
- **WhatsApp Business API**: 1,000 free conversations/month, then paid
- **Cloudflare Workers**: 100,000 requests/day free, then paid
- **OpenAI/Anthropic**: Same pay-per-use pricing

### Compliance
- **Terms of Service**: Different terms for Business API vs Baileys
- **Data handling**: Business API has different data retention policies
- **Geographic availability**: Business API not available in all countries

## 🐛 Troubleshooting Migration Issues

### Common Migration Problems

1. **"Webhook verification failed"**
   ```
   → Check WEBHOOK_SECRET matches verify token in Facebook console
   → Ensure webhook URL is exactly: https://your-worker.workers.dev/webhook
   ```

2. **"Access token invalid"**
   ```
   → Generate a new permanent access token
   → Ensure token has proper permissions (messages, media)
   ```

3. **"Phone number not verified"**
   ```
   → Complete business verification process
   → Ensure phone number is properly connected to Business Account
   ```

4. **"Worker deployment failed"**
   ```
   → Check wrangler.toml syntax
   → Verify all required secrets are set
   → Run wrangler auth login again
   ```

### Getting Help

1. **Check logs**: `wrangler tail` for real-time debugging
2. **Facebook documentation**: WhatsApp Business API docs
3. **Cloudflare documentation**: Workers platform docs
4. **Community support**: GitHub issues for this project

## 📊 Migration Checklist

Use this checklist to track your migration progress:

- [ ] Facebook Developer Account created
- [ ] WhatsApp Business Account set up
- [ ] Phone number verified
- [ ] Access tokens obtained
- [ ] Cloudflare account ready
- [ ] Wrangler CLI installed
- [ ] Worker deployed successfully
- [ ] Webhook configured in Facebook console
- [ ] Secrets configured in Cloudflare
- [ ] Test voice note transcription working
- [ ] Summary generation working
- [ ] Old system decommissioned
- [ ] Documentation updated for team

## 🎉 Post-Migration Benefits

After successful migration, you'll enjoy:

- **Zero maintenance**: No more server upkeep
- **Better reliability**: Webhook-based, no connection issues
- **Automatic scaling**: Handles traffic spikes automatically
- **Lower costs**: Pay only for actual usage
- **Better compliance**: Official WhatsApp API
- **Enhanced monitoring**: Cloudflare dashboard and analytics

---

Need help with migration? Check the main README-worker.md for detailed setup instructions or open an issue with your specific migration questions.