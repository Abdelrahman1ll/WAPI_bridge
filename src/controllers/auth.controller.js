const jwt = require("jsonwebtoken");
const { User, Message, Op } = require("../db/pool");
const { sendOTP } = require("../services/email.service");
const crypto = require("crypto");

const JWT_SECRET = process.env.JWT_SECRET || "super_secret_jwt_key_12345";

// توليد كود عشوائي من 6 أرقام
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function requestLogin(req, res) {
  const { email, name, phone } = req.body;

  if (!email) {
    return res.status(400).json({ success: false, error: "البريد الإلكتروني مطلوب" });
  }

  try {

    const otp = "123456"; // Hardcoded for testing as requested
    const expiresAt = new Date(Date.now() + 10 * 60000); 

    // Find existing user by email
    let user = await User.findOne({ where: { email } });
    let userId = (user && user.id && user.id.length === 50) ? user.id : Array.from({length: 50}, () => Math.floor(Math.random() * 10)).join('');

    if (user) {
      // Update existing user
      await user.update({
        id: userId, // Migrate to 50 digits if it wasn't already
        name: name || user.name,
        phone: phone || user.phone,
        otp,
        otp_expires: expiresAt
      });
    } else {
      // Create new user
      await User.create({
        id: userId,
        email,
        name: name || null,
        phone: phone || null,
        otp,
        otp_expires: expiresAt
      });
    }

    // Email sending bypassed for testing
    // await sendOTP(email, otp);

    res.json({ success: true, message: "تم إرسال رمز التحقق إلى بريدك الإلكتروني" });
  } catch (err) {
    console.error("Login request error:", err);
    res.status(500).json({ success: false, error: "حدث خطأ داخلي" });
  }
}

async function verifyOTP(req, res) {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ success: false, error: "البريد والرمز مطلوبان" });
  }

  try {
    const user = await User.findOne({ where: { email, otp } });

    if (!user) {
      return res.status(400).json({ success: false, error: "الرمز غير صحيح" });
    }

    // التحقق من الصلاحية (الوقت)
    if (new Date() > new Date(user.otp_expires)) {
      return res.status(400).json({ success: false, error: "الرمز منتهي الصلاحية، يرجى طلب رمز جديد" });
    }

    // توليد API Key إذا لم يكن موجوداً باستخدام JWT
    let apiKey = user.api_key;
    if (!apiKey) {
      apiKey = jwt.sign({ 
        id: user.id, 
        email: user.email, 
        type: 'api_access' 
      }, JWT_SECRET); 
    }

    // امسح بيانات جلسة الواتساب القديمة لإجبار المستخدم على عمل Scan جديد عند الدخول (بناءً على طلب المستخدم)
    const { WhatsAppSession } = require("../db/pool");
    await WhatsAppSession.destroy({ where: { session_name: `session_${user.id}` } });

    // تحديث المستخدم وتصفير الرمز
    await user.update({ 
      otp: null,
      api_key: apiKey
    });

    // إنشاء توكن (Token) للتسجيل
    const token = jwt.sign({ 
      id: user.id, 
      email: user.email, 
      plan: user.subscription_plan 
    }, JWT_SECRET, { expiresIn: "30d" });

    // وضع التوكن في الكوكيز (HTTP-only للحماية)
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 90 * 24 * 60 * 60 * 1000, // 90 يوم (3 أشهر)
      path: "/"
    });

    // وضع بيانات المستخدم في الكوكيز (ليست HTTP-only لكي يقرأها الـ Frontend)
    const userData = {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        plan: user.subscription_plan,
        api_key: apiKey,
        payment_status: user.payment_status,
        role: user.role
    };
    res.cookie("user", JSON.stringify(userData), { maxAge: 90 * 24 * 60 * 60 * 1000, path: "/" });
    res.cookie("isLoggedIn", "true", { maxAge: 90 * 24 * 60 * 60 * 1000, path: "/" });

    res.json({ 
      success: true, 
      user: userData 
    });
  } catch (err) {
    console.error("Verify OTP error:", err);
    res.status(500).json({ success: false, error: "حدث خطأ داخلي" });
  }
}

async function getProfile(req, res) {
  try {
    const { Subscription } = require("../db/pool");
    const user = await User.findByPk(req.user.id, { include: ['subscription'] });
    if (!user) return res.status(404).json({ success: false, error: "المستخدم غير موجود" });
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, error: "حدث خطأ داخلي" });
  }
}

async function getUserById(req, res) {
  const { id } = req.params;
  try {
    const user = await User.findByPk(id);
    if (!user) return res.status(404).json({ success: false, error: "المستخدم غير موجود" });
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, error: "حدث خطأ داخلي" });
  }
}

async function submitPayment(req, res) {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ success: false, error: "بيانات ناقصة" });

  try {
    const user = await User.findByPk(userId);
    if (!user) return res.status(404).json({ success: false, error: "المستخدم غير موجود" });

    await user.update({ 
      payment_status: 'pending'
    });

    res.json({ success: true, message: "تم إرسال طلب التفعيل للمراجعة" });
  } catch (err) {
    res.status(500).json({ success: false, error: "حدث خطأ داخلي" });
  }
}

