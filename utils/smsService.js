const axios = require("axios");

exports.sendOTP = async (phone, otp) => {
  try {
    const response = await axios.post(
      "https://api.africastalking.com/version1/messaging",
      new URLSearchParams({
        username: process.env.AT_USERNAME,
        to: phone,
        message: `Your Aviator OTP is ${otp}`
      }),
      {
        headers: {
          apiKey: process.env.AT_API_KEY,
          "Content-Type": "application/x-www-form-urlencoded"
        }
      }
    );

    return response.data;
  } catch (err) {
    console.error("SMS ERROR:", err.response?.data || err.message);
    throw new Error("SMS sending failed");
  }
};