var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/server.ts
var server_exports = {};
__export(server_exports, {
  app: () => app
});
module.exports = __toCommonJS(server_exports);
var import_dotenv = __toESM(require("dotenv"));
var import_http = __toESM(require("http"));

// src/config/app.ts
var import_express = __toESM(require("express"));
var import_cors = __toESM(require("cors"));
var import_cookie_parser = __toESM(require("cookie-parser"));
var import_express_rate_limit = require("express-rate-limit");

// src/libs/logger.ts
var import_winston = __toESM(require("winston"));
var logger = import_winston.default.createLogger({
  level: "info",
  format: import_winston.default.format.json(),
  defaultMeta: { service: "user-service" },
  transports: []
});
if (process.env.NODE_ENV !== "production") {
  logger.add(
    new import_winston.default.transports.Console({
      format: import_winston.default.format.simple()
    })
  );
} else {
  logger.add(
    new import_winston.default.transports.Console({
      format: import_winston.default.format.json()
    })
  );
}
var logger_default = logger;

// src/config/app.ts
var allowedOrigins = process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(",") : ["http://localhost:3000"];
function createApp() {
  const app2 = (0, import_express.default)();
  app2.use(import_express.default.json());
  app2.use((0, import_cookie_parser.default)());
  app2.use(
    (0, import_cors.default)({
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) !== -1) {
          callback(null, true);
        } else {
          callback(new Error("Not allowed by CORS"));
        }
      },
      credentials: true
    })
  );
  app2.use((req, res, next) => {
    logger_default.info(`[Request] ${req.method} ${req.url}`);
    next();
  });
  const limiter = (0, import_express_rate_limit.rateLimit)({
    windowMs: 15 * 60 * 1e3,
    // 15 minutes
    max: 100,
    // Limit each IP to 100 requests per `window`
    standardHeaders: true,
    legacyHeaders: false
  });
  app2.use(limiter);
  return app2;
}

// src/config/routes.ts
var import_node3 = require("better-auth/node");

// src/libs/auth.ts
var import_better_auth = require("better-auth");
var import_prisma = require("better-auth/adapters/prisma");
var import_plugins = require("better-auth/plugins");
var import_passkey = require("@better-auth/passkey");

// src/libs/db.ts
var import_client = require("@prisma/client");
var prismaClientSingleton = () => {
  return new import_client.PrismaClient();
};
var globalForPrisma = globalThis;
var prisma = globalForPrisma.prisma ?? prismaClientSingleton();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// src/libs/permissions.ts
var import_access = require("better-auth/plugins/access");
var import_access2 = require("better-auth/plugins/admin/access");
var statements = {
  ...import_access2.defaultStatements,
  posts: ["create", "read", "update", "delete", "update:own", "delete:own"]
};
var ac = (0, import_access.createAccessControl)(statements);
var roles = {
  USER: ac.newRole({
    posts: ["create", "read", "update:own", "delete:own"]
  }),
  ADMIN: ac.newRole({
    posts: ["create", "read", "update", "delete", "update:own", "delete:own"],
    ...import_access2.adminAc.statements
  })
};

// src/libs/argon2.ts
var import_argon2 = require("@node-rs/argon2");
var opts = {
  memoryCost: 19456,
  timeCost: 2,
  outputLen: 32,
  parallelism: 1
};
async function hashPassword(password) {
  const result = await (0, import_argon2.hash)(password, opts);
  return result;
}
async function verifyPassword(data) {
  const { password, hash: hashedPassword } = data;
  const result = await (0, import_argon2.verify)(hashedPassword, password, opts);
  return result;
}

// src/libs/nodemailer.ts
var import_nodemailer = __toESM(require("nodemailer"));
var transporter = import_nodemailer.default.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: process.env.NODEMAILER_USER,
    pass: process.env.NODEMAILER_APP_PASSWORD
  }
});
var nodemailer_default = transporter;

