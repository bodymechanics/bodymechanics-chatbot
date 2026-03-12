import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const SYSTEM_PROMPT = `
You are the website assistant for Body Mechanics.

Body Mechanics is a premium gym and sports therapy facility in Bridgwater.
Mission: Helping people relieve pain and reach their potential.

Your job is to:
• Help visitors understand memberships, classes and treatments
• Encourage gym enquiries to start a free trial
• Encourage treatment enquiries to book a session
• Keep answers clear, warm and helpful
• Never diagnose medical conditions
`;

app.post("/chat", async (req, res) => {
  try {
    const { message } = req.body;

    const response = await client.responses.create({
      model: "gpt-5",
      input: [
        {
          role: "system",
          content: SYSTEM_PROMPT
        },
        {
          role: "user",
          content: message
        }
      ]
    });

    res.json({
      reply: response.output_text
    });

  } catch (error) {
    console.error(error);
    res.json({
      reply: "Sorry, something went wrong."
    });
  }
});

app.get("/", (req, res) => {
  res.send("Body Mechanics chatbot server running.");
});

app.listen(3000, () => {
  console.log("Server running on port 3000");
});