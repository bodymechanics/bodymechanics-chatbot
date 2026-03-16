import express from "express";
import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();

const app = express();

app.use(express.json());

// Manual CORS for Body Mechanics website
app.use((req, res, next) => {
  const origin = req.headers.origin;
  const allowedOrigins = [
    "https://www.bodymechanicsgb.com",
    "https://bodymechanicsgb.com"
  ];

  if (allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }

  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }

  next();
});

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const SYSTEM_PROMPT = `
You are the premium digital assistant for Body Mechanics, an expert-led health, fitness, and sports therapy facility in Bridgwater, Somerset.

Mission:
Help people relieve pain and reach their potential.

Brand position:
Body Mechanics is a premium, welcoming, expert-led facility. It combines gym training, coach-led classes, and sports therapy support in one environment.

Tone:
Professional, calm, supportive, intelligent, premium, and easy to understand.
Never sound robotic, pushy, cheesy, or overly sales-driven.
Do not use emojis.

Important operating rules:
- Do not invent services, classes, prices, timetables, policies, staff names, or opening hours.
- If exact details are unknown, say so briefly and give the best next step.
- Do not take bookings inside the chat.
- Do not ask for dates, times, email addresses, or phone numbers.
- When a user is ready to take action, direct them to the correct page link.

Body Mechanics services:
- Gym memberships
- Coach-led classes
- Sports therapy
- Free 7-day gym trial

Membership guidance:
- Titan = open gym access
- Apex = classes
- Olympic = gym + classes

Classes:
Body Mechanics currently offers these classes:
- Sculpt
- Burn
- Legs, Bums & Tums
- Crank

Class descriptions:
- Sculpt = strength and conditioning focused
- Burn = cardio focused
- Legs, Bums & Tums = lower body and core focused
- Crank = spin class

Sports therapy:
Body Mechanics supports clients with:
- sports massage
- injury rehabilitation
- mobility and joint work
- acupuncture and dry needling

Therapist guidance:
- Junior therapists are best for general maintenance and sports massage
- Senior therapists are best for injuries or more complex issues

Key links:
- Free trial: https://www.bodymechanicsgb.com/free-trial
- Treatment booking: https://www.bodymechanicsgb.com/booking

Routing rules:
- If someone wants to join the gym, recommend the free 7-day trial and link directly to it.
- If someone asks about classes, only mention Sculpt, Burn, Legs, Bums & Tums, and Crank. Do not mention any other classes.
- If someone asks about memberships, explain Titan, Apex, and Olympic simply and clearly.
- If someone mentions pain, injury, rehab, stiffness, or recovery, recommend sports therapy and direct them to the booking page.
- If someone says yes to booking treatment, do not ask for dates or times. Send them directly to the booking page.
- If someone is a beginner or nervous, reassure them that Body Mechanics is welcoming and supportive, then guide them to the free trial.

Response style:
- Start with a short direct answer
- Then a brief explanation
- Then the best next step
- Use short paragraphs
- Use bullet points when helpful
- Keep replies concise and premium

Medical safety:
- Never diagnose
- Never promise outcomes
- Never replace medical advice
- For severe, urgent, or worrying symptoms, advise seeking appropriate medical care

Overall goal:
Deliver an excellent premium user experience and guide visitors confidently to the right next step.
`;

function sanitiseHistory(history) {
  if (!Array.isArray(history)) return [];
  return history
    .filter(
      (item) =>
        item &&
        (item.role === "user" || item.role === "assistant") &&
        typeof item.content === "string"
    )
    .slice(-10);
}

function isClassIntent(text) {
  return (
    text.includes("class") ||
    text.includes("classes") ||
    text.includes("tell me about your classes") ||
    text.includes("what classes") ||
    text.includes("do you do classes") ||
    text.includes("class membership")
  );
}

function isGymIntent(text) {
  return (
    text.includes("join the gym") ||
    text === "join" ||
    text.includes("membership") ||
    text.includes("memberships") ||
    text.includes("gym membership") ||
    text.includes("want to join") ||
    text.includes("start gym") ||
    text.includes("free trial")
  );
}

