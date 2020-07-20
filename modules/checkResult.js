const log4js = require("log4js");
const logger = log4js.getLogger();
logger.level = "debug";

const headers = require("./config")

const fetch = require("node-fetch");
const cheerio = require("cheerio")
const db = require("../db.js")

const admin = require('firebase-admin');

function checkResult(matches) {
    setTimeout(async () => {
        for (let match of matches) {
            const html = await fetch(match.link, {
                headers
            })
                .then(res => res.text())
                .catch(e => {
                    logger.error(e);
                    return "<div></div>"
                })

            const $ = cheerio.load(html)
            const score = $("div.page-main > div.my-3.my-md-5 > div > div.row.justify-content-md-center.pt-3 > div.col-md-6.text-center > h1 > span > span.text-danger").text()

            const statRef = db.collection("stat").doc("stat")

            if (match.score.trim() === score.trim()) await statRef.update({
                negative: admin.firestore.FieldValue.increment(1)
            })
            else await statRef.update({
                positive: admin.firestore.FieldValue.increment(1)
            })
        }
    }, 1800000)
}

module.exports = checkResult
