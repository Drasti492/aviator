const router = require("express").Router();
const { phoneLogin } = require("../controllers/authController");

router.post("/phone-login", phoneLogin);

module.exports = router;