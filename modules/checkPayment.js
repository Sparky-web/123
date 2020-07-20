const fetch = require("node-fetch")

const dotenv = require("dotenv")
dotenv.config()

async function checkPayment(comment, sum) {
    try {
        const {data} = await fetch(`https://edge.qiwi.com/payment-history/v2/persons/${process.env.QIWI_NUMBER}/payments?rows=10&operation=IN`, {
            headers: {
                "Authorization": `Bearer ${process.env.QIWI_TOKEN}`,
                "Accept": "application/json",
                "Content-Type": "application/json"
            },
            method: "GET"
        })
            .then(res => res.json())

        const found = data.find(payment => payment.comment === comment.toString()
            && +payment.sum.amount === +sum
            && +payment.sum.currency === 643
            && payment.status === 'SUCCESS'
        )
        console.log("checked")
        if(found) {
            console.log(`New Payment from ${found.account} with comment ${found.comment}, amount is ${found.sum.amount} RUB`)
            return true
        } else return false
    } catch (e) {
        throw new Error(e)
    }
}

module.exports = checkPayment
