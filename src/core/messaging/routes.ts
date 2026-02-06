import { Router } from "express";
import * as controllers from "./controllers";
import validator from "@/shared/middlewares/validationMiddleware";
import {
  createChannelMessageSchema,
  createDirectMessageSchema,
  updateMessageSchema,
  deleteMessageSchema,
} from "@/shared/schemas/message.schema";

const router = Router();

// --- Messages ---
const messageRouter = Router();
messageRouter.post(
  "/channel",
  validator(createChannelMessageSchema),
  controllers.createChannelMessage,
);
messageRouter.post(
  "/direct",
  validator(createDirectMessageSchema),
  controllers.createDirectMessage,
);
messageRouter.patch(
  "/:messageId",
  validator(updateMessageSchema),
  controllers.updateMessage,
);
messageRouter.delete(
  "/:messageId",
  validator(deleteMessageSchema),
  controllers.deleteMessage,
);
messageRouter.post("/:messageId/pin", controllers.pinMessage);
messageRouter.delete("/:messageId/pin", controllers.unpinMessage);
messageRouter.get("/conversation", controllers.getConversation);
messageRouter.get("/", controllers.getMessages);

// --- Conversations ---
const conversationRouter = Router();
conversationRouter.get("/", controllers.getConversations);

// --- Threads ---
const threadRouter = Router();
threadRouter.get("/channel/:messageId", controllers.getChannelThreadMetadata);
threadRouter.get("/direct/:messageId", controllers.getDirectThreadMetadata);

// --- Reactions ---
const reactionRouter = Router();
reactionRouter.get("/message/:messageId", controllers.getMessageReactions);
reactionRouter.post("/", controllers.addReaction);
reactionRouter.delete("/:reactionId", controllers.removeReaction);

// --- Polls ---
const pollRouter = Router();
pollRouter.post("/:pollId/vote", controllers.castPollVote);

// --- Link Preview ---
const linkPreviewRouter = Router();
linkPreviewRouter.get("/", controllers.getLinkPreview);

// Mount all messaging-related routes
router.use("/messages", messageRouter);
router.use("/conversations", conversationRouter);
router.use("/threads", threadRouter);
router.use("/reactions", reactionRouter);
router.use("/polls", pollRouter);
router.use("/link-preview", linkPreviewRouter);

export default router;