function isTherapyIntent(text) {
  return (
    text.includes("back pain") ||
    text.includes("bad back") ||
    text.includes("injury") ||
    text.includes("injured") ||
    text.includes("rehab") ||
    text.includes("recovery") ||
    text.includes("stiff") ||
    text.includes("pain") ||
    text.includes("shoulder") ||
    text.includes("knee") ||
    text.includes("hip") ||
    text.includes("neck") ||
    text.includes("sports therapy") ||
    text.includes("massage") ||
    text.includes("acupuncture") ||
    text.includes("dry needling")
  );
}

function isYesAfterTherapyIntent(text, history) {
  if (!["yes", "yeah", "yep", "ok", "okay", "please", "book", "sounds good"].includes(text)) {
    return false;
  }

  if (!Array.isArray(history) || history.length === 0) {
    return false;
  }

  const recentCombined = history
    .slice(-6)
    .map((item) => (typeof item.content === "string" ? item.content.toLowerCase() : ""))
    .join(" ");

  return (
    recentCombined.includes("sports therapy") ||
    recentCombined.includes("book here") ||
    recentCombined.includes("treatment booking") ||
    recentCombined.includes("booking page")
  );
}

app.get("/", (req, res) => {
  res.status(200).send("Body Mechanics chatbot server running.");
});

app.get("/health", (req, res) => {
  res.status(200).json({ ok: true });
});

app.post("/chat", async (req, res) => {
  try {
    const { message, history = [] } = req.body;

    if (!message || typeof message !== "string" || !message.trim()) {
      return res.status(400).json({
        reply: "Message is required."
      });
    }

    const safeHistory = sanitiseHistory(history);
    const lowerMessage = message.trim().toLowerCase();

    // Hard-coded premium routing for high-value intents

    if (isClassIntent(lowerMessage)) {
      return res.status(200).json({
        reply:
          "We currently offer four main coach-led classes at Body Mechanics:\n\n" +
          "- Sculpt, which is strength and conditioning focused\n" +
          "- Burn, which is cardio focused\n" +
          "- Legs, Bums & Tums, which focuses on the lower body and core\n" +
          "- Crank, which is our spin class\n\n" +
          "If you want access to classes, Apex is the classes membership, while Olympic gives you both gym and classes."
      });
    }

    if (isGymIntent(lowerMessage)) {
      return res.status(200).json({
        reply:
          "The best way to experience Body Mechanics is our free 7-day trial.\n\n" +
          "We offer:\n" +
          "- Titan for open gym access\n" +
          "- Apex for classes\n" +
          "- Olympic for gym and classes\n\n" +
          "You can start your free trial here:\nhttps://www.bodymechanicsgb.com/free-trial"
      });
    }

    if (isYesAfterTherapyIntent(lowerMessage, safeHistory)) {
      return res.status(200).json({
        reply:
          "Perfect. You can book your treatment session here:\nhttps://www.bodymechanicsgb.com/booking\n\n" +
          "If your issue is more complex or injury-related, a senior therapist is usually the best fit."
      });
    }

    if (isTherapyIntent(lowerMessage)) {
      return res.status(200).json({
        reply:
          "Sports therapy would be the best place to start, so the team can assess what's going on and guide the right next step.\n\n" +
          "You can book here:\nhttps://www.bodymechanicsgb.com/booking"
      });
    }

    // Fallback to AI for broader conversational questions
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.3,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        ...safeHistory,
        { role: "user", content: message.trim() }
      ]
    });

    const reply =
      completion.choices?.[0]?.message?.content?.trim() ||
      "Sorry, I couldn't generate a reply.";

    return res.status(200).json({ reply });
  } catch (error) {
    console.error("OpenAI error:", error);
    return res.status(500).json({
      reply: "Sorry, I’m having trouble right now. Please contact the team directly."
    });
  }
});

const PORT = Number(process.env.PORT) || 8080;
const HOST = "0.0.0.0";

app.listen(PORT, HOST, () => {
  console.log(`Server running on http://${HOST}:${PORT}`);
});