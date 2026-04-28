const axios = require("axios");

exports.sendOTP = async (phone, otp) => {
  const AT_USERNAME = process.env.AT_USERNAME || "sandbox";
  const AT_API_KEY = process.env.AT_API_KEY;
  const AT_SENDER = process.env.AT_SENDER || "AVIATOR";

  const isSandbox = AT_USERNAME === "sandbox";
  const baseUrl = isSandbox
    ? "https://api.sandbox.africastalking.com/version1/messaging"
    : "https://api.africastalking.com/version1/messaging";

  const params = new URLSearchParams();
  params.append("username", AT_USERNAME);
  params.append("to", "+" + phone); // ensure + prefix
  params.append("message", `Your Aviator OTP is: ${otp}. Valid for 5 minutes. Do not share.`);
  if (!isSandbox) params.append("from", AT_SENDER);

  const res = await axios.post(baseUrl, params.toString(), {
    headers: {
      apiKey: AT_API_KEY,
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json"
    },
    timeout: 10000
  });

  console.log("AT SMS response:", JSON.stringify(res.data).slice(0, 200));
  return res.data;
};