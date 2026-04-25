const axios = require("axios");

exports.sendOTP = async (phone, otp) => {
  try {
    const params = new URLSearchParams();

    params.append("username", "sandbox"); // FORCE for now
    params.append("to", phone);
    params.append("message", `Your Aviator OTP is ${otp}`);

    const response = await axios.post(
      "https://api.sandbox.africastalking.com/version1/messaging",
      params,
      {
        headers: {
          apiKey: process.env.AT_API_KEY,
          "Content-Type": "application/x-www-form-urlencoded"
        }
      }
    );

    console.log("✅ SMS SENT:", response.data);
    return response.data;

  } catch (err) {
    console.log("❌ FULL SMS ERROR:");
    console.log(err.response?.data || err.message);
    throw new Error("SMS sending failed");
  }
};