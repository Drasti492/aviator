const otpStore = new Map();
const attemptStore = new Map();

const MAX_ATTEMPTS = 4;
const WINDOW = 6 * 60 * 60 * 1000; // 6 hours

// ================= SAVE OTP =================
exports.saveOTP = (phone, code) => {
  const attempts = attemptStore.get(phone) || { count: 0, start: Date.now() };

  // reset window after 6 hrs
  if (Date.now() - attempts.start > WINDOW) {
    attemptStore.set(phone, { count: 0, start: Date.now() });
  }

  const current = attemptStore.get(phone);

  if (current.count >= MAX_ATTEMPTS) {
    throw new Error("OTP limit reached. Try again after 6 hours.");
  }

  current.count += 1;
  attemptStore.set(phone, current);

  otpStore.set(phone, {
    code,
    expires: Date.now() + 5 * 60 * 1000 // 5 mins
  });
};

// ================= VERIFY OTP =================
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