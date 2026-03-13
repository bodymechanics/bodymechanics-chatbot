import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();

const app = express();

// Allow requests from your website
app.use(cors({
  origin: [
    "https://www.bodymechanicsgb.com",
    "https://bodymechanicsgb.com"
  ]
}));

app.use(express.json());

// Handle preflight requests
app.options("*", cors());

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

    const response = await client.responses.create({
      model: "gpt-4.1-mini",
      input: [
        { role: "system", content: SYSTEM_PROMPT },
        ...history,
        { role: "user", content: message }
      ]
    });

    res.json({
      reply: response.output_text || "Sorry, I couldn't generate a reply."
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      reply: "Sorry, I’m having trouble right now. Please contact the team directly."
    });

  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});