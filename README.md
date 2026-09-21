# Skyphr AI Support Chatbot

An intelligent client support assistant and project discovery interface for **Skyphr** (https://skyphr.com). Built with Next.js 15, Tailwind/Vanilla CSS, and Google Gemini API with real-time token streaming and automated support ticket generation.

---

## ✨ Features

- **Google Gemini API**: Fast token-by-token SSE streaming responses with automated model fallbacks.
- **Skyphr Brand Aesthetics**: Royal Blue (`#3538CD`), styled serif accents, and crisp layout matching [skyphr.com](https://skyphr.com).
- **Automated Ticket Creation**: Captures client inquiries and logs support tickets with unique IDs and SLA guarantees.
- **Voice Typing & Audio Speech**: Speech-to-Text input + Text-to-Speech audio response playback.
- **Responsive on All Devices**: Optimized for mobile phones (`100dvh`, iOS safe areas), tablets, and desktop screens.
- **Theme Toggle**: Light mode and Dark mode.

---

## 🚀 Getting Started

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment variables
Create a `.env.local` file in the root directory:
```env
GOOGLE_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-flash-latest
```

### 3. Run development server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📁 Architecture

- `app/api/chat/route.js`: Serverless streaming backend using `@google/generative-ai` with multi-model fallback.
- `components/ChatPage.jsx`: Interactive full-screen chat interface with audio, category filters, and message tools.
- `lib/knowledge.js`: Official Skyphr knowledge base and system prompts.
- `lib/tickets.js`: Ticket validation and storage engine.
