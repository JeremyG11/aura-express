export declare module "socket.io" {
  interface Socket {
    user?: {
      id: string;
      name: string;
      imageUrl?: string;
      email: string;
    };
  }
}
