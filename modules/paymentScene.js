const Scene = require("node-vk-bot-api/lib/scene.js");
const Markup = require("node-vk-bot-api/lib/markup.js");

const log4js = require("log4js");
const logger = log4js.getLogger();
logger.level = "debug";

const db = require("../db.js");
const checkPayment = require("./checkPayment")

const admin = require('firebase-admin');

function randomInteger(min, max) {
    // получить случайное число от (min-0.5) до (max+0.5)
    let rand = min - 0.5 + Math.random() * (max - min + 1);
    return Math.round(rand);
}


module.exports = new Scene("payment",
        ctx => {
            ctx.reply("💰 Стоимость продления подписки на 1 день - 20 рублей.\n" +
                "🉐 При продлении подписки на 1 месяц или больше - скидка 30%\n\n" +
                "❗ Введите кол-во дней для продления (Например 35) ❗", null, Markup.keyboard(["Отмена"]))
            ctx.scene.next()
        },
        async ctx => {
            if (ctx.message.body === "Отмена") ctx.scene.enter("index")
            else if (!isNaN(+ctx.message.body) && +ctx.message.body < 1000000) {
                const paymentData = await db.collection("settings").doc("payments").get().then(snap => snap.data())
                const amount = Math.floor(+ctx.message.body)
                const sum = Math.floor(amount < paymentData.discountSince ?
                    amount * paymentData.pricePerDay :
                    amount * paymentData.pricePerDay * 0.7)

                ctx.session.amount = amount;
                ctx.session.sum = sum;

                ctx.reply(`🔮 Вы продляете подписку на ${ctx.session.amount} дней.\n💵 Стоимость: ${sum}₽ \n\nВы хотите продолжить?`,
                    null,
                    Markup.keyboard([Markup.button("К оплате", "positive"), Markup.button("Отмена")]))

                ctx.scene.next()
            } else ctx.reply("Введите корректное число")
        },
        ctx => {
            ctx.session.comment = randomInteger(100000, 999999)
            if (ctx.message.body === "Отмена") ctx.scene.enter("index")
            else if (ctx.message.body === "К оплате") {
                ctx.reply(`
🏷 Продление подписки на ${ctx.session.amount} дней
➖➖➖➖➖➖➖➖➖➖
🔗 Ссылка для быстрой оплаты: https://qiwi.com/payment/form/99?extra%5B%27account%27%5D=${process.env.QIWI_NUMBER}&currency=643&comment=${ctx.session.comment}&amountInteger=${ctx.session.sum}&amountFraction=0&blocked%5B0%5D=account&blocked%5B1%5D=comment
➖➖➖➖➖➖➖➖➖➖
🥝 Кошелек: ${process.env.QIWI_NUMBER}
💰 Сумма: ${ctx.session.sum} ₽
📝 КОММЕНТАРИЙ в QIWI: ${ctx.session.comment}
➖➖➖➖➖➖➖➖➖`, null, Markup.keyboard([Markup.button("Проверить оплату", "positive"), Markup.button("Отмена")]))
                ctx.scene.next()
            }
            else ctx.reply("Я вас не понимаю, используйте клавиатуру")
        },
        async ctx => {
            if(ctx.message.body === "Отмена") ctx.scene.enter("index")
            else if(ctx.message.body === "Проверить оплату") {
                const checked = await checkPayment(ctx.session.comment, ctx.session.sum)
                if(checked) {
                    await db.collection("users")
                        .doc(ctx.message.user_id.toString())
                        .update({
                            days: admin.firestore.FieldValue.increment(+ctx.session.amount)
                        })
                    ctx.reply("✅ Отлично! ваша подписка продлена.")
                    ctx.scene.enter("index")
                } else {
                    ctx.reply("❌ Оплата не пришла, попробуйте еще раз или обратитесь к администратору.")
                }
            }
            else ctx.reply("Я вас не понимаю, используйте клавиатуру")
        })
