const otpStore = new Map();
const attemptStore = new Map();

const MAX_ATTEMPTS = 4;
const WINDOW = 6 * 60 * 60 * 1000; // 6 hours

// ================= SAVE OTP =================
exports.saveOTP = (phone, code) => {
  // Get or create attempt record
  let attempts = attemptStore.get(phone);

  // First time or window expired — reset
  if (!attempts || (Date.now() - attempts.start > WINDOW)) {
    attempts = { count: 0, start: Date.now() };
    attemptStore.set(phone, attempts);
  }

  if (attempts.count >= MAX_ATTEMPTS) {
    throw new Error("OTP limit reached. Try again after 6 hours.");
  }

  attempts.count += 1;
  attemptStore.set(phone, attempts);

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