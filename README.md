# WA Transcript - Cloudflare Workers Edition

![WA Transcript Banner](banner/WA%20Transcript%20Banner.png)

A serverless WhatsApp voice note transcription service running on Cloudflare Workers. This version uses the WhatsApp Business API instead of the unofficial Baileys library, providing better reliability and compliance.

## 🚀 Key Differences from Original Version

### Architecture Changes
- **Serverless**: Runs on Cloudflare Workers instead of a persistent Node.js process
- **Webhook-based**: Uses WhatsApp Business API webhooks instead of persistent connections
- **No Authentication Required**: Uses official WhatsApp Business API tokens
- **Scalable**: Automatically scales with traffic and usage
- **Reliable**: No connection drops or auth issues

### API Changes
- Uses **WhatsApp Business API** instead of unofficial Baileys library
- Requires **Facebook Developer Account** and **WhatsApp Business Account**
- **No QR codes or pairing codes needed** - uses official API tokens

## 📋 Prerequisites

1. **Cloudflare Account** (free tier works)
2. **Facebook Developer Account**
3. **WhatsApp Business Account**
4. **OpenAI API Key** (for transcription and summaries)
5. Optional: **Anthropic API Key** (for Claude summaries)
6. Optional: **Deepgram API Key** (alternative transcription service)

## 🔧 Setup Instructions

### Step 1: WhatsApp Business API Setup

