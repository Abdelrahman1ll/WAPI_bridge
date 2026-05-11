const nodemailer = require("nodemailer");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../../.env") });

const emailPass = (process.env.EMAIL_PASS || "").replace(/\s/g, "");

// إعداد خدمة الإيميل (استخدمنا Gmail كمثال، يمكنك تغييره)
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER || "your_email@gmail.com",
    pass: process.env.EMAIL_PASS || "your_app_password"
  }
});

async function sendOTP(toEmail, otpCode) {
  const htmlContent = `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
      <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;700&display=swap" rel="stylesheet">
      <style>
        body { font-family: 'Cairo', sans-serif; background-color: #f4f7f6; margin: 0; padding: 0; text-align: right; }
        .container { max-width: 500px; margin: 20px auto; background: white; border-radius: 15px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #25D366, #128C7E); padding: 30px; text-align: center; color: white; }
        .header h1 { margin: 0; font-size: 24px; }
        .content { padding: 40px; text-align: center; }
        .otp-box { background: #f0fdf4; border: 2px dashed #25D366; padding: 20px; border-radius: 12px; margin: 20px 0; }
        .otp-code { font-size: 42px; font-weight: 700; color: #128C7E; letter-spacing: 5px; margin: 0; }
        .footer { background: #f8fafc; padding: 20px; text-align: center; color: #64748b; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>رمز التحقق - WhatsApp Link</h1>
        </div>
        <div class="content">
          <p>مرحباً، استخدم الرمز التالي لإتمام عملية تسجيل الدخول:</p>
          <div class="otp-box">
            <p class="otp-code">${otpCode}</p>
          </div>
          <p style="color: #64748b; font-size: 14px;">هذا الرمز صالح لمدة 10 دقائق فقط.</p>
        </div>
        <div class="footer">
          <p>إذا لم تطلب هذا الرمز، يمكنك تجاهل هذا الإيميل.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: toEmail,
    subject: "رمز التحقق للدخول - WhatsApp Link",
    html: htmlContent
  };

  try {
    // We mock the email sending if credentials are not provided so it doesn't crash during testing
    if (process.env.EMAIL_USER) {
      await transporter.sendMail(mailOptions);
    } else {
      console.log(`[MOCK EMAIL] To: ${toEmail} | OTP: ${otpCode}`);
    }
    return true;
  } catch (error) {
    console.error("Error sending email:", error);
    return false;
  }
}

module.exports = { sendOTP };
