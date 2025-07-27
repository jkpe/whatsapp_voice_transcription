/**
 * Cloudflare Worker for WhatsApp Voice Transcription
 * This worker receives webhook requests from WhatsApp Business API
 * and transcribes voice messages using AI services
 */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // Handle different routes
    if (url.pathname === '/webhook' && request.method === 'POST') {
      return handleWhatsAppWebhook(request, env);
    } else if (url.pathname === '/webhook' && request.method === 'GET') {
      return handleWebhookVerification(request, env);
    } else if (url.pathname === '/health') {
      return new Response('OK', { status: 200 });
    } else {
      return new Response('Not Found', { status: 404 });
    }
  }
};

/**
 * Handle WhatsApp webhook verification
 */
async function handleWebhookVerification(request, env) {
  const url = new URL(request.url);
  const mode = url.searchParams.get('hub.mode');
  const token = url.searchParams.get('hub.verify_token');
  const challenge = url.searchParams.get('hub.challenge');
  
  if (mode === 'subscribe' && token === env.WEBHOOK_SECRET) {
    return new Response(challenge, { status: 200 });
  } else {
    return new Response('Forbidden', { status: 403 });
  }
}

/**
 * Handle incoming WhatsApp webhook messages
 */
async function handleWhatsAppWebhook(request, env) {
  try {
    const body = await request.json();
    
    // Verify webhook signature if needed
    if (!verifyWebhookSignature(request, env)) {
      return new Response('Unauthorized', { status: 401 });
    }
    
    // Process WhatsApp webhook payload
    await processWhatsAppMessage(body, env);
    
    return new Response('OK', { status: 200 });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}

/**
 * Verify webhook signature (optional but recommended)
 */
function verifyWebhookSignature(request, env) {
  // Implement signature verification if using WhatsApp Business API
  // This is a simplified version - you should implement proper signature verification
  return true;
}

/**
 * Process WhatsApp message and handle voice notes
 */
async function processWhatsAppMessage(webhookData, env) {
  const entry = webhookData.entry?.[0];
  const changes = entry?.changes?.[0];
  const value = changes?.value;
  const messages = value?.messages;
  
  if (!messages || messages.length === 0) {
    return;
  }
  
  for (const message of messages) {
    if (message.type === 'audio') {
      await handleVoiceMessage(message, value, env);
    }
  }
}

/**
 * Check if a phone number is whitelisted
 */
function isPhoneNumberWhitelisted(phoneNumber, env) {
  // If no whitelist is configured, allow all numbers
  if (!env.WHITELISTED_PHONE_NUMBERS) {
    return true;
  }
  
  // Parse the whitelist (comma-separated phone numbers)
  const whitelistedNumbers = env.WHITELISTED_PHONE_NUMBERS.split(',').map(num => num.trim());
  
  // Check if the phone number is in the whitelist
  return whitelistedNumbers.includes(phoneNumber);
}

/**
 * Handle voice message transcription
 */
async function handleVoiceMessage(message, value, env) {
  try {
    const audioId = message.audio.id;
    const fromNumber = message.from;
    const messageId = message.id;
    
    console.log(`Processing voice message ${messageId} from ${fromNumber}`);
    
    // Check if sender is whitelisted
    if (!isPhoneNumberWhitelisted(fromNumber, env)) {
      console.log(`Rejected voice message from non-whitelisted number: ${fromNumber}`);
      return;
    }
    
    // Download audio file from WhatsApp
    const audioBuffer = await downloadWhatsAppMedia(audioId, env);
    
    if (!audioBuffer) {
      console.error('Failed to download audio file');
      return;
    }
    
    // Transcribe audio
    const transcription = await transcribeAudio(audioBuffer, env);
    
    if (!transcription) {
      console.error('Failed to transcribe audio');
      return;
    }
    
    // Generate summary if enabled
    let summary = '';
    if (env.GENERATE_SUMMARY === 'true') {
      summary = await generateSummary(transcription, env);
    }
    
    // Send response back to WhatsApp
    await sendWhatsAppMessage(fromNumber, transcription, summary, env);
    
  } catch (error) {
    console.error('Error handling voice message:', error);
  }
}

/**
 * Download media from WhatsApp Business API
 */
async function downloadWhatsAppMedia(mediaId, env) {
  try {
    // Get media URL from WhatsApp
    const mediaUrlResponse = await fetch(`https://graph.facebook.com/v18.0/${mediaId}`, {
      headers: {
        'Authorization': `Bearer ${env.WHATSAPP_ACCESS_TOKEN}`
      }
    });
    
    if (!mediaUrlResponse.ok) {
      throw new Error(`Failed to get media URL: ${mediaUrlResponse.status}`);
    }
    
    const mediaData = await mediaUrlResponse.json();
    const mediaUrl = mediaData.url;
    
    // Download the actual media file
    const mediaResponse = await fetch(mediaUrl, {
      headers: {
        'Authorization': `Bearer ${env.WHATSAPP_ACCESS_TOKEN}`
      }
    });
    
    if (!mediaResponse.ok) {
      throw new Error(`Failed to download media: ${mediaResponse.status}`);
    }
    
    return await mediaResponse.arrayBuffer();
    
  } catch (error) {
    console.error('Error downloading WhatsApp media:', error);
    return null;
  }
}

/**
 * Transcribe audio using configured service
 */
async function transcribeAudio(audioBuffer, env) {
  const service = env.VOICE_TRANSCRIPTION_SERVICE || 'OPENAI';
  
  if (service === 'OPENAI') {
    return await transcribeWithOpenAI(audioBuffer, env);
  } else if (service === 'DEEPGRAM') {
    return await transcribeWithDeepgram(audioBuffer, env);
  } else {
    throw new Error(`Unsupported transcription service: ${service}`);
  }
}

/**
 * Transcribe audio using OpenAI Whisper
 */
async function transcribeWithOpenAI(audioBuffer, env) {
  try {
    const formData = new FormData();
    formData.append('file', new Blob([audioBuffer], { type: 'audio/ogg' }), 'audio.ogg');
    formData.append('model', env.WHISPER_MODEL || 'whisper-1');
    formData.append('response_format', 'json');
    formData.append('prompt', 'The transcript should have natural paragraph breaks and bullet points for any action steps. The output should be easy to read and follow.');
    
    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.OPENAI_API_KEY}`
      },
      body: formData
    });
    
    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }
    
    const result = await response.json();
    return result.text;
    
  } catch (error) {
    console.error('Error with OpenAI transcription:', error);
    return null;
  }
}

/**
 * Transcribe audio using Deepgram
 */
async function transcribeWithDeepgram(audioBuffer, env) {
  try {
    const response = await fetch('https://api.deepgram.com/v1/listen', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${env.DEEPGRAM_API_KEY}`,
        'Content-Type': 'audio/ogg'
      },
      body: audioBuffer
    });
    
    if (!response.ok) {
      throw new Error(`Deepgram API error: ${response.status}`);
    }
    
    const result = await response.json();
    const transcript = result?.results?.channels?.[0]?.alternatives?.[0]?.transcript;
    
    return transcript || null;
    
  } catch (error) {
    console.error('Error with Deepgram transcription:', error);
    return null;
  }
}

