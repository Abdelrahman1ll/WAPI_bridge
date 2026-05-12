const express = require("express");
const router = express.Router();
const {
  requestLogin,
  verifyOTP,
  requestLogout,
  submitPayment,
  approvePayment,
  getAllUsers,
  deactivateUser,
  getProfile,
  getUserById,
  submitMessage,
  getAllMessages,
  updateMessageStatus,
} = require("../controllers/auth.controller");
const { verifyToken } = require("../middlewares/auth.middleware");

router.post("/login", requestLogin);
router.post("/verify", verifyOTP);
router.post("/logout", requestLogout);
router.post("/submit-payment", submitPayment);
router.post("/approve-payment", verifyToken, approvePayment);
router.get("/users", verifyToken, getAllUsers);
router.post("/deactivate-user", verifyToken, deactivateUser);
router.get("/get-profile", verifyToken, getProfile);
router.get("/user/:id", verifyToken, getUserById);

// Message Routes
router.post("/submit-message", submitMessage);
router.get("/messages", verifyToken, getAllMessages);
router.post("/update-message-status", verifyToken, updateMessageStatus);

module.exports = router;
