import express from "express";
import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();

const app = express();

app.use(express.json());

// simple manual CORS
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
You are the website assistant for Body Mechanics.

Body Mechanics is a premium gym and sports therapy facility in Bridgwater.
Mission: Helping people relieve pain and reach their potential.

Your role:
- Help visitors understand memberships, classes, and treatments
- Encourage free trial signups for gym enquiries
- Encourage treatment bookings for pain, injury, and rehab enquiries
- Be warm, clear, and concise
- Never diagnose medical conditions
`;

app.get("/", (req, res) => {
  res.status(200).send("Body Mechanics chatbot server running.");
});

app.get("/health", (req, res) => {
  res.status(200).json({ ok: true });
});

app.post("/chat", async (req, res) => {
  try {
    const { message, history = [] } = req.body;

    if (!message) {
      return res.status(400).json({
        reply: "Message is required."
      });
    }

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        ...history,
        { role: "user", content: message }
      ]
    });

    const reply =
      completion.choices?.[0]?.message?.content ||
      "Sorry, I couldn't generate a reply.";

    return res.json({ reply });
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
