import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();

const app = express();

app.use(cors({
  origin: [
    "https://www.bodymechanicsgb.com",
    "https://bodymechanicsgb.com"
  ],
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type"]
}));

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
      return res.status(400).json({ reply: "Message is required." });
    }

    const response = await client.responses.create({
      model: "gpt-4.1-mini",
      input: [
        { role: "system", content: SYSTEM_PROMPT },
        ...history,
        { role: "user", content: message }
      ]
    });

    const reply = response.output_text || "Sorry, I couldn't generate a reply.";
    res.json({ reply });
  } catch (error) {
    console.error("OpenAI error:", error?.message || error);
    res.status(500).json({
      reply: "Sorry, I’m having trouble right now. Please contact the team directly."
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});