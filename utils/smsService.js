const AfricasTalking = require("africastalking");

const africastalking = AfricasTalking({
  apiKey: process.env.AT_API_KEY,
  username: process.env.AT_USERNAME
});

const sms = africastalking.SMS;

async function sendOTP(phone, otp) {
  try {
    const result = await sms.send({
      to: [phone],
      message: `Your Aviator OTP is: ${otp}. It expires in 5 minutes.`,
      from: process.env.AT_SENDER_ID
    });

    console.log("📩 SMS SENT:", result);
    return result;
  } catch (err) {
    console.error("❌ SMS ERROR:", err.response?.data || err.message);
    throw err;
  }
}

module.exports = { sendOTP };