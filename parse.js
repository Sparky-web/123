const fetch = require("node-fetch");
const cheerio = require('cheerio');

const headers = require("./modules/config")

const log4js = require("log4js");
const logger = log4js.getLogger();
logger.level = "debug";

async function parse() {
    try {
        const data = await fetch("http://ru.betsapi.com/ci/soccer?ot=3", {
            headers
        })
            .then(e => e.text())
            .catch(e => {
                logger.error(e)
                return "<div></div>"
            })
        const $ = cheerio.load(data);

        logger.info(`Всего на странице найдено ${$(".c_1").length} матчей`);
        const arr = [];

        $(".c_1").each((i, el) => {
            const uId = $(el).attr("id");
            const league = $(el).find(".league_n > a").text();
            const time = Number($(el).find(".race-time").text().slice(0, 2));
            const firstTeam = $(el).find("td:nth-child(3) > a").text();
            const secondTeam = $(el).find("td:nth-child(5) > a").text();
            const score = $(el).find("td:nth-child(4) > a").text();
            const rawExpectedTotal = $(el).find("td:nth-child(7)").text();
            const link = "https://ru.betsapi.com" + $(el).find("td:nth-child(4) > a").attr("href")

            let expectedTotal = rawExpectedTotal.split(",")[0];
            expectedTotal = Number(expectedTotal);

            const totalNow = +score[0] + +score[2];

            if(!/Esoccer/ig.test(league) && !/жен/ig.test(league) && !/жен/ig.test(firstTeam) && !/жен/ig.test(secondTeam) && link) {
                arr.push({
                    uId,
                    league,
                    time,
                    firstTeam,
                    secondTeam,
                    expectedTotal,
                    rawExpectedTotal,
                    totalNow,
                    score,
                    link
                })
            }
        });

        return arr
    } catch (e) {
        logger.error(e);
    }
}

module.exports = parse;
// setInterval(() => f(), 1);
