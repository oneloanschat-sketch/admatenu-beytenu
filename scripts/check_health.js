const axios = require('axios');
async function checkHealth() {
    try {
        console.log("Pinging Production Server...");
        const res = await axios.get('https://admatenu-beytenu-chatbot.onrender.com/', { timeout: 10000 });
        console.log(`Status: ${res.status}`);
        console.log(`Body: ${res.data}`);
    } catch (e) {
        console.log(`❌ Server Down/Unreachable: ${e.message}`);
    }
}
checkHealth();
