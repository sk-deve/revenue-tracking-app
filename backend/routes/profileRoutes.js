const router = require("express").Router();
const profile = require("../controllers/profileController");
const auth = require("../middlewares/authMiddleware");

router.get("/me", auth, profile.getMe);
router.put("/me", auth, profile.updateMe);

module.exports = router;
