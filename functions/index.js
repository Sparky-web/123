const functions = require('firebase-functions');
const admin = require('firebase-admin');
const api = require('node-vk-bot-api/lib/api')
const vkBot = require('node-vk-bot-api')

admin.initializeApp();
const db = admin.firestore();

// // Create and Deploy Your First Cloud Functions
// // https://firebase.google.com/docs/functions/write-firebase-functions
//
// exports.helloWorld = functions.https.onRequest((request, response) => {
//   functions.logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });

const decrementDays = async () => {
    const users = [];
    await db.collection("users")
        .get()
        .then(snap => {
            snap.forEach(el => {
                el.data().days ? users.push({id: el.id, days: el.data().days}) : true
            })
        })

    for (let user of users) {
        await db.collection("users").doc(user.id).update({
            days: user.days - 1
        })
    }
}
const sendStatistic = async () => {
    const statRef = db.collection("stat").doc("stat")
    const statistics = await statRef.get()
    const statisticsData = statistics.data()
    const stringStat =
        `
📊 Статистика за сегодня

✅ Зашло - ${statisticsData.positive}
⛔ Не зашло - ${statisticsData.negative}
`
    await api("wall.post", {
        owner_id: -195095861,
        message: stringStat,
        from_group: 1,
        attachments: "photo-195095861_457239135",
        access_token: "412ce734558658ce2b81e2b3c2e63d2eb1e21f344db69ea22065550d5a9977b658ef7f417c9fffeb327d0"
    })
    await statRef.set({
        positive: 0,
        negative: 0
    });

    return null;
}

exports.clearStat = functions.pubsub.schedule('0 0 * * *')
    .timeZone("Europe/Moscow")
    .onRun(async () => {
        await sendStatistic()
        await decrementDays()
        return null
    });

exports.sendStat = functions.https.onRequest(async (req, res) => {
    await sendStatistic()
    res.send("OK");
});
exports.decrementDays = functions.https.onRequest(async (req, res) => {
    await decrementDays()
    res.send("OK")
})
exports.addDays = functions.https.onRequest(async (req, res) => {
    const users = []
    await db.collection("users").get().then(snap => snap.forEach(el => users.push(el.id)))
    for (const user of users) {
        await db.collection("users").doc(user).update({
            days: await db.collection("settings").doc("payments").get().then(e => e.data().trailPeriod)
        })
    }
    res.send(users)
})
exports.sendMessage = functions.https.onCall(async (data, context) => {
    const users = []

    await db.collection("users")
        .get()
        .then(snap => snap.forEach(doc => {
            users.push(+doc.id)
        }))

    const token = await db.collection("settings")
        .doc("botToken")
        .get()
        .then(e => e.data().value)

    const bot = new vkBot(token)

    const arrays = [], size = 99;

    while (users.length > 0) {
        arrays.push(users.splice(0, size));
    }

    for(let usersArray of users) {
        bot.sendMessage(usersArray, data.text, data.attachment)
    }

    return {
        arrays,
        data,
        token
    }
})