/**
 * Generate summary using configured AI service
 */
async function generateSummary(text, env) {
  const service = env.AI_SERVICE || 'OPENAI';
  
  if (service === 'OPENAI') {
    return await generateSummaryWithOpenAI(text, env);
  } else if (service === 'ANTHROPIC') {
    return await generateSummaryWithAnthropic(text, env);
  } else {
    throw new Error(`Unsupported AI service: ${service}`);
  }
}

/**
 * Generate summary using OpenAI GPT
 */
async function generateSummaryWithOpenAI(text, env) {
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: env.OPENAI_MODEL || 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: 'Summarize the message in 1-2 sentences max.' },
          { role: 'user', content: text }
        ],
        max_tokens: 2000,
        temperature: 0.5
      })
    });
    
    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }
    
    const result = await response.json();
    return result.choices[0].message.content.trim();
    
  } catch (error) {
    console.error('Error generating OpenAI summary:', error);
    return '';
  }
}

/**
 * Generate summary using Anthropic Claude
 */
async function generateSummaryWithAnthropic(text, env) {
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.ANTHROPIC_API_KEY}`,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: env.ANTHROPIC_MODEL || 'claude-3-haiku-20240307',
        max_tokens: 2000,
        system: 'Summarize the message in 1-2 sentences max.',
        messages: [
          { role: 'user', content: text }
        ]
      })
    });
    
    if (!response.ok) {
      throw new Error(`Anthropic API error: ${response.status}`);
    }
    
    const result = await response.json();
    return result.content[0].text;
    
  } catch (error) {
    console.error('Error generating Anthropic summary:', error);
    return '';
  }
}

/**
 * Send message back to WhatsApp
 */
async function sendWhatsAppMessage(toNumber, transcription, summary, env) {
  try {
    const phoneNumberId = env.WHATSAPP_PHONE_NUMBER_ID;
    
    // Prepare message text
    let messageText = '';
    
    if (summary) {
      messageText += `*Summary:*\n${summary}\n\n`;
    }
    
    messageText += `*Transcript:*\n${transcription}`;
    
    // Send message via WhatsApp Business API
    const response = await fetch(`https://graph.facebook.com/v18.0/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.WHATSAPP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: toNumber,
        type: 'text',
        text: {
          body: messageText
        }
      })
    });
    
    if (!response.ok) {
      throw new Error(`WhatsApp API error: ${response.status}`);
    }
    
    console.log(`Message sent successfully to ${toNumber}`);
    
  } catch (error) {
    console.error('Error sending WhatsApp message:', error);
  }
}