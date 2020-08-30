const dotenv = require("dotenv")
dotenv.config()
const vkBot = require("node-vk-bot-api");
const db = require("./db.js")

const bot = new vkBot(process.env.TEST_MODE ? process.env.TEST_VK_API_KEY :  process.env.VK_API_KEY);

async function start() {
    const users = [];
    await db.collection("users")
        .get()
        .then(snap => snap.forEach(doc => {
            users.push(doc.id)
        }))
}
start()