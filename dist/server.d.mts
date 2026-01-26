import * as socket_io from 'socket.io';
import { Server } from 'socket.io';
import { Application } from 'express';

declare const app: Application;
declare const io: Server<socket_io.DefaultEventsMap, socket_io.DefaultEventsMap, socket_io.DefaultEventsMap, any>;

export { app, io };
