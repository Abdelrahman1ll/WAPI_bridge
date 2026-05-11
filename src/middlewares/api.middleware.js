const { User } = require("../db/pool");

async function verifyApiKey(req, res, next) {
  let apiKey = req.headers["authorization"] ? req.headers["authorization"].split(' ')[1] : (req.headers["x-api-key"] || req.body.api_key);
  const { userId } = req.params;

  if (!apiKey) {
    return res.status(401).json({ success: false, error: "API Key required" });
  }

  if (!userId) {
    return res.status(400).json({ success: false, error: "User ID required in URL" });
  }

  try {
    const user = await User.findOne({ where: { api_key: apiKey } });

    if (!user) {
      return res.status(401).json({ success: false, error: "Invalid API Key" });
    }

    // Verify if the User ID in URL matches the token owner
    if (user.id !== userId) {
        return res.status(403).json({ success: false, error: "User ID mismatch" });
    }

    // Attach user to request
    req.user = {
        id: user.id,
        email: user.email,
        plan: user.subscription_plan
    };
    next();
  } catch (err) {
    console.error("API verification error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
}

module.exports = { verifyApiKey };