async function getAllUsers(req, res) {
  try {
    const users = await User.findAll({
      where: {
        id: { [Op.ne]: req.user.id }
      },
      order: [['createdAt', 'DESC']]
    });
    res.json({ success: true, users });
  } catch (err) {
    res.status(500).json({ success: false, error: "حدث خطأ داخلي" });
  }
}

async function approvePayment(req, res) {
  const { userId, tokenLimit, days, subscriptionId } = req.body;
  const adminId = req.user?.id;

  try {
    const admin = await User.findByPk(adminId);
    if (!admin || admin.role !== 'admin') {
      return res.status(403).json({ success: false, error: "غير مصرح لك بهذا الإجراء" });
    }

    const user = await User.findByPk(userId);
    if (!user) return res.status(404).json({ success: false, error: "المستخدم غير موجود" });

    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + (parseInt(days) || 30));

    await user.update({ 
      payment_status: 'approved',
      token_limit: parseInt(tokenLimit) || 1000,
      subscription_expires: expiryDate,
      subscription_id: subscriptionId || 2 // Default to Basic plan (ID 2) if not specified
    });

    res.json({ success: true, message: "تم تفعيل الحساب وتحديد الصلاحيات بنجاح" });
  } catch (err) {
    res.status(500).json({ success: false, error: "حدث خطأ داخلي" });
  }
}

async function deactivateUser(req, res) {
  const { userId } = req.body;
  const adminId = req.user?.id;

  try {
    const admin = await User.findByPk(adminId);
    if (!admin || admin.role !== 'admin') {
      return res.status(403).json({ success: false, error: "غير مصرح لك بهذا الإجراء" });
    }

    const user = await User.findByPk(userId);
    if (!user) return res.status(404).json({ success: false, error: "المستخدم غير موجود" });

    await user.update({ 
      payment_status: 'unpaid',
      subscription_expires: null,
      token_limit: 100 // Reset to default free limit
    });

    res.json({ success: true, message: "تم إيقاف الحساب بنجاح" });
  } catch (err) {
    res.status(500).json({ success: false, error: "حدث خطأ داخلي" });
  }
}

async function requestLogout(req, res) {
  res.clearCookie("token", { path: "/" });
  res.clearCookie("user", { path: "/" });
  res.clearCookie("isLoggedIn", { path: "/" });
  res.json({ success: true, message: "Logged out successfully" });
}

async function submitMessage(req, res) {
  const { name, email, subject, details } = req.body;
  if (!name || !email || !details) {
    return res.status(400).json({ success: false, error: "يرجى ملء جميع الخانات المطلوبة" });
  }

  try {
    // التحقق من الحد اليومي (رسالتين لكل 24 ساعة)
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const messageCount = await Message.count({
      where: {
        email,
        createdAt: {
          [Op.gte]: twentyFourHoursAgo
        }
      }
    });

    if (messageCount >= 2) {
      return res.status(429).json({ 
        success: false, 
        error: "لقد تجاوزت الحد المسموح به للإرسال (رسالتين كل 24 ساعة). يرجى المحاولة لاحقاً." 
      });
    }

    await Message.create({ name, email, subject, details });
    res.json({ success: true, message: "تم إرسال رسالتك بنجاح! سنقوم بالرد عليك في أقرب وقت ممكن." });
  } catch (err) {
    console.error("Submit message error:", err);
    res.status(500).json({ success: false, error: "حدث خطأ داخلي" });
  }
}

async function getAllMessages(req, res) {
  try {
    const messages = await Message.findAll({
      order: [['createdAt', 'DESC']]
    });
    res.json({ success: true, messages });
  } catch (err) {
    res.status(500).json({ success: false, error: "حدث خطأ داخلي" });
  }
}

async function updateMessageStatus(req, res) {
  const { id, status } = req.body;
  try {
    const message = await Message.findByPk(id);
    if (!message) return res.status(404).json({ success: false, error: "الرسالة غير موجودة" });
    await message.update({ status });
    res.json({ success: true, message: "تم تحديث حالة الرسالة" });
  } catch (err) {
    res.status(500).json({ success: false, error: "حدث خطأ داخلي" });
  }
}

module.exports = {
  // بتعمل ارسال ايميل التحقق وبتخزن ال api key في الداتا بيس
  requestLogin,
  // بتعمل التحقق من ال api key وتخزنه في الداتا بيس
  verifyOTP,
  // بتعمل جلب البيانات الخاصه باليوزر
  getProfile,
  // بتعمل ارسال بيانات الدفع
  submitPayment,
  // بتعمل قبول الدفع وتحديث البيانات الخاصه باليوزر
  approvePayment,
  // بتعمل جلب كل اليوزرز
  getAllUsers,
  // بتعمل الغاء تفعيل الحساب وبتشيل كل البيانات الخاصه باليوزر
  deactivateUser,
  // بتعمل تسجيل الخروج وبتشيل كل البيانات الخاصه باليوزر
  requestLogout,
  // بتعمل جلب البيانات الخاصه باليوزر
  getUserById,
  // ارسال رسالة من صفحة تواصل معنا
  submitMessage,
  // جلب كل الرسائل للادمن
  getAllMessages,
  // تحديث حالة الرسالة (مقروءة، مؤرشفة)
  updateMessageStatus
};
