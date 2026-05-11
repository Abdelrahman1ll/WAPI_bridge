const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "super_secret_jwt_key_12345";

function verifyToken(req, res, next) {
  const token = (req.headers.authorization && req.headers.authorization.split(" ")[1]) || req.cookies.token;

  if (!token) {
    return res.status(401).json({ success: false, error: "Unauthorized: No token provided" });
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (e) {
    return res.status(401).json({ success: false, error: "Unauthorized: Invalid token" });
  }
}

module.exports = {
  verifyToken
};