// src/libs/email.ts
var styles = {
  container: "max-width:500px;margin:20px auto;padding:20px;border:1px solid #ddd;border-radius:6px;",
  heading: "font-size:20px;color:#333;",
  paragraph: "font-size:16px;",
  link: "display:inline-block;margin-top:15px;padding:10px 15px;background:#007bff;color:#fff;text-decoration:none;border-radius:4px;"
};
async function sendEmailAction({
  to,
  subject,
  meta
}) {
  const mailOptions = {
    from: process.env.NODEMAILER_USER,
    to,
    subject: `GameCord - ${subject}`,
    html: `
    <div style="${styles.container}">
      <h1 style="${styles.heading}">${subject}</h1>
      <p style="${styles.paragraph}">${meta.description}</p>
      <a href="${meta.link}" style="${styles.link}">Click Here</a>
    </div>
    `
  };
  try {
    await nodemailer_default.sendMail(mailOptions);
    return { success: true };
  } catch (err) {
    console.error("[SendEmail]:", err);
    return { success: false };
  }
}

// src/libs/auth.ts
var auth = (0, import_better_auth.betterAuth)({
  database: (0, import_prisma.prismaAdapter)(prisma, {
    provider: "mongodb"
  }),
  secret: process.env.BETTER_AUTH_SECRET,
  trustedOrigins: ["http://localhost:3000"],
  emailVerification: {
    sendOnSignUp: true,
    expiresIn: 60 * 60,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      const link = new URL(url);
      link.searchParams.set("callbackURL", "/auth/verify");
      await sendEmailAction({
        to: user.email,
        subject: "Verify your email address",
        meta: {
          description: "Please verify your email address to complete the registration process.",
          link: String(link)
        }
      });
    }
  },
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 6,
    autoSignIn: false,
    password: {
      hash: hashPassword,
      verify: verifyPassword
    },
    requireEmailVerification: false,
    sendResetPassword: async ({ user, url }) => {
      await sendEmailAction({
        to: user.email,
        subject: "Reset your password",
        meta: {
          description: "Please click the link below to reset your password.",
          link: String(url)
        }
      });
    }
  },
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          const ADMIN_EMAILS = process.env.ADMIN_EMAILS?.split(";") ?? [];
          if (ADMIN_EMAILS.includes(user.email)) {
            return { data: { ...user, role: "ADMIN" } };
          }
          return { data: user };
        }
      }
    }
  },
  user: {
    additionalFields: {
      role: {
        type: ["USER", "ADMIN"],
        input: false
      }
    }
  },
  session: {
    expiresIn: 30 * 24 * 60 * 60,
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60
    }
  },
  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: ["google", "github"]
    }
  },
  advanced: {
    database: {
      generateId: false
    }
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET
    },
    github: {
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET
    }
  },
  plugins: [
    (0, import_plugins.admin)({
      defaultRole: "USER",
      adminRoles: ["ADMIN"],
      ac,
      roles
    }),
    (0, import_plugins.magicLink)({
      sendMagicLink: async ({ email, url }) => {
        await sendEmailAction({
          to: email,
          subject: "Magic Link Login",
          meta: {
            description: "Please click the link below to log in.",
            link: String(url)
          }
        });
      }
    }),
    (0, import_plugins.twoFactor)({
      otpOptions: {}
    }),
    (0, import_passkey.passkey)(),
    (0, import_plugins.customSession)(async ({ user, session }) => {
      return {
        session: {
          expiresAt: session.expiresAt,
          token: session.token,
          userAgent: session.userAgent
        },
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          createdAt: user.createdAt,
          role: user.role
        }
      };
    })
  ]
});

// src/middlewares/authMiddleware.ts
var import_node = require("better-auth/node");
var authMiddleware = async (req, res, next) => {
  const session = await auth.api.getSession({
    headers: (0, import_node.fromNodeHeaders)(req.headers)
  });
  console.log("[Auth] Session result:", session ? "FOUND" : "NULL");
  if (session) {
    res.locals.userId = session.user.id;
    res.locals.user = session.user;
    return next();
  }
  const internalSecret = req.headers["x-internal-secret"];
  const bridgedUserId = req.headers["x-user-id"];
  console.log("[Auth] Bridged Auth Attempt:", {
    hasSecret: !!internalSecret,
    hasUserId: !!bridgedUserId,
    secretMatch: internalSecret === process.env.SERVER_INTERNAL_SECRET
  });
  if (internalSecret && internalSecret === process.env.SERVER_INTERNAL_SECRET && bridgedUserId) {
    res.locals.userId = bridgedUserId;
    return next();
  }
  if (process.env.NODE_ENV !== "production" && bridgedUserId) {
    console.warn(
      "[Auth] WARNING: Using insecure fallback userId:",
      bridgedUserId
    );
    res.locals.userId = bridgedUserId;
    return next();
  }
  console.error("[Auth] Authentication FAILED for:", req.url);
  return res.status(401).json({ error: "Unauthorized - No valid session or secure bridge found" });
};

