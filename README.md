# Admatenu Betenu WhatsApp Chatbot

A WhatsApp Chatbot for "Admatenu Betenu" built with Node.js, Express, UltraMsg, and Supabase.

## Features
- **Multi-lingual Support**: Hebrew, Arabic, Russian (Auto-detection).
- **Lead Qualification**: Filters loans < 200,000 NIS.
- **Data Collection**: City, Purpose, Property Ownership, Property Details, Risk Check.
- **Double Lead Check**: Prevents duplicate entries.
- **Notifications**: Email summary on lead completion.

## Prerequisites
- Node.js (v18+)
- Supabase Account
- UltraMsg Account

## Setup

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd admatenu-beytenu
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Environment Variables:**
    Create a `.env` file in the root directory with the following keys:
    ```env
    PORT=3000
    SUPABASE_URL=your_supabase_project_url
    SUPABASE_KEY=your_supabase_anon_key
    ULTRAMSG_INSTANCE_ID=your_ultramsg_instance_id
    ULTRAMSG_TOKEN=your_ultramsg_token
    # Email Settings (Configure as needed in src/services/emailService.js)
    EMAIL_TO=business_partner@example.com
    ```

4.  **Database Setup:**
    Run the SQL commands in `supabase_schema.sql` in your Supabase SQL Editor to create the necessary tables (`leads`, `sessions`).

## Running Locally

```bash
npm run dev
```

The server will start on `http://localhost:3000`.

## Webhook Setup

1.  Expose your local server using ngrok or deploy to Render.
2.  Set the UltraMsg Webhook URL to `https://your-domain.com/webhook`.

## Deployment (Render)

1.  Connect your GitHub repository to Render.
2.  Create a new **Web Service**.
3.  Set the Build Command to `npm install`.
4.  Set the Start Command to `npm start`.
5.  Add the Environment Variables in the Render dashboard.
