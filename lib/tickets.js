import { promises as fs } from "fs";
import path from "path";

// Tickets are stored in a JSON file so you can run this with zero setup.
// For production, swap saveTicket() for a database (Postgres, Supabase, etc).
// Note: hosts with a read-only filesystem (like Vercel) need a database.
const FILE = path.join(process.cwd(), "data", "tickets.json");

let queue = Promise.resolve();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function clean(value, max) {
  return String(value ?? "").trim().slice(0, max);
}

export function validateTicket(input) {
  const ticket = {
    name: clean(input?.name, 100),
    email: clean(input?.email, 200),
    subject: clean(input?.subject, 150),
    description: clean(input?.description, 3000),
    urgency: ["low", "normal", "high"].includes(input?.urgency) ? input.urgency : "normal",
  };
  if (!ticket.name) throw new Error("Missing name.");
  if (!EMAIL_RE.test(ticket.email)) throw new Error("Missing or invalid email address.");
  if (!ticket.subject) throw new Error("Missing subject.");
  if (!ticket.description) throw new Error("Missing description.");
  return ticket;
}

async function saveTicket(ticket) {
  let all = [];
  try {
    all = JSON.parse(await fs.readFile(FILE, "utf8"));
  } catch {
    // First ticket: file doesn't exist yet.
  }
  all.push(ticket);
  await fs.mkdir(path.dirname(FILE), { recursive: true });
  await fs.writeFile(FILE, JSON.stringify(all, null, 2));
}

async function notify(ticket) {
  const url = process.env.TICKET_WEBHOOK_URL;
  if (!url) return;
  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: `New Skypher ticket ${ticket.id} (${ticket.urgency})\n*${ticket.subject}*\nFrom: ${ticket.name} <${ticket.email}>\n${ticket.description}`,
      }),
    });
  } catch (err) {
    console.error("Ticket webhook failed:", err);
  }
}

export async function createTicket(input) {
  const data = validateTicket(input);
  const ticket = {
    id: `SKY-${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 4).toUpperCase()}`,
    ...data,
    status: "open",
    createdAt: new Date().toISOString(),
  };
  // Run saves one at a time so two simultaneous tickets can't overwrite each other.
  const run = queue.catch(() => {}).then(() => saveTicket(ticket));
  queue = run;
  await run;
  await notify(ticket);
  return ticket;
}
