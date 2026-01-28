import { Socket } from "socket.io";
import { Notification, User } from "@prisma/client";

export interface CustomSocket extends Socket {
  user?: {
    id: string;
    name: string;
    imageUrl?: string;
    email: string;
    username?: string;
  };
}

export interface NotificationWithUpdates extends Notification {
  updates: Partial<Notification>;
}

export interface NotificationCreateInput {
  senderId: string;
  receiverId: string;
}