1. **Create a Facebook Developer Account**
   - Go to [Facebook Developer Console](https://developers.facebook.com/)
   - Create a new app or use existing one
   - Add "WhatsApp" product to your app

2. **Set up WhatsApp Business API**
   - In your Facebook app, go to WhatsApp > Getting Started
   - Note down your:
     - `Phone Number ID`
     - `WhatsApp Business Account ID`
     - `Access Token` (temporary - you'll need to generate a permanent one)

3. **Generate Permanent Access Token**
   - Go to WhatsApp > Configuration
   - Generate a permanent access token
   - Save this token securely

### Step 2: Cloudflare Workers Setup

1. **Install Wrangler CLI**
   ```bash
   npm install -g wrangler
   ```

2. **Clone and Setup Project**
   ```bash
   git clone <this-repo>
   cd wa-transcript-worker
   npm install
   ```

3. **Authenticate with Cloudflare**
   ```bash
   wrangler auth login
   ```

4. **Configure Environment Variables**
   
   Update `wrangler.toml` with your settings:
   ```toml
   name = "wa-transcript-worker"
   main = "src/worker.js"
   compatibility_date = "2024-01-01"

   [vars]
   AI_SERVICE = "OPENAI"  # or "ANTHROPIC"
   VOICE_TRANSCRIPTION_SERVICE = "OPENAI"  # or "DEEPGRAM"
   OPENAI_MODEL = "gpt-3.5-turbo"
   WHISPER_MODEL = "whisper-1"
   GENERATE_SUMMARY = "true"
   ```

5. **Set Secret Environment Variables**
   ```bash
   # Required secrets
   wrangler secret put OPENAI_API_KEY
   wrangler secret put WHATSAPP_ACCESS_TOKEN
   wrangler secret put WHATSAPP_PHONE_NUMBER_ID
   wrangler secret put WEBHOOK_SECRET

   # Optional secrets (if using alternative services)
   wrangler secret put ANTHROPIC_API_KEY
   wrangler secret put DEEPGRAM_API_KEY
   ```

### Step 3: Deploy the Worker

1. **Deploy to Cloudflare**
   ```bash
   wrangler deploy
   ```

2. **Note the Worker URL**
   - After deployment, note the URL (e.g., `https://wa-transcript-worker.your-subdomain.workers.dev`)

### Step 4: Configure WhatsApp Webhook

1. **Set Webhook URL in Facebook Developer Console**
   - Go to WhatsApp > Configuration
   - Set Webhook URL to: `https://your-worker-url.workers.dev/webhook`
   - Set Verify Token to the same value you used for `WEBHOOK_SECRET`

2. **Subscribe to Webhook Events**
   - Subscribe to `messages` webhook event
   - Test the webhook connection

## 🎯 Usage

1. **Send a voice note** to your WhatsApp Business number
2. **The worker automatically:**
   - Receives the webhook from WhatsApp
   - Downloads the voice message
   - Transcribes it using OpenAI Whisper or Deepgram
   - Generates a summary (optional)
   - Sends both back to the sender

## ⚙️ Configuration Options

### Environment Variables (in wrangler.toml)

| Variable | Default | Description |
|----------|---------|-------------|
| `AI_SERVICE` | `OPENAI` | AI service for summaries (`OPENAI` or `ANTHROPIC`) |
| `VOICE_TRANSCRIPTION_SERVICE` | `OPENAI` | Transcription service (`OPENAI` or `DEEPGRAM`) |
| `OPENAI_MODEL` | `gpt-3.5-turbo` | OpenAI model for summaries |
| `ANTHROPIC_MODEL` | `claude-3-haiku-20240307` | Anthropic model for summaries |
| `WHISPER_MODEL` | `whisper-1` | OpenAI Whisper model |
| `DEEPGRAM_MODEL` | `nova-2` | Deepgram model |
| `GENERATE_SUMMARY` | `true` | Whether to generate summaries |

### Secret Variables (set with wrangler secret)

| Secret | Required | Description |
|--------|----------|-------------|
| `OPENAI_API_KEY` | Yes | OpenAI API key |
| `WHATSAPP_ACCESS_TOKEN` | Yes | WhatsApp Business API access token |
| `WHATSAPP_PHONE_NUMBER_ID` | Yes | WhatsApp Business phone number ID |
| `WEBHOOK_SECRET` | Yes | Secret for webhook verification |
| `ANTHROPIC_API_KEY` | No | Anthropic API key (if using Claude) |
| `DEEPGRAM_API_KEY` | No | Deepgram API key (if using Deepgram) |

## 🔍 Testing

### Local Development
```bash
wrangler dev
```

### Test Webhook Endpoint
```bash
# Test health endpoint
curl https://your-worker-url.workers.dev/health

# Test webhook verification
curl "https://your-worker-url.workers.dev/webhook?hub.mode=subscribe&hub.verify_token=your-secret&hub.challenge=test"
```

## 📊 Monitoring and Logs

### View Logs
```bash
wrangler tail
```

### Monitor in Cloudflare Dashboard
- Go to Cloudflare Dashboard > Workers & Pages
- Select your worker
- View metrics, logs, and analytics

## 🆚 Comparison with Original Version

| Feature | Original (Baileys) | Cloudflare Workers |
|---------|-------------------|-------------------|
| **Connection Type** | Persistent WebSocket | Webhook-based |
| **Authentication** | QR Code/Pairing | Official API tokens |
| **Deployment** | Server/Docker required | Serverless |
| **Scaling** | Manual | Automatic |
| **Reliability** | Connection drops possible | High reliability |
| **Compliance** | Unofficial API | Official WhatsApp API |
| **Setup Complexity** | Medium | Higher (requires Business API) |
| **Cost** | Server costs | Pay-per-request |

## 🚨 Important Notes

### WhatsApp Business API Limitations
- Requires approved Facebook Business account
- May have usage limits depending on your plan
- Requires phone number verification

### Cloudflare Workers Limitations
- 10ms CPU time limit per request (sufficient for this use case)
- 128MB memory limit
- 50 simultaneous requests limit (free tier)

### Cost Considerations
- **Cloudflare Workers**: Free tier includes 100,000 requests/day
- **WhatsApp Business API**: Free tier includes 1,000 conversations/month
- **OpenAI API**: Pay-per-use for transcription and completions
- **Deepgram/Anthropic**: Pay-per-use if using alternative services

## 🔧 Troubleshooting

### Common Issues

1. **Webhook Verification Failed**
   - Check that `WEBHOOK_SECRET` matches the verify token in Facebook console
   - Ensure webhook URL is correct

2. **Audio Download Fails**
   - Verify `WHATSAPP_ACCESS_TOKEN` is valid and has media permissions
   - Check that the token hasn't expired

3. **Transcription Fails**
   - Verify API keys for OpenAI or Deepgram
   - Check API quotas and limits

4. **Worker Deployment Issues**
   - Run `wrangler auth login` to re-authenticate
   - Check `wrangler.toml` syntax

### Debug Mode
Enable verbose logging by checking Cloudflare Workers dashboard for real-time logs.

## 📝 License

This project is MIT Licensed. See the [LICENSE](LICENSE.md) file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📞 Support

For issues specific to this Cloudflare Workers version:
1. Check the troubleshooting section
2. Review Cloudflare Workers documentation
3. Verify WhatsApp Business API setup
4. Open an issue with detailed logs