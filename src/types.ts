import { Socket } from "socket.io";
import { Notification, User } from "@prisma/client";

export interface CustomSocket extends Socket {
  user?: Pick<User, "id" | "email" | "name" | "imageUrl"> & {
    username?: string;
  };
}
export type GoogleReturnedToken = {
  access_token: string;
  expires_in: number;
  refresh_token: string;
  scope: string;
  id_token: string;
};

export interface GoogleAccountUser {
  id: string;
  email: string;
  verified_email: boolean;
  name: string;
  given_name: string;
  family_name: string;
  picture: string;
  locale: string;
}

export interface NotificationWithUpdates extends Notification {
  updates: Partial<Notification>;
}

export interface NotificationCreateInput {
  senderId: string;
  receiverId: string;
}