// src/middlewares/errorHandler.ts
var errorHandler = (err, req, res, next) => {
  const status = err.status || 500;
  const message = err.message || "Something went wrong";
  console.error(`[Error] ${req.method} ${req.url} - Status: ${status}`, err);
  res.status(status).json({
    error: message,
    stack: process.env.NODE_ENV === "production" ? void 0 : err.stack
  });
};

// src/routes/socket.ts
var import_express2 = require("express");

// src/libs/socket.ts
var import_socket = require("socket.io");

// src/libs/conversation.ts
var findOrCreateConversation = async (memberOneId, memberTwoId) => {
  let conversation = await findConversation(memberOneId, memberTwoId) || await findConversation(memberTwoId, memberOneId);
  if (!conversation) {
    conversation = await createNewConversation(memberOneId, memberTwoId);
  }
  return conversation;
};
var findConversation = async (memberOneId, memberTwoId) => {
  try {
    return await prisma.conversation.findFirst({
      where: {
        AND: [{ memberOneId }, { memberTwoId }]
      },
      include: {
        memberOne: {
          include: {
            profile: true
          }
        },
        memberTwo: {
          include: {
            profile: true
          }
        }
      }
    });
  } catch (error) {
    console.error("Error finding conversation:", error);
    return null;
  }
};
var createNewConversation = async (memberOneId, memberTwoId) => {
  try {
    return await prisma.conversation.create({
      data: {
        memberOneId,
        memberTwoId
      },
      include: {
        memberOne: {
          include: {
            profile: true
          }
        },
        memberTwo: {
          include: {
            profile: true
          }
        }
      }
    });
  } catch {
    return null;
  }
};

// src/libs/socket.ts
var import_node2 = require("better-auth/node");
var io;
var initializeSocket = (httpServer2, allowedOrigins2) => {
  io = new import_socket.Server(httpServer2, {
    cors: {
      origin: allowedOrigins2,
      credentials: true,
      methods: ["GET", "POST"]
    },
    transports: ["websocket", "polling"],
    allowEIO3: true
  });
  io.use(async (socket, next) => {
    logger_default.info("[Socket.io] New connection attempt");
    const session = await auth.api.getSession({
      headers: (0, import_node2.fromNodeHeaders)(socket.handshake.headers)
    });
    if (!session) {
      logger_default.warn("[Socket.io] Unauthenticated connection attempt rejected");
      return next(new Error("Authentication failed"));
    }
    socket.user = {
      id: session.user.id,
      name: session.user.name,
      imageUrl: session.user.image || "",
      email: session.user.email
    };
    logger_default.info(`[Socket.io] User authenticated: ${socket.user.id}`);
    next();
  });
  io.on("connection", (socket) => {
    logger_default.info(`[Socket.io] Client connected: ${socket.id}`);
    socket.join(socket.user?.id);
    socket.onAny((event, ...args) => {
      logger_default.info(event, args);
    });
    const activeUsers = [];
    for (let [id, socket2] of io.of("/").sockets) {
      activeUsers.push({
        socketId: id,
        ...socket2.handshake.auth
      });
    }
    socket.emit("active-users", activeUsers);
    socket.broadcast.emit("user connected", {
      socketId: socket.id,
      userData: { ...socket.handshake.auth }
    });
    socket.emit("session", {
      user: socket.user
    });
    socket.on("private message", async ({ content, to }) => {
      io.to(to).to(socket.user.id).emit("private message", {
        ...content,
        from: socket.user,
        to
      });
      logger_default.info(socket.user.id);
      try {
        const conversation = await findOrCreateConversation(socket.user.id, to);
        if (!conversation) return;
        const member = conversation.memberOne.profileId === socket.user.id ? conversation.memberOne : conversation.memberTwo;
        await prisma.directMessage.create({
          data: {
            content: content.content || content,
            // Handle both object and string
            conversationId: conversation.id,
            memberId: member.id
          }
        });
      } catch (err) {
        logger_default.error(err);
      }
    });
    socket.on("markAsRead", async ({ senderId }) => {
      try {
        const receiverId = socket.user.id;
        await prisma.directMessage.updateMany({
          where: {
            member: {
              profileId: senderId
            },
            conversation: {
              OR: [
                { memberOneId: receiverId, memberTwoId: senderId },
                { memberOneId: senderId, memberTwoId: receiverId }
              ]
            },
            seen: false
          },
          data: {
            seen: true
          }
        });
        io.to(senderId).emit("markAsRead", { senderId, receiverId });
      } catch (error) {
        logger_default.error("\u274C Error marking messages as read:", error);
      }
    });
    socket.on("typing", (to) => {
      socket.broadcast.to(to).emit("broadcast typing", {});
    });
    const notifications = [];
    socket.on("notification", (arg) => {
      socket.broadcast.to(arg.to).emit("notification", arg.notification);
    });
    socket.on("notification-acknowledgment", (notificationId) => {
    });
    socket.on("disconnect", async () => {
      const matchingSockets = await io.in(socket.user.id).fetchSockets();
    });
  });
};

