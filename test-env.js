const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

console.log("--- Env Test ---");
console.log("Current Directory:", __dirname);
console.log("DATABASE_URL exists:", !!process.env.DATABASE_URL);
console.log("DATABASE_URL value:", process.env.DATABASE_URL);
console.log("----------------");
