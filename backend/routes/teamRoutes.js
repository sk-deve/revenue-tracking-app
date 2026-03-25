const express = require("express");
const router = express.Router();

const team = require("../controllers/teamController");
const auth = require("../middlewares/authMiddleware");


router.get("/members", auth, team.getMembers);
router.get("/stats", auth, team.getStats);
router.post("/invite", auth, team.inviteMember);
router.post("/resend-invite", auth, team.resendInvite);
router.post("/accept-invite", team.acceptInvite); 
router.post("/complete-invite", team.completeInvite);
router.get("/activity", auth, team.getActivity);
router.patch("/member/:id", auth, team.updateMember);
router.delete("/member/:id", auth, team.removeMember);


module.exports = router;
