const config = require("./modules/config")
const fetch = require("node-fetch")

const log4js = require("log4js");
const logger = log4js.getLogger();
logger.level = "debug";

module.exports = async function check() {
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