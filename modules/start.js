const fetch = require("node-fetch");
const cheerio = require("cheerio")

const headers = require("./config")
const oddsCheck = require("./oddsCheck")

const db = require("../db")
const parse = require("../parse")
const getStat = require("./getStat")
const checkResult = require("./checkResult")

let session = []

const log4js = require("log4js");
const logger = log4js.getLogger();
logger.level = "debug";

const api = require('node-vk-bot-api/lib/api');

const dotenv = require("dotenv")
dotenv.config()

async function index(bot) {
    try {
        // Getting timings from DB
        const {oddsMatchSettings} = await getConfig()
        const parsed = await parse()
        const oddsMatches = await oddsCheck(oddsMatchSettings, parsed)
            .then(filterOlder)
            .then(getStatistic)

        const stringResult = stringifyResult(oddsMatches)
        let activeUsers = [1, 2] //await getActiveUsers()

        // if (oddsMatches && oddsMatches.length) {
        //     await api("wall.post", {
        //         owner_id: -process.env.GROUP_ID,
        //         from_group: 1,
        //         message: stringifyResult(oddsMatches),
        //         access_token: process.env.VK_ACCESS_KEY,
        //     })
        // }
        if (activeUsers.length && stringResult) {
            console.log(activeUsers, stringResult)
            checkResult(oddsMatches)
            bot.sendMessage(activeUsers, stringResult)
        }
    } catch (e) {
        logger.error(e)
    }
}

async function getConfig() {
    const config = {}
    await db.collection("settings")
        .get()
        .then(snap => snap.forEach(el => config[el.id] = el.data()))
    return config
}
function getActiveUsers () {
    return new Promise(async (resolve, reject) => {
        const activeUsers = [];
        await db.collection("users")
            .where("isRunning", "==", true)
            .get()
            .then(snap => {
                snap.forEach(doc => activeUsers.push(doc.data()))
            })
            .catch(reject)

        resolve(activeUsers.map(el => el.user_id))
    })
}

async function filterParsed (parsed, timings, totals, maxGoals, scores) {
    const filtered = [];
    for(let e of parsed) {
        const firstTimeCondition = e.time >= timings["1"][0] && e.time <= timings["1"][1]
            && e.expectedTotal - e.totalNow >= totals["1"][0]
            && e.expectedTotal - e.totalNow <= totals["1"][1]
            && !scores["1"].find(el => el === e.score)
        const secondTimeCondition = e.time >= timings["2"][0] && e.time <= timings["2"][1]
            && e.expectedTotal - e.totalNow >= totals["2"][0]
            && e.expectedTotal - e.totalNow <= totals["2"][1]
            && !scores["2"].find(el => el === e.score);

        if((firstTimeCondition || secondTimeCondition)
            && e.totalNow <= maxGoals) {
            filtered.push(e)
        }
    }
    return filtered
}
function filterByScore (parsed) {
    return new Promise((resolve, reject) => {
        setTimeout(async () => {
            const filtered = []
            for(let e of parsed) {
                const currentScore = await getScoreFromLink(e.link)
                    .catch(reject)
                if(currentScore === e.score) filtered.push(e)
            }
            resolve(filtered)
        }, 30000)
    })
}

function filterOlder (parsed) {
    return parsed.filter(el => {
        if(!session.find(e => e === el.uId)) {
            session.push(el.uId)
            return true
        }
    })
}
function getStatistic (parsed) {
    return new Promise((resolve, reject) => {
        Promise.all(parsed.map(async el => {
            const stat = await getStat(el.link)
                .catch(reject)
            return {...el, stat}
        }))
            .then(resolve)
            .catch(reject)
    })
}
function stringifyResult (parsed) {
    const matchToString = el => {
        return `
❗ВНИМАНИЕ СИГНАЛ❗

Лига: ${el.league}
Время: ${el.time}
Команды: ${el.firstTeam} | ${el.secondTeam}
Счет: ${el.score}
(Ожидается гол)
➖➖➖➖➖➖➖➖
${el.stat.map(el => `${el.name}: ${el.first} | ${el.second} \n`)}
`
    }
    if(parsed.length) {
        return parsed.map(matchToString).toString().replace(/,/g, " ")
    } else {
        return undefined
    }
}

async function getScoreFromLink (link) {
    const html = await fetch(link, {headers})
        .then(res => res.text())
        .catch(err => {
            logger.error(err)
            return "<div></div>"
        })
    const $ = cheerio.load(html)
    const score = $("div.page-main > div.my-3.my-md-5 > div > div.row.justify-content-md-center.pt-3 > div.col-md-6.text-center > h1 > span > span.text-danger").text()

    return score.trim()
}
function start (bot) {
    index(bot)
    setInterval(() => index(bot), 120000)
    setInterval(() => session = [],1800000)
}


module.exports = start

