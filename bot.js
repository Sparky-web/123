const vkBot = require("node-vk-bot-api");
const Session = require("node-vk-bot-api/lib/session.js");
const Stage = require("node-vk-bot-api/lib/stage.js");
const Markup = require("node-vk-bot-api/lib/markup.js");
const scene = require("./modules/scene.js");
const db = require("./db.js")
const start = require("./modules/start.js")
const paymentScene = require("./modules/paymentScene")
const fetch = require("node-fetch")

const config = require("./modules/config")

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
async function check() {
    try {
        const page = await fetch("https://ru.betsapi.com/mm/orders", {headers: config})
            .then(el => el.text())
            .catch(err => {
                logger.error("IMPOSSIBLE ERROR! " + err)
                throw new Error(err)
            })

        if (page.match(/Sign in with Google/ig)) {
            return new Error("Куки не действительны")
        }
        else return "OK"
    } catch (e) {
        return new Error(e)
    }
}

check()
    .then(() => {
        console.log("Куки впорядке, начинаю работу")
        bot.startPolling(async () => {
        try {
            const users = []
            await db.collection("users")
                .where("isRunning", "==", true)
                .get()
                .then(snap => snap.forEach(doc => {
                    users.push(doc.id)
                    db.collection("users").doc(doc.id).update({isRunning: false})
                }))

            if(users.length) {
                setTimeout(() =>
                        bot.sendMessage(users,
                            "❗ Внимание ❗\n" +
                            "Бот перезапущен, нажмите на кнопку ниже чтобы продолжить.", null,
                            Markup.keyboard([Markup.button("Начать", "primary")]))
                            .catch(e => {
                                logger.error(e)
                            })
                    , 5000)
            }
            start(bot)
            console.log("started")
        } catch (e) {
            logger.error(e)
        }
    });
    })
    .catch(console.error);
