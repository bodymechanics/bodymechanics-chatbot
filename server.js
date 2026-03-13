import express from "express";
import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();

const app = express();

const allowedOrigins = [
  "https://www.bodymechanicsgb.com",
  "https://bodymechanicsgb.com"
];

// CORS middleware
app.use((req, res, next) => {
  const origin = req.headers.origin;

  if (allowedOrigins.includes(origin)) {
    res.header("Access-Control-Allow-Origin", origin);
  }

  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }

  next();
});

app.use(express.json());

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
  res.send("Body Mechanics chatbot server running.");
});

app.post("/chat", async (req, res) => {
  try {
    const { message, history = [] } = req.body;

    if (!message) {
      return res.status(400).json({
        reply: "Message is required."
      });
    }

    const response = await client.responses.create({
      model: "gpt-4.1-mini",
      input: [
        { role: "system", content: SYSTEM_PROMPT },
        ...history,
        { role: "user", content: message }
      ]
    });

    const reply =
      response.output_text || "Sorry, I couldn't generate a reply.";

    return res.json({ reply });
  } catch (error) {
    console.error("OpenAI error:", error?.message || error);

    return res.status(500).json({
      reply: "Sorry, I’m having trouble right now. Please contact the team directly."
    });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});