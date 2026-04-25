// utils/otpStore.js

const otpStore = new Map();

// SAVE OTP
exports.saveOTP = (phone, code) => {
  otpStore.set(phone, {
    code,
    expires: Date.now() + 5 * 60 * 1000 // 5 minutes
  });
};

// VERIFY OTP
exports.verifyOTP = (phone, code) => {
  const data = otpStore.get(phone);

  if (!data) return false;

  if (Date.now() > data.expires) {
    otpStore.delete(phone);
    return false;
  }

  if (data.code !== code) return false;

  otpStore.delete(phone);
  return true;
};