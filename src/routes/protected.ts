import { Router } from "express";
import { requireVerifiedUser } from "../middleware/requireVerifiedUser";

const router = Router();

router.get("/me", requireVerifiedUser, (req, res) => {
  return res.json({
    message: "Protected data access granted.",
    user: req.user,
  });
});

export default router;
