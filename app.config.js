// Load .env so EXPO_PUBLIC_* vars are available when Expo starts
require("dotenv").config();

module.exports = require("./app.json").expo;
