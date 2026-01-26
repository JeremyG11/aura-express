import { Request, Response, Router } from "express";

const router: Router = Router();

import { io } from "../libs/socket";
import {
  createChannelMessage,
  createDirectMessage,
  updateMessage,
  deleteMessage,
  getConversation,
  sendMessageController,
  getMessages,
} from "../controllers/message";
import validator from "../middlewares/validationMiddleware";
import {
  createChannelMessageSchema,
  createDirectMessageSchema,
  updateMessageSchema,
  deleteMessageSchema,
} from "../schemas/message.schema";

router.post(
  "/channel",
  validator(createChannelMessageSchema),
  (req: Request, res: Response) => {
    createChannelMessage(io, req, res);
  },
);

router.post(
  "/direct",
  validator(createDirectMessageSchema),
  (req: Request, res: Response) => {
    createDirectMessage(io, req, res);
  },
);

router.patch(
  "/:messageId",
  validator(updateMessageSchema),
  (req: Request, res: Response) => {
    updateMessage(io, req, res);
  },
);

router.delete(
  "/:messageId",
  validator(deleteMessageSchema),
  (req: Request, res: Response) => {
    deleteMessage(io, req, res);
  },
);

router.get("/conversation", getConversation);

router.get("/", (req: Request, res: Response) => {
  getMessages(io, req, res);
});

export default router;
