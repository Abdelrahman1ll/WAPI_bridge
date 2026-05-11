const { getSocket, isConnected } = require("../services/whatsapp.service");

async function sendMessage(req, res) {
  const { number, message } = req.body;
  const userId = req.user.id; // From auth middleware

  // Phone Validation
  if (!number || !/^\d{10,15}$/.test(number)) {
    return res.status(400).json({ success: false, error: "رقم الهاتف غير صحيح. يجب أن يتراوح بين 10 إلى 15 رقم بدون علامة +" });
  }

  if (!message) {
    return res.status(400).json({ success: false, error: "نص الرسالة مطلوب" });
  }

  const { User } = require("../db/pool");
  const user = await User.findByPk(userId);

  if (!user || user.payment_status !== 'approved') {
      return res.status(403).json({ success: false, error: "يجب تفعيل الحساب أو تجديد الاشتراك لاستخدام الخدمة." });
  }

  const sock = getSocket(userId);

  if (!sock || !sock.user) {
    return res.status(400).json({ success: false, error: "الواتساب غير متصل. يرجى ربط الحساب أولاً." });
  }

  try {
    const jid = `${number}@s.whatsapp.net`;
    await sock.sendMessage(jid, { text: message });
    res.json({ success: true, message: "تم إرسال الرسالة بنجاح" });
  } catch (err) {
    console.error("Send message error:", err);
    res.status(500).json({ success: false, error: "فشل إرسال الرسالة" });
  }
}

module.exports = {
  sendMessage
};
