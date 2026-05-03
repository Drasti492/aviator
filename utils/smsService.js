
const axios = require("axios");

exports.sendOTP = async (phone, otp) => {
  const AT_USERNAME = process.env.AT_USERNAME;
  const AT_API_KEY  = process.env.AT_API_KEY;

  // Always log to console — useful for support/debugging
  console.log(`📱 OTP for +${phone}: ${otp}`);

  // If sandbox or not configured, just log and return
  if (!AT_USERNAME || !AT_API_KEY) {
    console.warn("⚠️  AT_USERNAME or AT_API_KEY not set — OTP only in console");
    return;
  }

  if (AT_USERNAME === "sandbox") {
    console.log("📱 [SANDBOX MODE] OTP not sent to real phone — check AT simulator");
    return;
  }

  // AT requires + prefix on phone number
  const toPhone = phone.startsWith("+") ? phone : "+" + phone;

  const message = `Your Aviator OTP is: ${otp}. Valid for 5 minutes. Do not share with anyone.`;

  const params = new URLSearchParams();
  params.append("username", AT_USERNAME);
  params.append("to",       toPhone);
  params.append("message",  message);
  // ✅ NO "from" field intentionally removed
  // AT will use their own registered numeric shortcode instead of AFRICASTKNG
  // Numeric shortcodes are NOT blacklisted on Safaricom/Airtel

  try {
    const res = await axios.post(
      "https://api.africastalking.com/version1/messaging",
      params.toString(),
      {
        headers: {
          apiKey:           AT_API_KEY,
          Accept:           "application/json",
          "Content-Type":   "application/x-www-form-urlencoded"
        },
        timeout: 10000
      }
    );

    const data      = res.data?.SMSMessageData;
    const recipients = data?.Recipients || [];
    const recipient = recipients[0];

    if (!recipient) {
      console.warn("⚠️  AT: No recipient in response", JSON.stringify(res.data));
      return;
    }

    const status  = recipient.status;
    const cost    = recipient.cost;
    const network = recipient.networkCode;

    console.log(`✅ OTP sent to ${toPhone} | status: ${status} | cost: ${cost} | network: ${network}`);

    // Warn if still blacklisted so you know immediately
    if (status === "UserInBlacklist") {
      console.warn(`⚠️  ${toPhone} is blacklisted. User must dial *456*9# > opt 5 > opt 5 > Activate`);
    }

    return res.data;

  } catch (err) {
    const errData = err.response?.data;
    console.error("❌ AT SMS failed:", errData || err.message);
    // Fallback — OTP is still saved in otpStore, visible in logs
    console.log(`📱 [FALLBACK] OTP for ${phone}: ${otp}`);
  }
};
