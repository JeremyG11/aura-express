import { Router } from "express";
import {
  addReaction,
  removeReaction,
  getMessageReactions,
} from "@/controllers/reaction";

import { authMiddleware } from "@/middlewares/authMiddleware";

const router: Router = Router();

// Get reactions for a message (Public)
router.get("/message/:messageId", getMessageReactions);

// Protected routes
router.use(authMiddleware);

// Add reaction to message
router.post("/", addReaction);

// Remove reaction
router.delete("/:reactionId", removeReaction);

// Get reactions for a message
router.get("/message/:messageId", getMessageReactions);

export default router;
