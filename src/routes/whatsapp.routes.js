const express = require("express");
const router = express.Router();
const { sendMessage } = require("../controllers/whatsapp.controller");
const { verifyToken } = require("../middlewares/auth.middleware");
const { verifyApiKey } = require("../middlewares/api.middleware");

// Dashboard route (Token)
router.post("/send-message", verifyToken, sendMessage);

// External API route (API Key + User ID in URL)
router.post("/external/send/:userId", verifyApiKey, sendMessage);

module.exports = router;
