const { GoogleGenerativeAI } = require("@google/generative-ai");
const KEY = "AIzaSyDRjJll0LMQT9WskQf7GeQ_Lx5HqeBlADQ"; // User's key
const genAI = new GoogleGenerativeAI(KEY);

async function debug() {
    console.log("Deep debugging key...");
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        await model.generateContent("test");
        console.log("✅ Surprise! It worked.");
    } catch (e) {
        // The SDK error object often hides the real HTTP response.
        // We need to look at specific properties if available, or just log everything.
        console.log("--- ERROR START ---");
        console.log("Name:", e.name);
        console.log("Message:", e.message);
        if (e.response) {
            console.log("Response Type:", typeof e.response);
            console.log("Response:", JSON.stringify(e.response, null, 2));
        }
        // Sometimes the message contains the full JSON
        console.log("--- ERROR END ---");
    }
}
debug();
