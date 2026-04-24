const router = require("express").Router();
const ctrl = require("../controllers/gameController");

router.get("/history", ctrl.history);

module.exports = router;