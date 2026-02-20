const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require('fs');
const path = require('path');

async function listModels() {
    const envContent = fs.readFileSync(path.join(__dirname, '.env.local'), 'utf-8');
    const apiKeyMatch = envContent.match(/GEMINI_API_KEY=(.*)/);
    const apiKey = apiKeyMatch ? apiKeyMatch[1].trim() : process.env.GEMINI_API_KEY;

    if (!apiKey) {
        console.error("No API key found.");
        return;
    }

    // The simplified SDK might not expose listModels directly on the main class easily in all versions,
    // but let's try the standard verify method.
    // Actually, checking standard fetch to the models endpoint is often most reliable for "what do I have access to".

    console.log("Checking models using API Key: " + apiKey.substring(0, 5) + "...");

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        const data = await response.json();

        if (data.models) {
            console.log("Available models:");
            data.models.forEach(m => console.log(`- ${m.name} (${m.supportedGenerationMethods})`));
        } else {
            console.log("No models returned or error:", data);
        }
    } catch (error) {
        console.error("Error fetching models:", error);
    }
}

listModels();
