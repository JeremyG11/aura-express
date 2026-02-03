import { Request, Response, Router } from "express";

const router: Router = Router();

import {
  createChannelMessage,
  createDirectMessage,
  updateMessage,
  deleteMessage,
  getConversation,
  sendMessageController,
  getMessages,
} from "@/controllers/message";
import validator from "@/middlewares/validationMiddleware";
import {
  createChannelMessageSchema,
  createDirectMessageSchema,
  updateMessageSchema,
  deleteMessageSchema,
} from "@/schemas/message.schema";

router.post(
  "/channel",
  validator(createChannelMessageSchema),
  createChannelMessage,
);

router.post(
  "/direct",
  validator(createDirectMessageSchema),
  createDirectMessage,
);

router.patch("/:messageId", validator(updateMessageSchema), updateMessage);

router.delete("/:messageId", validator(deleteMessageSchema), deleteMessage);

router.get("/conversation", getConversation);

router.get("/", getMessages);

export default router;
