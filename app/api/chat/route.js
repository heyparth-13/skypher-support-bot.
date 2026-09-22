import { GoogleGenerativeAI } from "@google/generative-ai";
import { buildSystemPrompt, COMPANY, FAQS } from "@/lib/knowledge";
import { createTicket } from "@/lib/tickets";

export const runtime = "nodejs";

const CANDIDATE_MODELS = [
  process.env.GEMINI_MODEL,
  "gemini-3.6-flash",
  "gemini-3.5-flash-lite",
  "gemini-3.5-flash",
  "gemini-flash-latest",
].filter(Boolean);

const MAX_HISTORY = 20;
const MAX_MESSAGE_CHARS = 2500;

// Gemini function declaration for creating a support ticket
const TOOLS = [
  {
    functionDeclarations: [
      {
        name: "create_ticket",
        description:
          "Create a support ticket or inquiry for the Skyphr engineering team. Use it when the user wants to start a project, book a call, report a bug, or speak with our team. Requires client's name, email, and clear description.",
        parameters: {
          type: "OBJECT",
          properties: {
            name: { type: "STRING", description: "Client's full name" },
            email: { type: "STRING", description: "Client's contact email address" },
            subject: { type: "STRING", description: "Short summary / subject under 100 characters" },
            description: { type: "STRING", description: "Detailed summary of the request, project, or issue" },
            urgency: {
              type: "STRING",
              enum: ["low", "normal", "high"],
              description: "Urgency level of the request",
            },
          },
          required: ["name", "email", "subject", "description"],
        },
      },
    ],
  },
];

// Simple in-memory rate limit: 30 req/min per IP
const hits = new Map();
function rateLimited(ip) {
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < 60_000);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > 30;
}

function cleanHistory(raw) {
  if (!Array.isArray(raw)) return null;
  const msgs = raw
    .filter(
      (m) =>
        (m?.role === "user" || m?.role === "assistant") &&
        typeof m.content === "string" &&
        m.content.trim()
    )
    .map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content.slice(0, MAX_MESSAGE_CHARS) }],
    }))
    .slice(-MAX_HISTORY);

  while (msgs.length && msgs[0].role !== "user") msgs.shift();
  if (!msgs.length) return null;
  return msgs;
}

function sseChunk(controller, payload) {
  const encoder = new TextEncoder();
  controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
}

// Fallback response generator aligning with Project Consultant persona
function generateFallbackResponse(userPrompt) {
  const lower = userPrompt.toLowerCase();

  if (lower.includes("code") || lower.includes("script") || lower.includes("python") || lower.includes("javascript")) {
    return `I can help you plan, estimate, and architect your project, but this assistant does not provide raw source code.\n\n### Project Planning Overview\n- **Frontend**: React / Next.js with TailwindCSS\n- **Backend**: Python (FastAPI) or Node.js\n- **Database**: PostgreSQL / Supabase\n- **AI Engine**: Gemini or OpenAI APIs with RAG\n- **Estimated Timeline**: 2–4 weeks for an MVP\n- **Estimated Budget**: ₹25,000 – ₹60,000\n\nWould you like to discuss the specific architecture or schedule a discovery call with a Skyphr engineer?`;
  }

  if (lower.includes("cost") || lower.includes("budget") || lower.includes("price") || lower.includes("rate")) {
    return `### Estimated Project Budget\n\n| Project Level | Scope & Deliverables | Estimated Cost |\n| :--- | :--- | :--- |\n| **Basic MVP** | Core feature set, clean UI, basic auth & essential database | ₹15,000 – ₹35,000 |\n| **Standard Version** | Full feature set, polished UI/UX, third-party APIs & admin panel | ₹35,000 – ₹85,000 |\n| **Advanced / Enterprise** | AI integrations, custom models/RAG, high scalability, 24/7 SLA | ₹85,000 – ₹2,00,000+ |\n\n*Note: Final pricing depends on custom specifications and third-party API/hosting usage.*`;
  }

  if (lower.includes("service") || lower.includes("what do you do") || lower.includes("build")) {
    return `**Skyphr** specializes in:\n- **AI Systems & Automation** (Custom LLM integrations, agents, RAG)\n- **SaaS Platform Development** (Full-stack web apps in Next.js, React, Node, Python)\n- **UI/UX Design & Prototyping** (High-converting Figma design systems)\n- **Mobile Development** (iOS & Android with React Native / Flutter)\n- **Dedicated Engineering Teams** for scaling digital products.\n\nWould you like to schedule a 30-minute discovery call or discuss a project scope?`;
  }

  if (lower.includes("bug") || lower.includes("issue") || lower.includes("error") || lower.includes("help") || lower.includes("ticket")) {
    return `I can help you report an issue to our engineering team immediately. Please provide:\n1. **Your Full Name**\n2. **Your Work Email**\n3. **Description of the issue or error**\n\nOnce you share these, I'll generate a support ticket and our team will respond within 4 hours!`;
  }

  return `Hello! I am **Skyphr's AI Project Consultant**.\n\nI can assist you with:\n- **Project Architecture & Tech Stacks** (React, Next.js, Python, AI APIs)\n- **Feature Planning & System Workflows**\n- **Timeline & Budget Estimation** (in ₹ INR / $ USD)\n- **Booking Discovery Calls with Skyphr Engineers**\n\nWhat kind of software, SaaS, or AI project are you planning to build?`;
}

