import { Router } from "express";
import { getServerChannels } from "@/controllers/channel";

const router: Router = Router();

router.get("/server/:serverId", getServerChannels);

export default router;
