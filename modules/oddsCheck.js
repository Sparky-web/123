const headers = require("./config.js")
const fetch = require("node-fetch")
const cheerio = require("cheerio")

const log4js = require("log4js");
const logger = log4js.getLogger();
logger.level = "debug";

module.exports = async (config, matches) => {
    const totals = config.total.split("-")
    const time = config.time.split("-");

    const x = await Promise.all(matches.map(async match => {
        if(match.time > time[0] && match.time < time[1] && match.score === "0-0") {
            const odds = await parseOdds(match.link)

            if(odds > totals[0] && odds < totals[1]) {
                return {
                    ...match,
                    sendToGroup: true
                }
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
    const total = $("body > div.page > div.page-main > div.my-3.my-md-5 > div > div:nth-child(5) > div:nth-child(3) > div > table > tbody > tr:nth-child("+ list.length +") > td:nth-child(4)").text()

    return total
}
