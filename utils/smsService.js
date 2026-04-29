const axios = require("axios");

exports.sendOTP = async (phone, otp) => {
  const AT_USERNAME = process.env.AT_USERNAME;
  const AT_API_KEY = process.env.AT_API_KEY;

  if (!AT_USERNAME || !AT_API_KEY) {
    console.log(`📱 [NO SMS CONFIG] OTP for ${phone}: ${otp}`);
    return;
  }

  const isSandbox = AT_USERNAME === "sandbox";

  const baseUrl = isSandbox
    ? "https://api.sandbox.africastalking.com/version1/messaging"
    : "https://api.africastalking.com/version1/messaging";

  // Phone must have + prefix for AT
  const toPhone = phone.startsWith("+") ? phone : "+" + phone;

  const params = new URLSearchParams();
  params.append("username", AT_USERNAME);
  params.append("to", toPhone);
  params.append("message", `Your Aviator OTP is: ${otp}. Valid 5 minutes. Do not share.`);

  // Only add sender ID on live (sandbox ignores it / rejects it)
  if (!isSandbox && process.env.AT_SENDER_ID) {
    params.append("from", process.env.AT_SENDER_ID);
  }

  try {
    const res = await axios.post(baseUrl, params.toString(), {
      headers: {
        apiKey: AT_API_KEY,
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded"
      },
      timeout: 10000
    });

    // AT returns nested response — check it safely
    const recipients = res.data?.SMSMessageData?.Recipients;

    if (!recipients || recipients.length === 0) {
      console.error("AT: No recipients in response", JSON.stringify(res.data));
      return;
    }

    const status = recipients[0]?.status;
    const cost = recipients[0]?.cost;

    console.log(`📱 OTP sent to ${toPhone} — status: ${status}, cost: ${cost}`);

  } catch (err) {
    const atError = err.response?.data;
    console.error("AT SMS failed:", atError || err.message);
    // Log OTP to console as fallback so you can still test
    console.log(`📱 [FALLBACK] OTP for ${phone}: ${otp}`);
    // Don't rethrow — OTP is saved, user can still get it from logs in dev
  }
};