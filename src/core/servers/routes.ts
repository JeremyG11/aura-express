import { Router } from "express";
import * as controllers from "./controllers";

const router = Router();

// --- Channels ---
const channelRouter = Router();
channelRouter.get("/server/:serverId", controllers.getServerChannels);
channelRouter.get("/:channelId", controllers.getChannel);
channelRouter.post("/", controllers.createChannel);
channelRouter.patch("/:channelId", controllers.updateChannel);
channelRouter.delete("/:channelId", controllers.deleteChannel);

// --- Members ---
const memberRouter = Router();
memberRouter.get("/server/:serverId", controllers.getServerMembers);
memberRouter.get("/:memberId", controllers.getMember);
memberRouter.patch("/:memberId", controllers.updateMemberRole);
memberRouter.delete("/:memberId", controllers.kickMember);

// Mount routes
router.use("/channels", channelRouter);
router.use("/members", memberRouter);

export default router;
