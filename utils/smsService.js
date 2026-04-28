const axios = require("axios");

exports.sendOTP = async (phone, otp) => {
  const params = new URLSearchParams();

  params.append("username", "YOUR_USERNAME"); // LIVE USERNAME
  params.append("to", phone);
  params.append("message", `Your Aviator OTP is ${otp}`);

  const res = await axios.post(
    "https://api.africastalking.com/version1/messaging",
    params,
    {
      headers: {
        apiKey: process.env.AT_API_KEY,
        "Content-Type": "application/x-www-form-urlencoded"
      }
    }
  );

  return res.data;
};