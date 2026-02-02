import { Router } from "express";
import { getChannelThreadMetadata, getDirectThreadMetadata } from "@/controllers/thread";

const router: Router = Router();

router.get("/channel/:messageId", getChannelThreadMetadata);
router.get("/direct/:messageId", getDirectThreadMetadata);

export default router;
