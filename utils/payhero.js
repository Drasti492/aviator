// utils/payhero.js
const axios = require("axios");

exports.stkPush = async (phone, amount) => {
  const res = await axios.post(
    process.env.PAYHERO_URL,
    {
      phone,
      amount
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.PAYHERO_API_KEY}`
      }
    }
  );

  return res.data;
};