// src/controllers/message.ts
var createChannelMessage = async (io2, req, res) => {
  try {
    const { content, fileUrl, isEncrypted } = req.body;
    const { serverId, channelId } = req.query;
    const userId = res.locals.userId;
    if (!serverId || !channelId) {
      return res.status(400).json({ error: "Server ID or Channel ID missing" });
    }
    if (!content) {
      return res.status(400).json({ error: "Content missing" });
    }
    console.log("[CreateMessage] Attempting with:", {
      userId,
      serverId,
      channelId
    });
    const member = await prisma.member.findFirst({
      where: {
        profile: {
          userId
        },
        serverId
      }
    });
    if (!member) {
      console.error("[CreateMessage] Member NOT FOUND in DB for:", {
        userId,
        serverId
      });
      return res.status(404).json({ error: "Member not found in this server" });
    }
    const message = await prisma.message.create({
      data: {
        content,
        fileUrl: fileUrl || null,
        channelId,
        memberId: member.id,
        isEncrypted: !!isEncrypted
      },
      include: {
        member: {
          include: {
            profile: true
          }
        }
      }
    });
    const channelKey = `chat:${channelId}:messages`;
    io2.emit(channelKey, message);
    return res.status(201).json(message);
  } catch (error) {
    console.error("[CREATE_CHANNEL_MESSAGE]", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};
var createDirectMessage = async (io2, req, res) => {
  try {
    const { content, fileUrl, isEncrypted } = req.body;
    const { conversationId } = req.query;
    const userId = res.locals.userId;
    if (!conversationId) {
      return res.status(400).json({ error: "Conversation ID missing" });
    }
    if (!content) {
      return res.status(400).json({ error: "Content missing" });
    }
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        memberOne: true,
        memberTwo: true
      }
    });
    if (!conversation) {
      return res.status(404).json({ error: "Conversation not found" });
    }
    const member = await prisma.member.findFirst({
      where: {
        profile: {
          userId
        },
        OR: [
          { id: conversation.memberOneId },
          { id: conversation.memberTwoId }
        ]
      }
    });
    if (!member) {
      return res.status(404).json({ error: "Member not found in conversation" });
    }
    const message = await prisma.directMessage.create({
      data: {
        content,
        fileUrl: fileUrl || null,
        conversationId,
        memberId: member.id,
        isEncrypted: !!isEncrypted
      },
      include: {
        member: {
          include: {
            profile: true
          }
        }
      }
    });
    const channelKey = `chat:${conversationId}:messages`;
    io2.emit(channelKey, message);
    return res.status(201).json(message);
  } catch (error) {
    console.error("[CREATE_DIRECT_MESSAGE]", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};
var updateMessage = async (io2, req, res) => {
  try {
    const { messageId } = req.params;
    const { content } = req.body;
    const { serverId, conversationId } = req.query;
    const userId = res.locals.userId;
    if (!content) {
      return res.status(400).json({ error: "Content missing" });
    }
    if (serverId) {
      const member = await prisma.member.findFirst({
        where: {
          profile: { userId },
          serverId
        }
      });
      if (!member) {
        return res.status(404).json({ error: "Member not found" });
      }
      const message = await prisma.message.findFirst({
        where: {
          id: messageId,
          memberId: member.id,
          deleted: false
        }
      });
      if (!message) {
        return res.status(404).json({ error: "Message not found or unauthorized" });
      }
      const updatedMessage = await prisma.message.update({
        where: { id: messageId },
        data: { content },
        include: {
          member: {
            include: { profile: true }
          }
        }
      });
      const updateKey = `chat:${message.channelId}:messages:update`;
      io2.emit(updateKey, updatedMessage);
      return res.status(200).json(updatedMessage);
    } else if (conversationId) {
      const member = await prisma.member.findFirst({
        where: {
          profile: { userId },
          OR: [
            {
              conversationsInitiated: {
                some: { id: conversationId }
              }
            },
            {
              conversationsReceived: { some: { id: conversationId } }
            }
          ]
        }
      });
      if (!member) {
        return res.status(404).json({ error: "Member not found in conversation" });
      }
      const message = await prisma.directMessage.findFirst({
        where: {
          id: messageId,
          memberId: member.id,
          deleted: false
        }
      });
      if (!message) {
        return res.status(404).json({ error: "Message not found or unauthorized" });
      }
      const updatedMessage = await prisma.directMessage.update({
        where: { id: messageId },
        data: { content },
        include: {
          member: {
            include: { profile: true }
          }
        }
      });
      const updateKey = `chat:${conversationId}:messages:update`;
      io2.emit(updateKey, updatedMessage);
      return res.status(200).json(updatedMessage);
    }
    return res.status(400).json({ error: "Context missing (serverId or conversationId)" });
  } catch (error) {
    console.error("[UPDATE_MESSAGE]", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};
var deleteMessage = async (io2, req, res) => {
  try {
    const { messageId } = req.params;
    const { serverId, conversationId } = req.query;
    const userId = res.locals.userId;
    if (serverId) {
      const member = await prisma.member.findFirst({
        where: {
          profile: { userId },
          serverId
        }
      });
      if (!member) {
        return res.status(404).json({ error: "Member not found" });
      }
      const message = await prisma.message.findFirst({
        where: {
          id: messageId
        },
        include: {
          member: true
        }
      });
      if (!message || message.deleted) {
        return res.status(404).json({ error: "Message not found" });
      }
      const isMessageOwner = message.memberId === member.id;
      const isAdmin = member.role === "ADMIN";
      const isModerator = member.role === "MODERATOR";
      if (!isMessageOwner && !isAdmin && !isModerator) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const deletedMessage = await prisma.message.update({
        where: { id: messageId },
        data: {
          fileUrl: null,
          content: "This message has been deleted.",
          deleted: true
        },
        include: {
          member: {
            include: { profile: true }
          }
        }
      });
      const updateKey = `chat:${message.channelId}:messages:update`;
      io2.emit(updateKey, deletedMessage);
      return res.status(200).json(deletedMessage);
    } else if (conversationId) {
      const member = await prisma.member.findFirst({
        where: {
          profile: { userId },
          OR: [
            {
              conversationsInitiated: {
                some: { id: conversationId }
              }
            },
            {
              conversationsReceived: { some: { id: conversationId } }
            }
          ]
        }
      });
      if (!member) {
        return res.status(404).json({ error: "Member not found in conversation" });
      }
      const message = await prisma.directMessage.findFirst({
        where: {
          id: messageId,
          conversationId
        }
      });
      if (!message || message.deleted) {
        return res.status(404).json({ error: "Message not found" });
      }
      if (message.memberId !== member.id) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const deletedMessage = await prisma.directMessage.update({
        where: { id: messageId },
        data: {
          fileUrl: null,
          content: "This message has been deleted.",
          deleted: true
        },
        include: {
          member: {
            include: { profile: true }
          }
        }
      });
      const updateKey = `chat:${conversationId}:messages:update`;
      io2.emit(updateKey, deletedMessage);
      return res.status(200).json(deletedMessage);
    }
    return res.status(400).json({ error: "Context missing (serverId or conversationId)" });
  } catch (error) {
    console.error("[DELETE_MESSAGE]", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};
var getConversation = async (req, res) => {
  const { receiverId } = req.query;
  try {
    const conversation = await findOrCreateConversation(
      res.locals.userId,
      receiverId
    );
    res.status(200).json(conversation);
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: err.message });
  }
};
var getMessages = async (io2, req, res) => {
  const { receiverId } = req.query;
  try {
    const conversation = await findOrCreateConversation(
      res.locals.userId,
      receiverId
    );
    if (!conversation) {
      return res.status(404).json({ error: "Conversation not found" });
    }
    const messages = await prisma.directMessage.findMany({
      where: {
        conversationId: conversation.id
      },
      include: {
        member: {
          include: {
            profile: true
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    });
    res.status(200).json(messages);
  } catch (error) {
    console.log("Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// src/middlewares/validationMiddleware.ts
var validator = (schema) => (req, res, next) => {
  try {
    schema.parse({
      body: req.body,
      query: req.query,
      params: req.params
    });
    next();
  } catch (err) {
    console.log(err);
    return res.status(400).send(err.errors);
  }
};
var validationMiddleware_default = validator;

// src/schemas/message.schema.ts
var import_zod = require("zod");
var createChannelMessageSchema = import_zod.z.object({
  body: import_zod.z.object({
    content: import_zod.z.string().min(1).max(5e3),
    fileUrl: import_zod.z.string().url().optional().nullable(),
    isEncrypted: import_zod.z.boolean().optional()
  }),
  query: import_zod.z.object({
    serverId: import_zod.z.string().min(1),
    channelId: import_zod.z.string().min(1)
  })
});
var createDirectMessageSchema = import_zod.z.object({
  body: import_zod.z.object({
    content: import_zod.z.string().min(1).max(5e3),
    fileUrl: import_zod.z.string().url().optional().nullable(),
    isEncrypted: import_zod.z.boolean().optional()
  }),
  query: import_zod.z.object({
    conversationId: import_zod.z.string().min(1)
  })
});
var updateMessageSchema = import_zod.z.object({
  params: import_zod.z.object({
    messageId: import_zod.z.string().min(1)
  }),
  body: import_zod.z.object({
    content: import_zod.z.string().min(1).max(5e3)
  }),
  query: import_zod.z.object({
    serverId: import_zod.z.string().optional(),
    channelId: import_zod.z.string().optional(),
    conversationId: import_zod.z.string().optional()
  })
});
var deleteMessageSchema = import_zod.z.object({
  params: import_zod.z.object({
    messageId: import_zod.z.string().min(1)
  }),
  query: import_zod.z.object({
    serverId: import_zod.z.string().optional(),
    channelId: import_zod.z.string().optional(),
    conversationId: import_zod.z.string().optional()
  })
});
var conversationSchema = import_zod.z.object({
  query: import_zod.z.object({
    receiverId: import_zod.z.string().min(1)
  })
});
var sendMessageSchema = import_zod.z.object({
  body: import_zod.z.object({
    message: import_zod.z.string().min(1)
  }),
  query: import_zod.z.object({
    receiverId: import_zod.z.string().min(1)
  })
});

// src/routes/socket.ts
var router = (0, import_express2.Router)();
router.post(
  "/channel",
  validationMiddleware_default(createChannelMessageSchema),
  (req, res) => {
    createChannelMessage(io, req, res);
  }
);
router.post(
  "/direct",
  validationMiddleware_default(createDirectMessageSchema),
  (req, res) => {
    createDirectMessage(io, req, res);
  }
);
router.patch(
  "/:messageId",
  validationMiddleware_default(updateMessageSchema),
  (req, res) => {
    updateMessage(io, req, res);
  }
);
router.delete(
  "/:messageId",
  validationMiddleware_default(deleteMessageSchema),
  (req, res) => {
    deleteMessage(io, req, res);
  }
);
router.get("/conversation", getConversation);
router.get("/", (req, res) => {
  getMessages(io, req, res);
});
var socket_default = router;

// src/routes/conversations.ts
var import_express3 = require("express");

// src/controllers/conversation.ts
var getConversations = async (req, res) => {
  try {
    const { serverId } = req.query;
    const userId = res.locals.userId;
    if (!serverId) {
      return res.status(400).json({ error: "Server ID missing" });
    }
    const currentMember = await prisma.member.findFirst({
      where: {
        serverId,
        profile: {
          userId
        }
      }
    });
    if (!currentMember) {
      return res.status(404).json({ error: "Member not found" });
    }
    const conversations = await prisma.conversation.findMany({
      where: {
        OR: [
          { memberOneId: currentMember.id },
          { memberTwoId: currentMember.id }
        ]
      },
      include: {
        memberOne: {
          include: {
            profile: true
          }
        },
        memberTwo: {
          include: {
            profile: true
          }
        },
        directMessages: {
          take: 1,
          orderBy: {
            createdAt: "desc"
          }
        }
      }
    });
    const activeConversations = conversations.filter((conv) => conv.directMessages.length > 0).sort((a, b) => {
      const aTime = a.directMessages[0]?.createdAt.getTime() || 0;
      const bTime = b.directMessages[0]?.createdAt.getTime() || 0;
      return bTime - aTime;
    });
    return res.status(200).json({
      conversations: activeConversations,
      currentMemberId: currentMember.id
    });
  } catch (error) {
    console.error("[GET_CONVERSATIONS]", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// src/routes/conversations.ts
var router2 = (0, import_express3.Router)();
router2.get("/", getConversations);
var conversations_default = router2;

// src/config/routes.ts
function setupRoutes(app2) {
  app2.get("/api/auth/session", async (req, res) => {
    const internalSecret = req.headers["x-internal-secret"];
    if (internalSecret !== process.env.SERVER_INTERNAL_SECRET) {
      logger_default.warn(`[Auth] Forbidden introspection attempt from ${req.ip}`);
      return res.status(403).json({ error: "Forbidden - Invalid internal secret" });
    }
    const session = await auth.api.getSession({
      headers: req.headers
    });
    res.json({ data: session });
  });
  app2.all("/api/auth/*", (0, import_node3.toNodeHandler)(auth));
  app2.get("/health", (req, res) => {
    res.json({
      status: "ok",
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      uptime: process.uptime()
    });
  });
  app2.use(authMiddleware);
  app2.use("/api/messages", socket_default);
  app2.use("/api/conversations", conversations_default);
  app2.use(errorHandler);
}

// src/config/shutdown.ts
function setupGracefulShutdown(httpServer2) {
  const shutdown = async (signal) => {
    logger_default.info(`
[${signal}] Shutting down gracefully...`);
    if (httpServer2) {
      httpServer2.close(async () => {
        logger_default.info("Http server closed.");
        try {
          await prisma.$disconnect();
          logger_default.info("Database connection closed.");
          process.exit(0);
        } catch (err) {
          logger_default.error("Error during database disconnection:", err);
          process.exit(1);
        }
      });
    } else {
      try {
        await prisma.$disconnect();
        process.exit(0);
      } catch (err) {
        process.exit(1);
      }
    }
    setTimeout(() => {
      logger_default.warn(
        "Could not close connections in time, forcefully shutting down."
      );
      process.exit(1);
    }, 1e4);
  };
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

// src/server.ts
import_dotenv.default.config();
var port = process.env.PORT || 7272;
var app = createApp();
setupRoutes(app);
var server = import_http.default.createServer(app);
initializeSocket(server, allowedOrigins);
var httpServer;
if (process.env.NODE_ENV !== "test") {
  httpServer = server.listen(Number(port), "0.0.0.0", () => {
    logger_default.info(`\u26A1 Server is ready on port:${port} \u{1F525}`);
    logger_default.info(`Allowed origins: ${allowedOrigins}`);
  });
}
setupGracefulShutdown(httpServer);
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  app
});
//# sourceMappingURL=server.js.map