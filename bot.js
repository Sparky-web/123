const vkBot = require("node-vk-bot-api");
const Session = require("node-vk-bot-api/lib/session.js");
const Stage = require("node-vk-bot-api/lib/stage.js");
const Markup = require("node-vk-bot-api/lib/markup.js");
const scene = require("./modules/scene.js");
const db = require("./db.js")
const start = require("./modules/start.js")
const paymentScene = require("./modules/paymentScene")

const log4js = require("log4js");
const logger = log4js.getLogger();
logger.level = "debug";

const dotenv = require("dotenv")
dotenv.config()

const bot = new vkBot(process.env.VK_API_KEY);
const session = new Session();

const stage = new Stage(scene, paymentScene);

bot.use(session.middleware());
bot.use(stage.middleware());

bot.on(async ctx => {
    try {
        logger.info(`New user: user id is ${ctx.message.user_id}`);
        startTrailPeriod(ctx.message.user_id.toString())
        ctx.scene.enter("index")
    } catch (e) {
        logger.error(e)
    }
});
bot.startPolling(async () => {
    try {
        const users = []
        await db.collection("users")
            .where("isRunning", "==", true)
            .get()
            .then(snap => snap.forEach(async doc => {
                await db.collection("users").doc(doc.id).update({isRunning: false})
                users.push(doc.data().user_id)
            }))

        setTimeout(() =>
            bot.sendMessage(users,
                "❗ Внимание ❗\n" +
                "Бот перезапущен, нажмите на кнопку ниже чтобы продолжить.", null,
                Markup.keyboard([Markup.button("Начать", "primary")]))
        , 5000)


        start(bot)
        console.log("started")
    } catch (e) {
        logger.error(e)
    }
});

async function startTrailPeriod(user_id) {
    try {
        const userRef = db.collection("users")
            .doc(user_id)
        const userData = await userRef.get().then(e => e.data())
        const paymentsData = await db.collection("settings").doc("payments").get().then(e => e.data())

        if (!userData) {
            await userRef.set({
                days: paymentsData.trailPeriod,
                user_id,
                isRunning: false
            }, {merge: true})
        }
    }
    catch (e) {
        throw new Error(e)
    }
}


