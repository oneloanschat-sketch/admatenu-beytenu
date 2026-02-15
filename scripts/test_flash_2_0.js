const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

const KEY = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(KEY);

async function testFlash2() {
    console.log("Testing gemini-2.0-flash...");
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
        const res = await model.generateContent("Hi");
        console.log("✅ Success! Response:", res.response.text());
    } catch (e) {
        console.log("❌ Failed:", e.message);
    }

    console.log("\nTesting gemini-1.5-flash...");
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const res = await model.generateContent("Hi");
        console.log("✅ Success! Response:", res.response.text());
    } catch (e) {
        console.log("❌ Failed:", e.message);
    }
}

testFlash2();
