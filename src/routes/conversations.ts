import { Router } from "express";
import { getConversations } from "../controllers/conversation";

const router = Router();

// GET /api/conversations?serverId={serverId}
router.get("/", getConversations);

export default router;
