const headers = require("./config.js")
const fetch = require("node-fetch")
const cheerio = require("cheerio")

const dotenv = require("dotenv")
dotenv.config()

const log4js = require("log4js");
const logger = log4js.getLogger();
logger.level = "debug";

let isSent = false

module.exports = async (config, matches, bot) => {
    const totals = config.total.split("-")
    const time = config.time.split("-");

    const x = await Promise.all(matches.map(async match => {
        if(match.time > time[0] && match.time < time[1] && match.score === "0-0") {


            const odds = await parseOdds(match.link).catch(async e => {
                if(!isSent) {
                    console.error(e)
                    if(bot) bot.sendMessage(process.env.OWNER_ID, "Войдите в аккаунт на betsApi")
                    isSent = true
                }
                return undefined
            })

            if(odds && odds > totals[0] && odds < totals[1]) {
                isSent = false
                return match
            }
        }
    }))
    return x.filter(el => el)
}

const parseOdds = async (link) => {
    let newLink = link.replace(/\/r\//ig, "/rs/bet365/")
    newLink = newLink.replace(/ru./ig, "")

    const data = await fetch(newLink, {headers})
        .then(res => res.text())
        .catch(err => {
            logger.error("IMPOSSIBLE ERROR! " + err)
            return "<div></div>"
        })


    const $ = cheerio.load(data)

    const list = $("body > div.page > div.page-main > div.my-3.my-md-5 > div > div:nth-child(5) > div:nth-child(3) > div > table > tbody > tr")

    if(list.length) {
        let index = 0
        list.each((i, elem) => {
            if(!$(elem).children("td:nth-child(2)").text() && !index) {
                index = i + 1
            }
        })
        return $("body > div.page > div.page-main > div.my-3.my-md-5 > div > div:nth-child(5) > div:nth-child(3) > div > table > tbody > tr:nth-child(" + index + ") > td:nth-child(4)").text()
    }
    throw new Error("Куки не дейстительны")
}
