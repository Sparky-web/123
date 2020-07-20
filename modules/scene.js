const Scene = require("node-vk-bot-api/lib/scene.js");
const Markup = require("node-vk-bot-api/lib/markup.js");

const log4js = require("log4js");
const logger = log4js.getLogger();
logger.level = "debug";

const db = require("../db.js");
const mainKeyboard = Markup.keyboard([
        [
            Markup.button("Запустить 📡", "primary")
        ],
        [
            Markup.button("Профиль 💳", "default"),
            Markup.button("Продлить подписку 💶", "default")
        ],
        [
            Markup.button("FAQ ❓", "default"),
            Markup.button("Поддержка 👨‍💻", "default")
        ]
    ])

module.exports = new Scene("index", ctx => {
    ctx.reply("Главное меню ⚡", null, mainKeyboard);
    ctx.scene.next()
}, async ctx => {
    const user_id = ctx.message.user_id.toString();
    const message = ctx.message.body;

    if(/Запустить/ig.test(message)) {
        const isPaid = await startBotForOneUser(user_id)
        if(isPaid) {
            ctx.reply("Начинается поиск", null, Markup.keyboard([Markup.button("Остановить", "negative")]))
            ctx.scene.next()
        } else {
            ctx.reply("Оплатите подписку")
            ctx.scene.enter("index")
        }
    }
    else if(/Профиль/ig.test(message)) {
        const data = await getUserData(user_id)
        ctx.reply(`
❕ Информация об аккаунте

🔗 Ваш id: ${data.user_id},
🕐 Осталось дней до конца подписки: ${data.days}
`)
    }
    else if(/Продлить подписку/ig.test(message)) {
        ctx.scene.enter("payment")
    }
    else if(/FAQ/ig.test(message)) {
        ctx.reply("В разработке")
        ctx.scene.enter("index")
    }
    else if(/Поддержка/ig.test(message)) {
        ctx.reply("По всем вопросам и предложениям писать администратору - @filipovskij")
    }
    else ctx.reply("Используйте клавиатуру", null, mainKeyboard);

}, async ctx => {

    if (ctx.message.body) {
        await db.collection("users")
            .doc(ctx.message.user_id.toString())
            .update({isRunning: false})

        ctx.scene.enter("index")
    }
});

async function startBotForOneUser(user_id) {
    const userData = await getUserData(user_id)
    const userRef = db.collection("users").doc(user_id.toString())

    if(userData.days) {
        await userRef.update({isRunning: true})
        return true
    } else return false
}
async function checkDays(user_id) {
    const days = await getUserData(user_id).then(e => e.days)
    return !!days
}
function getUserData(user_id) {
    return db.collection("users")
        .doc(user_id.toString())
        .get()
        .then(snap => snap.data())
}