export async function POST(request) {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "Chatbot not configured yet — please add GOOGLE_API_KEY to .env.local" },
      { status: 500 }
    );
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local";
  if (rateLimited(ip)) {
    return Response.json(
      { error: "Too many messages. Please wait a moment and try again." },
      { status: 429 }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request payload." }, { status: 400 });
  }

  const history = cleanHistory(body?.messages);
  if (!history) {
    return Response.json({ error: "Please enter a message to begin." }, { status: 400 });
  }

  const lastTurn = history[history.length - 1];
  const chatHistory = history.slice(0, -1);
  const userMessage = lastTurn.parts[0].text;

  const genAI = new GoogleGenerativeAI(apiKey);
  const systemInstruction = buildSystemPrompt();

  const stream = new ReadableStream({
    async start(controller) {
      let succeeded = false;

      // Try candidate models with fallback
      for (const modelName of CANDIDATE_MODELS) {
        if (succeeded) break;
        try {
          const model = genAI.getGenerativeModel({
            model: modelName,
            systemInstruction,
            tools: TOOLS,
            toolConfig: { functionCallingConfig: { mode: "AUTO" } },
          });

          // Check if user has requested ticket creation directly in chat text
          const emailMatch = userMessage.match(/[\w.-]+@[\w.-]+\.\w+/);
          const nameMatch = userMessage.match(/(?:my name is|i am|name:?)\s*([A-Za-z\s]{2,30})/i);
          
          const chat = model.startChat({ history: chatHistory });
          let currentMessage = userMessage;

          for (let round = 0; round < 3; round++) {
            const result = await chat.sendMessage(currentMessage);
            const response = result.response;
            const functionCalls = response.functionCalls();

            if (functionCalls && functionCalls.length > 0) {
              const call = functionCalls[0];
              if (call.name === "create_ticket") {
                const args = call.args || {};
                const created = await createTicket({
                  name: args.name || (nameMatch ? nameMatch[1].trim() : "Skyphr Client"),
                  email: args.email || (emailMatch ? emailMatch[0] : "client@skyphr.com"),
                  subject: args.subject || "Client Inquiry via Skyphr Bot",
                  description: args.description || userMessage,
                  urgency: args.urgency || "normal",
                });

                sseChunk(controller, { ticket: created });

                // Pass function response back to model
                currentMessage = [
                  {
                    functionResponse: {
                      name: "create_ticket",
                      response: { result: `Ticket #${created.id} created successfully.` },
                    },
                  },
                ];
                continue;
              }
            }

            // Normal text response
            const text = response.text();
            if (text) {
              // Send text in nice animated chunks
              const words = text.split(" ");
              for (let i = 0; i < words.length; i += 3) {
                const chunk = words.slice(i, i + 3).join(" ") + (i + 3 < words.length ? " " : "");
                sseChunk(controller, { text: chunk });
                await new Promise((r) => setTimeout(r, 15));
              }
              succeeded = true;
              break;
            }
          }

          if (succeeded) break;
        } catch (err) {
          console.warn(`Attempt with ${modelName} failed:`, err.message);
          // Continue to next candidate model
        }
      }

      // If all Gemini attempts encountered high demand or errors, deliver knowledge base response
      if (!succeeded) {
        console.warn("Delivering fallback knowledge response...");
        const fallbackText = generateFallbackResponse(userMessage);
        const words = fallbackText.split(" ");
        for (let i = 0; i < words.length; i += 3) {
          const chunk = words.slice(i, i + 3).join(" ") + (i + 3 < words.length ? " " : "");
          sseChunk(controller, { text: chunk });
          await new Promise((r) => setTimeout(r, 20));
        }
      }

      const encoder = new TextEncoder();
      controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache",
      "X-Accel-Buffering": "no",
    },
  });
}
