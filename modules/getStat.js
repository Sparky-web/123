const fetch = require("node-fetch");
const cheerio = require('cheerio');

const headers = require("./config")

const log4js = require("log4js");
const logger = log4js.getLogger();
logger.level = "debug";

async function f(link) {
    let data = await fetch(link, {
        headers
    })
        .then(e => e.text())
        .catch(e => {
            logger.error(e)
            return "<div></div>"
        })
    const $ = cheerio.load(data)

    const arr = [];

    const length = $("div.page-main > div.my-3.my-md-5 > div > div:nth-child(4) > div.col-md-8 > table tr").length
    $("div.page-main > div.my-3.my-md-5 > div > div:nth-child(4) > div.col-md-8 > table tr").map((i, el) => {
        const obj = {
            name: "",
            first: 0,
            second: 0
        }
        if(i <= 4 && i > 1) {
            $(el).children().map((i, el) => {
                let name = $(el).text().trim()

                if(name === "Corners") name = "Угловые"
                else if (name === "Corners (Half)") name = "Угловые (половина)"

                if (i === 0 && $(el).text().trim().length === 1) obj.first = $(el).text().trim()
                if (i === 1) obj.name = name
                if (i === 2 && $(el).text().trim().length === 1) obj.second = $(el).text().trim()
            })
            arr.push(obj)
        } else if(i >= length - 5) {
            const name = $(el).find(".text-center").text().trim()
            const first = $(el).find(".sr-only")[0] ? $(el).find(".sr-only")[0].children[0].data : " "
            const second = $(el).find(".sr-only")[1] ? $(el).find(".sr-only")[1].children[0].data : " "
            obj.name = name;
            obj.first = first;
            obj.second = second;
            arr.push(obj)
        }
    })
    return arr
}

module.exports = f
