# Admatenu Beytenu Chatbot 🏡🤖

Automated WhatsApp Mortgage qualification bot for the Israeli/Arab sector.

## Features (v2.2 Stable)
- **AI-Powered**: Uses Google Gemini 2.5 Flash Lite for natural language understanding.
- **Multilingual**: Supports Hebrew, Arabic, Russian, and English auto-detection.
- **Robustness**:
  - "Infinite Retry" mechanism for API connections.
  - Hybrid Storage (Supabase + In-Memory) for crash resistance.
  - Async Webhook processing to prevent timeouts.
- **Flow**:
  - Qualification (>200k NIS).
  - Smart Property Check (Asks for Permit only if Property exists).
  - "Anything Else" step for free-text addition.

## Setup
1. Clone repository.
2. `npm install`
3. Configure `.env` with:
   - `GEMINI_API_KEY`
   - `ULTRAMSG_INSTANCE_ID` & `TOKEN`
   - `SUPABASE_URL` & `KEY`
4. `npm start`

## Deployment
Running on Render/Node.js.
Webhook endpoint: `/webhook`
