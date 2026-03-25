const router = require("express").Router();
const ctrl = require("../controllers/notificationController");
const auth = require("../middlewares/authMiddleware");

router.get("/unread-count", auth, ctrl.getUnreadCount);
router.get("/", auth, ctrl.getNotifications);
router.patch("/:id/read", auth, ctrl.markRead);
router.patch("/read-all", auth, ctrl.markAllRead);

module.exports = router;
