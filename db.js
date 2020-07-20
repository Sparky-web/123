const admin = require("firebase-admin");
const dotenv = require("dotenv")
dotenv.config()

const firebase_config = require(process.env.TEST_MODE ? "./firebase_configs/test" : "./firebase_configs/main")

admin.initializeApp(firebase_config);

module.exports = admin.firestore();
