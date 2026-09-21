# Skypher support chatbot

A client support chat widget for Skypher. It answers questions from your own FAQs and company info, and creates support tickets when it can't help.

Built with Next.js 15 and the Claude API. The API key stays on the server and is never sent to the browser.

## Run it

1. `npm install`
2. Copy `.env.example` to `.env.local` and paste your `ANTHROPIC_API_KEY`
3. Open `lib/knowledge.js` and replace every `TODO` with real Skypher information
4. `npm run dev` and open http://localhost:3000

## How it works

- `components/ChatWidget.jsx`: the chat bubble and panel
- `app/api/chat/route.js`: sends the conversation to Claude and runs the `create_ticket` tool
- `lib/knowledge.js`: everything the bot knows (company info, FAQs, rules)
- `lib/tickets.js`: validates and saves tickets to `data/tickets.json`, and posts to Slack if `TICKET_WEBHOOK_URL` is set

## Before going live

- **Database**: `data/tickets.json` is fine locally. Hosts with a read-only filesystem (like Vercel) need a database. Replace `saveTicket()` in `lib/tickets.js`.
- **Client login**: right now anyone on the page can chat. Add login before the bot handles any client-specific data.
- **Rate limit**: the built-in limit is in memory and works for one server only.
- **Tickets inbox**: tickets are only stored, not shown anywhere yet. Set `TICKET_WEBHOOK_URL` for Slack alerts, or build an admin page.
