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

const LINKS = {
  freeTrial: "https://www.bodymechanicsgb.com/freetrial",
  signup: "https://www.bodymechanicsgb.com/signup",
  booking: "https://www.bodymechanicsgb.com/booking",
  memberships: "https://www.bodymechanicsgb.com",
  classes: "https://www.bodymechanicsgb.com"
};

const SYSTEM_PROMPT = `
You are the premium digital assistant for Body Mechanics, an expert-led health, fitness, and sports therapy facility in Bridgwater, Somerset.

Mission:
Help people relieve pain and reach their potential.

Brand position:
Body Mechanics is a premium, welcoming, expert-led facility. It combines gym training, coach-led classes, and sports therapy support in one environment. The experience should feel calm, high quality, supportive, and professional.

Tone:
- Professional, calm, warm, and confident
- Premium but never arrogant
- Helpful, human, and easy to understand
- Never robotic, cheesy, or overly salesy
- Do not use emojis
- Keep replies concise, clear, and useful
- Use short paragraphs
- Make the next best step obvious

Important operating rules:
- Do not invent services, classes, prices, timetables, policies, opening hours, or staff details that are not provided
- If exact details are unknown, say so briefly and guide the user to the best next step
- Do not take bookings inside the chat
- Do not ask users for dates, times, emails, or phone numbers
- When someone is ready to take action, direct them to the correct link
- Never diagnose injuries or medical conditions
- Never replace medical advice
- For severe, urgent, or worrying symptoms, advise seeking appropriate medical care

Body Mechanics core services:
- Gym memberships
- Coach-led classes
- Sports therapy
- Free 7-day gym trial
- Direct gym signup

Membership guidance:
- Titan = open gym access
- Apex = classes
- Olympic = gym + classes

How to explain memberships:
- Titan is best for people who mainly want independent gym access
- Apex is best for people who mainly want structured coach-led classes
- Olympic is best for people who want both gym access and classes
- If someone is unsure, recommend the free 7-day trial as the best way to experience Body Mechanics properly
- If someone is ready to commit, offer direct signup

Classes:
Body Mechanics currently offers these class types:
- Sculpt
- Burn
- Hybrid
- Crank
- Legs, Bums & Tums

Class definitions:
- Sculpt is the strength and conditioning focused class
- Burn is the cardio-focused class
- Hybrid is a mix of weights and cardio, and is Body Mechanics’ version of Hyrox-style training
- Crank is the spin class
- Legs, Bums & Tums focuses on the lower body and core

Important class knowledge:
- Sculpt runs in structured 4-week blocks
- Sculpt follows this weekly format:
  - Monday = Push
  - Tuesday = Legs
  - Wednesday = Pull
  - Thursday = Upper
  - Friday = Lower
  - Saturday = Full Body
  - Sunday = No Sculpt sessions
- Burn changes every day
- Hybrid combines weights and conditioning
- Crank is led by a dedicated spin instructor
- Legs, Bums & Tums changes each session

How to explain classes:
- When someone asks about classes, only mention the real classes listed above
- Do not mention classes that Body Mechanics does not offer
- Emphasise that classes are coach-led and premium
- Emphasise that programming is intentional, not random
- For Sculpt, explain the 4-week block structure and daily split when relevant
- For Burn, explain that the workout changes daily
- For Hybrid, explain that it blends weights and cardio in a Hyrox-style format
- For Crank, explain that it is the spin class and is led by a dedicated spin instructor
- For Legs, Bums & Tums, explain that it focuses on lower body and core and changes each session
- When someone asks about classes or joining, mention that members use the BM Portal app to book classes and check in
- The BM Portal app is available on both the App Store and Google Play

Sports therapy:
Body Mechanics supports clients with:
- sports massage
- injury rehabilitation
- mobility and joint work
- acupuncture and dry needling

Therapist guidance:
- Junior therapists are best for general maintenance and sports massage
- Senior therapists are best for injuries or more complex issues

How to handle therapy / pain / injury questions:
- If someone mentions pain, injury, stiffness, rehab, recovery, or discomfort, recommend sports therapy as the best place to start
- Direct them to the treatment booking page
- Do not ask them for dates, times, or booking details
- If they say “yes”, send them directly to the booking link
- If the issue sounds more complex or injury-related, mention that a senior therapist is usually the best fit

Beginner handling:
- If someone is nervous, new to gyms, or lacking confidence, reassure them clearly
- Explain that Body Mechanics is welcoming, supportive, and expert-led
- Suggest the free 7-day trial as the best next step for beginners
- Do not make the user feel judged or behind

Differentiators to reinforce naturally:
- premium facility
- expert-led support
- sports therapy integrated with training
- coach-led classes
- intentional programming
- welcoming environment
- supportive for beginners
- high-quality experience

Response style:
- Start with a short direct answer
- Then a brief explanation
- Then the best next step
- Use bullet points when useful
- Keep the experience premium and uncluttered

Overall goal:
Deliver an excellent premium user experience and guide visitors confidently to the correct next step while making Body Mechanics feel like a leading modern health and performance brand.
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

function createResponse(reply, ctas = []) {
  return { reply, ctas };
}

function normalise(text) {
  return String(text || "").trim().toLowerCase();
}

function includesAny(text, phrases) {
  return phrases.some((phrase) => text.includes(phrase));
}

function detectPageContext(pageContext = "") {
  const text = String(pageContext || "").toLowerCase();

  if (text.includes("class")) return "classes";
  if (text.includes("therapy") || text.includes("treatment") || text.includes("injury")) return "therapy";
  if (text.includes("membership") || text.includes("gym") || text.includes("free") || text.includes("signup")) return "gym";

  return "general";
}

function isSculptIntent(text) {
  return includesAny(text, [
    "what is sculpt",
    "tell me about sculpt",
    "sculpt class",
    "sculpt sessions",
    "how does sculpt work"
  ]);
}

function isBurnIntent(text) {
  return includesAny(text, [
    "what is burn",
    "tell me about burn",
    "burn class",
    "burn sessions"
  ]);
}

function isHybridIntent(text) {
  return includesAny(text, [
    "what is hybrid",
    "tell me about hybrid",
    "hybrid class",
    "hyrox"
  ]);
}

function isCrankIntent(text) {
  return includesAny(text, [
    "what is crank",
    "tell me about crank",
    "crank class",
    "spin class",
    "spinning"
  ]);
}

function isLbtIntent(text) {
  return includesAny(text, [
    "what is lbt",
    "what is legs bums and tums",
    "tell me about lbt",
    "tell me about legs bums and tums",
    "lbt class",
    "legs bums and tums"
  ]);
}

function isClassIntent(text) {
  return includesAny(text, [
    "tell me about your classes",
    "what classes",
    "class",
    "classes",
    "which classes",
    "what classes do you do"
  ]);
}

function isGymIntent(text) {
  return includesAny(text, [
    "join the gym",
    "want to join",
    "join body mechanics",
    "sign up",
    "signup",
    "join now",
    "become a member",
    "start the gym",
    "free trial"
  ]);
}

function isMembershipChoiceIntent(text) {
  return includesAny(text, [
    "which membership",
    "what membership",
    "best membership",
    "membership options",
    "tell me about memberships",
    "explore memberships",
    "membership"
  ]);
}

function isBeginnerIntent(text) {
  return includesAny(text, [
    "beginner",
    "nervous",
    "never been to a gym",
    "new to the gym",
    "starting out",
    "bit nervous",
    "i'm nervous",
    "im nervous"
  ]);
}

function isTherapyIntent(text) {
  return includesAny(text, [
    "back pain",
    "bad back",
    "pain",
    "injury",
    "injured",
    "rehab",
    "recovery",
    "stiff",
    "shoulder",
    "knee",
    "hip",
    "neck",
    "sports therapy",
    "massage",
    "acupuncture",
    "dry needling"
  ]);
}

function isTherapyBookingConfirmation(text, history) {
  const confirmations = ["yes", "yeah", "yep", "ok", "okay", "please", "book", "sounds good"];
  if (!confirmations.includes(text)) return false;

  const recentCombined = history
    .slice(-6)
    .map((item) => (typeof item.content === "string" ? item.content.toLowerCase() : ""))
    .join(" ");

  return includesAny(recentCombined, [
    "sports therapy",
    "book here",
    "booking page",
    "treatment",
    "book sports therapy"
  ]);
}

function isCardioIntent(text) {
  return includesAny(text, [
    "improve cardio",
    "improve my cardio",
    "cardio",
    "conditioning",
    "fitness",
    "hyrox style"
  ]);
}

function isStrengthIntent(text) {
  return includesAny(text, [
    "get stronger",
    "build strength",
    "strength",
    "muscle",
    "resistance training"
  ]);
}

function isAppIntent(text) {
  return includesAny(text, [
    "app",
    "bm portal",
    "portal app",
    "how do i book classes",
    "how do i check in"
  ]);
}

app.get("/", (req, res) => {
  res.status(200).send("Body Mechanics chatbot server running.");
});

app.get("/health", (req, res) => {
  res.status(200).json({ ok: true });
});

app.post("/chat", async (req, res) => {
  try {
    const { message, history = [], pageContext = "" } = req.body;

    if (!message || typeof message !== "string" || !message.trim()) {
      return res.status(400).json(
        createResponse("Message is required.")
      );
    }

    const safeHistory = sanitiseHistory(history);
    const lowerMessage = normalise(message);
    const context = detectPageContext(pageContext);

    if (isSculptIntent(lowerMessage)) {
      return res.status(200).json(
        createResponse(
          "Sculpt is our strength and conditioning class and runs in structured 4-week blocks so members can progress properly.\n\nThe weekly format is:\n- Monday – Push\n- Tuesday – Legs\n- Wednesday – Pull\n- Thursday – Upper\n- Friday – Lower\n- Saturday – Full Body\n\nThere are no Sculpt sessions on Sundays.",
          [
            { label: "Explore Memberships", message: "Tell me about memberships" },
            { label: "Start Free Trial", url: LINKS.freeTrial },
            { label: "Sign Up Now", url: LINKS.signup }
          ]
        )
      );
    }

    if (isBurnIntent(lowerMessage)) {
      return res.status(200).json(
        createResponse(
          "Burn is our cardio-focused class.\n\nThe session changes every day, so workouts stay varied while still pushing conditioning and fitness.",
          [
            { label: "Explore Memberships", message: "Tell me about memberships" },
            { label: "Start Free Trial", url: LINKS.freeTrial },
            { label: "Sign Up Now", url: LINKS.signup }
          ]
        )
      );
    }

    if (isHybridIntent(lowerMessage)) {
      return res.status(200).json(
        createResponse(
          "Hybrid combines weights and cardio, and is our version of Hyrox-style training.\n\nIt’s a strong option for people who want both strength and conditioning in the same session.",
          [
            { label: "Explore Memberships", message: "Tell me about memberships" },
            { label: "Start Free Trial", url: LINKS.freeTrial },
            { label: "Sign Up Now", url: LINKS.signup }
          ]
        )
      );
    }

    if (isCrankIntent(lowerMessage)) {
      return res.status(200).json(
        createResponse(
          "Crank is our spin class.\n\nIt’s led by a dedicated spin instructor, which gives the sessions a more specialist and focused feel.",
          [
            { label: "Explore Memberships", message: "Tell me about memberships" },
            { label: "Start Free Trial", url: LINKS.freeTrial },
            { label: "Sign Up Now", url: LINKS.signup }
          ]
        )
      );
    }

    if (isLbtIntent(lowerMessage)) {
      return res.status(200).json(
        createResponse(
          "Legs, Bums & Tums focuses on lower body and core work.\n\nThe session changes each time, so workouts stay varied and engaging.",
          [
            { label: "Explore Memberships", message: "Tell me about memberships" },
            { label: "Start Free Trial", url: LINKS.freeTrial },
            { label: "Sign Up Now", url: LINKS.signup }
          ]
        )
      );
    }

    if (isClassIntent(lowerMessage)) {
      return res.status(200).json(
        createResponse(
          "We currently offer these coach-led classes at Body Mechanics:\n\n- Sculpt, which is strength and conditioning focused\n- Burn, which is cardio focused and changes each day\n- Hybrid, which combines weights and cardio in a Hyrox-style format\n- Crank, which is our spin class led by a dedicated spin instructor\n- Legs, Bums & Tums, which focuses on lower body and core and changes each session\n\nIf you mainly want classes, Apex is the classes membership. If you want classes and gym access, Olympic is the better fit.\n\nMembers use the BM Portal app to book classes and check in. It’s available on both the App Store and Google Play.",
          [
            { label: "Start Free Trial", url: LINKS.freeTrial },
            { label: "Sign Up Now", url: LINKS.signup },
            { label: "Explore Memberships", message: "Tell me about memberships" }
          ]
        )
      );
    }

    if (isMembershipChoiceIntent(lowerMessage)) {
      return res.status(200).json(
        createResponse(
          "It depends on how you prefer to train.\n\n- Titan is best if you mainly want open gym access\n- Apex is best if you mainly want coach-led classes\n- Olympic is best if you want both gym access and classes\n\nIf you want to explore Body Mechanics first, the free 7-day trial is the best place to start:\n" + LINKS.freeTrial + "\n\nIf you already know you want to join, you can sign up directly here:\n" + LINKS.signup + "\n\nOnce you're set up, the BM Portal app is how members book classes and check in. It’s available on both the App Store and Google Play.",
          [
            { label: "Start Free Trial", url: LINKS.freeTrial },
            { label: "Sign Up Now", url: LINKS.signup },
            { label: "Tell me about classes", message: "Tell me about your classes" }
          ]
        )
      );
    }

    if (isGymIntent(lowerMessage)) {
      return res.status(200).json(
        createResponse(
          "There are two good ways to get started with Body Mechanics.\n\nIf you want to experience the gym first, the best option is the free 7-day trial:\n" +
            LINKS.freeTrial +
            "\n\nIf you already know you want to join, you can sign up directly here:\n" +
            LINKS.signup +
            "\n\nOnce you're set up, the BM Portal app is the best way to book classes and check in at the facility. It’s available on both the App Store and Google Play.",
          [
            { label: "Start Free Trial", url: LINKS.freeTrial },
            { label: "Sign Up Now", url: LINKS.signup },
            { label: "Explore Memberships", message: "Tell me about memberships" }
          ]
        )
      );
    }

    if (isBeginnerIntent(lowerMessage)) {
      return res.status(200).json(
        createResponse(
          "That’s completely normal.\n\nBody Mechanics is designed to feel welcoming, supportive, and expert-led, so people can start with confidence.\n\nIf you want to explore the facility first, the free 7-day trial is the best place to start:\n" +
            LINKS.freeTrial +
            "\n\nIf you already know you want to join, you can sign up directly here:\n" +
            LINKS.signup +
            "\n\nOnce you're set up, the BM Portal app is how members book classes and check in at the facility. It’s available on both the App Store and Google Play.",
          [
            { label: "Start Free Trial", url: LINKS.freeTrial },
            { label: "Sign Up Now", url: LINKS.signup }
          ]
        )
      );
    }

    if (isTherapyBookingConfirmation(lowerMessage, safeHistory)) {
      return res.status(200).json(
        createResponse(
          "Perfect. You can book your treatment session here:\n" + LINKS.booking + "\n\nIf your issue is more complex or injury-related, a senior therapist is usually the best fit.",
          [
            { label: "Book Sports Therapy", url: LINKS.booking }
          ]
        )
      );
    }

    if (isTherapyIntent(lowerMessage)) {
      return res.status(200).json(
        createResponse(
          "Sports therapy would be the best place to start, so the team can assess what’s going on and guide the right next step.\n\nYou can book here:\n" + LINKS.booking,
          [
            { label: "Book Sports Therapy", url: LINKS.booking }
          ]
        )
      );
    }

    if (isCardioIntent(lowerMessage)) {
      return res.status(200).json(
        createResponse(
          "Burn or Hybrid would usually be the best place to start.\n\nBurn is our cardio-focused class and changes each day, while Hybrid combines weights and conditioning in a Hyrox-style format.\n\nIf you want class access, Apex is the classes membership. If you also want gym access, Olympic would be the better fit.",
          [
            { label: "Tell me about classes", message: "Tell me about your classes" },
            { label: "Start Free Trial", url: LINKS.freeTrial },
            { label: "Sign Up Now", url: LINKS.signup }
          ]
        )
      );
    }

    if (isStrengthIntent(lowerMessage)) {
      return res.status(200).json(
        createResponse(
          "Sculpt would usually be the best place to start if your main goal is getting stronger.\n\nIt’s our strength and conditioning class and runs in structured 4-week blocks so members can progress properly.",
          [
            { label: "What is Sculpt?", message: "What is Sculpt?" },
            { label: "Start Free Trial", url: LINKS.freeTrial },
            { label: "Sign Up Now", url: LINKS.signup }
          ]
        )
      );
    }

    if (isAppIntent(lowerMessage)) {
      return res.status(200).json(
        createResponse(
          "Members use the BM Portal app to book classes and check in at the facility.\n\nIt’s available on both the App Store and Google Play."
        )
      );
    }

    if (context === "therapy" && includesAny(lowerMessage, ["help", "what do you do", "tell me more"])) {
      return res.status(200).json(
        createResponse(
          "If you’re dealing with pain, stiffness, injury, or recovery, sports therapy is usually the best place to start.\n\nYou can book here:\n" + LINKS.booking,
          [{ label: "Book Sports Therapy", url: LINKS.booking }]
        )
      );
    }

    if (context === "gym" && includesAny(lowerMessage, ["help", "what do i do", "how do i start"])) {
      return res.status(200).json(
        createResponse(
          "The simplest way to get started is with the free 7-day trial.\n\nThat gives you a chance to experience Body Mechanics properly and find the right membership path for how you want to train.\n\nIf you're ready to commit straight away, you can also sign up directly:\n" + LINKS.signup,
          [
            { label: "Start Free Trial", url: LINKS.freeTrial },
            { label: "Sign Up Now", url: LINKS.signup }
          ]
        )
      );
    }

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.3,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        ...safeHistory,
        {
          role: "system",
          content:
            `Current page context: ${context}. Use these links when relevant. Free trial: ${LINKS.freeTrial}. Signup: ${LINKS.signup}. Treatment booking: ${LINKS.booking}.`
        },
        { role: "user", content: message.trim() }
      ]
    });

    const reply =
      completion.choices?.[0]?.message?.content?.trim() ||
      "Sorry, I couldn't generate a reply.";

    let ctas = [];

    if (context === "gym") {
      ctas = [
        { label: "Start Free Trial", url: LINKS.freeTrial },
        { label: "Sign Up Now", url: LINKS.signup }
      ];
    } else if (context === "therapy") {
      ctas = [
        { label: "Book Sports Therapy", url: LINKS.booking }
      ];
    } else {
      ctas = [
        { label: "Start Free Trial", url: LINKS.freeTrial },
        { label: "Sign Up Now", url: LINKS.signup },
        { label: "Book Sports Therapy", url: LINKS.booking }
      ];
    }

    return res.status(200).json(createResponse(reply, ctas));
  } catch (error) {
    console.error("OpenAI error:", error);
    return res.status(500).json(
      createResponse(
        "Sorry, I’m having trouble right now. Please contact the team directly.",
        [
          { label: "Start Free Trial", url: LINKS.freeTrial },
          { label: "Sign Up Now", url: LINKS.signup },
          { label: "Book Sports Therapy", url: LINKS.booking }
        ]
      )
    );
  }
});

const PORT = Number(process.env.PORT) || 8080;
const HOST = "0.0.0.0";

app.listen(PORT, HOST, () => {
  console.log(`Server running on http://${HOST}:${PORT}`);
});