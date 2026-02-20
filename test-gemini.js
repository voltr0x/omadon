const { GoogleGenerativeAI } = require("@google/generative-ai");

const fs = require('fs');
const path = require('path');

async function test() {
    const envContent = fs.readFileSync(path.join(__dirname, '.env.local'), 'utf-8');
    const apiKeyMatch = envContent.match(/GEMINI_API_KEY=(.*)/);
    const apiKey = apiKeyMatch ? apiKeyMatch[1].trim() : process.env.GEMINI_API_KEY;

    console.log("Testing with API Key length:", apiKey ? apiKey.length : 0);

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

    try {
        const result = await model.generateContent("Hello?");
        console.log("Success:", result.response.text());
    } catch (error) {
        console.error("Error:", error.message);
        if (error.response) {
            console.error("Error details:", JSON.stringify(error.response, null, 2));
        }
    }
}

test();
