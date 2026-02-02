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
var import_register = require("module-alias/register");
var import_dotenv = __toESM(require("dotenv"));
var import_http = __toESM(require("http"));

// src/core/logger.ts
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

// src/config/routes.ts
var import_node2 = require("better-auth/node");

// src/core/auth.ts
var import_better_auth = require("better-auth");
var import_prisma = require("better-auth/adapters/prisma");
var import_plugins = require("better-auth/plugins");
var import_passkey = require("@better-auth/passkey");

// src/core/db.ts
var import_client = require("@prisma/client");
var prismaClientSingleton = () => {
  return new import_client.PrismaClient();
};
var globalForPrisma = globalThis;
var prisma = globalForPrisma.prisma ?? prismaClientSingleton();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// src/utils/permissions.ts
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

// src/email/nodemailer.ts
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

// src/email/email.ts
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

// src/core/auth.ts
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

// src/utils/api-response.ts
var ApiResponse = class {
  /**
   * Send a success response
   */
  static success(res, data, message = "Success", status = 200) {
    return res.status(status).json({
      success: true,
      message,
      data
    });
  }
  /**
   * Send an error response
   */
  static error(res, error, status = 500, stack) {
    return res.status(status).json({
      success: false,
      error,
      ...process.env.NODE_ENV !== "production" && stack ? { stack } : {}
    });
  }
};

// src/utils/errors.ts
var AppError = class extends Error {
  statusCode;
  isOperational;
  constructor(message, statusCode = 500, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
};
var BadRequestError = class extends AppError {
  constructor(message = "Bad Request") {
    super(message, 400);
  }
};
var UnauthorizedError = class extends AppError {
  constructor(message = "Unauthorized") {
    super(message, 401);
  }
};
var NotFoundError = class extends AppError {
  constructor(message = "Resource not found") {
    super(message, 404);
  }
};

// src/middlewares/errorHandler.ts
var errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || "Something went wrong";
  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
  }
  if (statusCode >= 500) {
    console.error(
      `[Error] ${req.method} ${req.url} - Status: ${statusCode}`,
      err
    );
  }
  ApiResponse.error(res, message, statusCode, err.stack);
};

// src/routes/messages.ts
var import_express = require("express");

// src/services/member.ts
var MemberService = class {
  /**
   * Resolves a member context from either serverId or conversationId
   */
  static async resolveMember(userId, options) {
    const { serverId, conversationId } = options;
    if (serverId) {
      return await prisma.member.findFirst({
        where: {
          profile: { userId },
          serverId
        }
      });
    }
    if (conversationId) {
      const conversation = await prisma.conversation.findUnique({
        where: { id: conversationId },
        include: {
          memberOne: true,
          memberTwo: true
        }
      });
      if (!conversation) return null;
      return await prisma.member.findFirst({
        where: {
          profile: { userId },
          OR: [
            { id: conversation.memberOneId },
            { id: conversation.memberTwoId }
          ]
        }
      });
    }
    return null;
  }
};

// src/core/events.ts
var import_events = require("events");
var events = new import_events.EventEmitter();
var MESSAGE_EVENTS = {
  CREATED: "message:created",
  UPDATED: "message:updated",
  DELETED: "message:deleted"
};
var REACTION_EVENTS = {
  ADDED: "reaction:added",
  REMOVED: "reaction:removed"
};

// src/services/message.ts
var MessageService = class {
  /**
   * Create a channel message
   */
  static async createChannelMessage(payload) {
    const {
      content,
      fileUrl,
      isEncrypted,
      parentId,
      serverId,
      channelId,
      userId
    } = payload;
    const member = await MemberService.resolveMember(userId, { serverId });
    if (!member) {
      throw new NotFoundError("Member not found in this server");
    }
    const message = await prisma.message.create({
      data: {
        content,
        fileUrl: fileUrl || null,
        channelId,
        memberId: member.id,
        isEncrypted: !!isEncrypted,
        parentId: parentId || null
      },
      include: {
        member: {
          include: {
            profile: true
          }
        }
      }
    });
    events.emit(MESSAGE_EVENTS.CREATED, {
      message,
      type: "channel",
      contextId: channelId
    });
    return message;
  }
  /**
   * Create a direct message
   */
  static async createDirectMessage(payload) {
    const { content, fileUrl, isEncrypted, parentId, conversationId, userId } = payload;
    const member = await MemberService.resolveMember(userId, {
      conversationId
    });
    if (!member) {
      throw new NotFoundError("Member not found in conversation");
    }
    const message = await prisma.directMessage.create({
      data: {
        content,
        fileUrl: fileUrl || null,
        conversationId,
        memberId: member.id,
        isEncrypted: !!isEncrypted,
        parentId: parentId || null
      },
      include: {
        member: {
          include: {
            profile: true
          }
        }
      }
    });
    events.emit(MESSAGE_EVENTS.CREATED, {
      message,
      type: "direct",
      contextId: conversationId
    });
    return message;
  }
  /**
   * Update a message (Polymorphic)
   */
  static async updateMessage(payload) {
    const { messageId, content, userId, serverId, conversationId } = payload;
    const member = await MemberService.resolveMember(userId, {
      serverId,
      conversationId
    });
    if (!member) throw new UnauthorizedError("Member not found");
    if (serverId) {
      const message = await prisma.message.findFirst({
        where: { id: messageId, memberId: member.id, deleted: false }
      });
      if (!message)
        throw new NotFoundError("Message not found or unauthorized");
      const updated = await prisma.message.update({
        where: { id: messageId },
        data: { content },
        include: { member: { include: { profile: true } } }
      });
      events.emit(MESSAGE_EVENTS.UPDATED, {
        message: updated,
        type: "channel",
        contextId: message.channelId
      });
      return updated;
    } else if (conversationId) {
      const message = await prisma.directMessage.findFirst({
        where: { id: messageId, memberId: member.id, deleted: false }
      });
      if (!message)
        throw new NotFoundError("Message not found or unauthorized");
      const updated = await prisma.directMessage.update({
        where: { id: messageId },
        data: { content },
        include: { member: { include: { profile: true } } }
      });
      events.emit(MESSAGE_EVENTS.UPDATED, {
        message: updated,
        type: "direct",
        contextId: conversationId
      });
      return updated;
    }
    throw new BadRequestError(
      "Context missing (serverId or conversationId required)"
    );
  }
  /**
   * Delete a message (Polymorphic)
   */
  static async deleteMessage(payload) {
    const { messageId, userId, serverId, conversationId } = payload;
    const member = await MemberService.resolveMember(userId, {
      serverId,
      conversationId
    });
    if (!member) throw new UnauthorizedError("Member not found");
    if (serverId) {
      const message = await prisma.message.findFirst({
        where: { id: messageId },
        include: { member: true }
      });
      if (!message || message.deleted)
        throw new NotFoundError("Message not found");
      const canDelete = message.memberId === member.id || ["ADMIN", "MODERATOR"].includes(member.role);
      if (!canDelete)
        throw new UnauthorizedError("Unauthorized to delete this message");
      const deleted = await prisma.message.update({
        where: { id: messageId },
        data: {
          fileUrl: null,
          content: "This message has been deleted.",
          deleted: true
        },
        include: { member: { include: { profile: true } } }
      });
      events.emit(MESSAGE_EVENTS.UPDATED, {
        message: deleted,
        type: "channel",
        contextId: message.channelId
      });
      return deleted;
    } else if (conversationId) {
      const message = await prisma.directMessage.findFirst({
        where: { id: messageId, conversationId }
      });
      if (!message || message.deleted)
        throw new NotFoundError("Message not found");
      if (message.memberId !== member.id)
        throw new UnauthorizedError("Unauthorized to delete this message");
      const deleted = await prisma.directMessage.update({
        where: { id: messageId },
        data: {
          fileUrl: null,
          content: "This message has been deleted.",
          deleted: true
        },
        include: { member: { include: { profile: true } } }
      });
      events.emit(MESSAGE_EVENTS.UPDATED, {
        message: deleted,
        type: "direct",
        contextId: conversationId
      });
      return deleted;
    }
    throw new BadRequestError(
      "Context missing (serverId or conversationId required)"
    );
  }
};

// src/services/conversation.ts
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

// src/controllers/message.ts
var createChannelMessage = async (req, res) => {
  try {
    const { content, fileUrl, isEncrypted, parentId } = req.body;
    const { serverId, channelId } = req.query;
    const userId = res.locals.userId;
    if (!serverId || !channelId) {
      return ApiResponse.error(res, "Server ID or Channel ID missing", 400);
    }
    const message = await MessageService.createChannelMessage({
      content,
      fileUrl,
      isEncrypted,
      parentId,
      serverId,
      channelId,
      userId
    });
    return ApiResponse.success(res, message, "Message created", 201);
  } catch (error) {
    logger_default.error("[CREATE_CHANNEL_MESSAGE]", error);
    const status = error.message === "Member not found in this server" ? 404 : 500;
    return ApiResponse.error(
      res,
      error.message || "Internal server error",
      status
    );
  }
};
var createDirectMessage = async (req, res) => {
  try {
    const { content, fileUrl, isEncrypted, parentId } = req.body;
    const { conversationId } = req.query;
    const userId = res.locals.userId;
    if (!conversationId) {
      return ApiResponse.error(res, "Conversation ID missing", 400);
    }
    const message = await MessageService.createDirectMessage({
      content,
      fileUrl,
      isEncrypted,
      parentId,
      conversationId,
      userId
    });
    return ApiResponse.success(res, message, "Direct message created", 201);
  } catch (error) {
    logger_default.error("[CREATE_DIRECT_MESSAGE]", error);
    const status = error.message === "Member not found in conversation" ? 404 : 500;
    return ApiResponse.error(
      res,
      error.message || "Internal server error",
      status
    );
  }
};
var updateMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { content } = req.body;
    const { serverId, conversationId } = req.query;
    const userId = res.locals.userId;
    if (!content) {
      return ApiResponse.error(res, "Content missing", 400);
    }
    const updatedMessage = await MessageService.updateMessage({
      messageId,
      content,
      userId,
      serverId,
      conversationId
    });
    return ApiResponse.success(res, updatedMessage, "Message updated");
  } catch (error) {
    logger_default.error("[UPDATE_MESSAGE]", error);
    return ApiResponse.error(res, error.message || "Internal server error");
  }
};
var deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { serverId, conversationId } = req.query;
    const userId = res.locals.userId;
    const deletedMessage = await MessageService.deleteMessage({
      messageId,
      userId,
      serverId,
      conversationId
    });
    return ApiResponse.success(res, deletedMessage, "Message deleted");
  } catch (error) {
    logger_default.error("[DELETE_MESSAGE]", error);
    return ApiResponse.error(res, error.message || "Internal server error");
  }
};
var getConversation = async (req, res) => {
  const { receiverId } = req.query;
  try {
    const conversation = await findOrCreateConversation(
      res.locals.userId,
      receiverId
    );
    return ApiResponse.success(res, conversation);
  } catch (err) {
    logger_default.error(err);
    return ApiResponse.error(res, err.message);
  }
};
var getMessages = async (req, res) => {
  const { receiverId, channelId, cursor } = req.query;
  const MESSAGES_BATCH = 10;
  try {
    let messages = [];
    if (channelId) {
      messages = await prisma.message.findMany({
        take: MESSAGES_BATCH,
        ...cursor && { skip: 1, cursor: { id: cursor } },
        where: { channelId },
        include: { member: { include: { profile: true } } },
        orderBy: { createdAt: "desc" }
      });
    } else if (receiverId) {
      const conversation = await findOrCreateConversation(
        res.locals.userId,
        receiverId
      );
      if (!conversation) {
        return ApiResponse.error(res, "Conversation not found", 404);
      }
      messages = await prisma.directMessage.findMany({
        take: MESSAGES_BATCH,
        ...cursor && { skip: 1, cursor: { id: cursor } },
        where: { conversationId: conversation.id },
        include: { member: { include: { profile: true } } },
        orderBy: { createdAt: "desc" }
      });
    } else {
      return ApiResponse.error(res, "receiverId or channelId required", 400);
    }
    let nextCursor = null;
    if (messages.length === MESSAGES_BATCH) {
      nextCursor = messages[MESSAGES_BATCH - 1].id;
    }
    return ApiResponse.success(res, {
      items: messages,
      nextCursor
    });
  } catch (error) {
    logger_default.error("[GET_MESSAGES]", error);
    return ApiResponse.error(res, "Internal server error");
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

// src/routes/messages.ts
var router = (0, import_express.Router)();
router.post(
  "/channel",
  validationMiddleware_default(createChannelMessageSchema),
  createChannelMessage
);
router.post(
  "/direct",
  validationMiddleware_default(createDirectMessageSchema),
  createDirectMessage
);
router.patch("/:messageId", validationMiddleware_default(updateMessageSchema), updateMessage);
router.delete("/:messageId", validationMiddleware_default(deleteMessageSchema), deleteMessage);
router.get("/conversation", getConversation);
router.get("/", getMessages);
var messages_default = router;

// src/routes/conversations.ts
var import_express2 = require("express");

// src/controllers/conversation.ts
var getConversations = async (req, res) => {
  try {
    const { serverId } = req.query;
    const userId = res.locals.userId;
    const profile = await prisma.profile.findFirst({
      where: {
        userId
      },
      include: {
        members: true
      }
    });
    if (!profile) {
      return ApiResponse.error(res, "Profile not found", 404);
    }
    let memberIds = [];
    if (serverId) {
      const currentMember = profile.members.find(
        (m) => m.serverId === serverId
      );
      if (!currentMember) {
        return ApiResponse.error(res, "Member not found in this server", 404);
      }
      memberIds = [currentMember.id];
    } else {
      memberIds = profile.members.map((m) => m.id);
    }
    if (memberIds.length === 0) {
      return ApiResponse.success(res, {
        conversations: [],
        currentMemberId: null
      });
    }
    const conversations = await prisma.conversation.findMany({
      where: {
        OR: [
          { memberOneId: { in: memberIds } },
          { memberTwoId: { in: memberIds } }
        ]
      },
      include: {
        memberOne: {
          include: {
            profile: true,
            server: true
            // Include server info so user knows which server the DM is from
          }
        },
        memberTwo: {
          include: {
            profile: true,
            server: true
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
    return ApiResponse.success(res, {
      conversations: activeConversations,
      currentMemberIds: memberIds
    });
  } catch (error) {
    console.error("[GET_CONVERSATIONS]", error);
    return ApiResponse.error(res, "Internal server error");
  }
};

// src/routes/conversations.ts
var router2 = (0, import_express2.Router)();
router2.get("/", getConversations);
var conversations_default = router2;

// src/routes/link-preview.ts
var import_express3 = require("express");

// src/controllers/link-preview.ts
var import_axios = __toESM(require("axios"));
var getLinkPreview = async (req, res) => {
  try {
    const { url } = req.query;
    if (!url || typeof url !== "string") {
      return ApiResponse.error(res, "URL is required", 400);
    }
    const apiKey = process.env.OPENGRAPH_IO_KEY;
    if (!apiKey) {
      logger_default.error(
        "[LinkPreview] OPENGRAPH_IO_KEY is missing in environment variables."
      );
      return ApiResponse.error(
        res,
        "Link preview service is not configured.",
        500
      );
    }
    logger_default.info(`[LinkPreview] Fetching from OpenGraph.io for: ${url}`);
    const opengraphUrl = `https://opengraph.io/api/1.1/site/${encodeURIComponent(url)}?app_id=${apiKey}`;
    const response = await import_axios.default.get(opengraphUrl, { timeout: 1e4 });
    const data = response.data;
    if (data.error) {
      logger_default.error(`[OpenGraph.io] Error: ${data.error.message}`);
      return ApiResponse.error(res, data.error.message, 400);
    }
    const hybrid = data.hybridGraph || {};
    const openGraph = data.openGraph || {};
    const htmlInferred = data.htmlInferred || {};
    let fallbackTitle = url;
    try {
      fallbackTitle = new URL(url).hostname;
    } catch (e) {
    }
    return ApiResponse.success(
      res,
      {
        title: hybrid.title || openGraph.title || htmlInferred.title || fallbackTitle,
        description: hybrid.description || openGraph.description || htmlInferred.description || "",
        image: hybrid.image || openGraph.image || htmlInferred.image || null,
        favIcon: data.favicon || null,
        url: data.url || url
      },
      "Link preview fetched"
    );
  } catch (error) {
    if (import_axios.default.isAxiosError(error) && error.response) {
      logger_default.error(
        `[LinkPreview] OpenGraph.io returned ${error.response.status}: ${JSON.stringify(error.response.data)}`
      );
      return ApiResponse.error(
        res,
        error.response.data.error?.message || "External service error",
        error.response.status
      );
    }
    logger_default.error(`[LinkPreview] Unexpected Error: ${error.message}`);
    return ApiResponse.error(res, "Failed to fetch link preview");
  }
};

// src/routes/link-preview.ts
var router3 = (0, import_express3.Router)();
router3.get("/", getLinkPreview);
var link_preview_default = router3;

// src/routes/threads.ts
var import_express4 = require("express");

// src/controllers/thread.ts
var getChannelThreadMetadata = async (req, res) => {
  try {
    const { messageId } = req.params;
    if (!messageId) {
      return ApiResponse.error(res, "Message ID missing", 400);
    }
    const replies = await prisma.message.findMany({
      where: {
        parentId: messageId,
        deleted: false
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
    const participantsMap = /* @__PURE__ */ new Map();
    replies.forEach((reply) => {
      if (!participantsMap.has(reply.member.profile.id)) {
        participantsMap.set(reply.member.profile.id, {
          id: reply.member.profile.id,
          name: reply.member.profile.name,
          imageUrl: reply.member.profile.imageUrl
        });
      }
    });
    const participants = Array.from(participantsMap.values());
    const lastReplyAt = replies.length > 0 ? replies[0].createdAt : null;
    return ApiResponse.success(res, {
      replyCount: replies.length,
      participants,
      lastReplyAt
    });
  } catch (error) {
    console.error("[GET_CHANNEL_THREAD_METADATA]", error);
    return ApiResponse.error(res, "Internal server error");
  }
};
var getDirectThreadMetadata = async (req, res) => {
  try {
    const { messageId } = req.params;
    if (!messageId) {
      return ApiResponse.error(res, "Message ID missing", 400);
    }
    const replies = await prisma.directMessage.findMany({
      where: {
        parentId: messageId,
        deleted: false
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
    const participantsMap = /* @__PURE__ */ new Map();
    replies.forEach((reply) => {
      if (!participantsMap.has(reply.member.profile.id)) {
        participantsMap.set(reply.member.profile.id, {
          id: reply.member.profile.id,
          name: reply.member.profile.name,
          imageUrl: reply.member.profile.imageUrl
        });
      }
    });
    const participants = Array.from(participantsMap.values());
    const lastReplyAt = replies.length > 0 ? replies[0].createdAt : null;
    return ApiResponse.success(res, {
      replyCount: replies.length,
      participants,
      lastReplyAt
    });
  } catch (error) {
    console.error("[GET_DIRECT_THREAD_METADATA]", error);
    return ApiResponse.error(res, "Internal server error");
  }
};

// src/routes/threads.ts
var router4 = (0, import_express4.Router)();
router4.get("/channel/:messageId", getChannelThreadMetadata);
router4.get("/direct/:messageId", getDirectThreadMetadata);
var threads_default = router4;

// src/routes/notifications.ts
var import_express5 = require("express");

// src/services/profile.ts
var getProfileByUserId = async (userId) => {
  return await prisma.profile.findUnique({
    where: { userId }
  });
};

// src/controllers/notification.ts
var getNotifications = async (req, res) => {
  try {
    const userId = res.locals.userId;
    if (!userId) return ApiResponse.error(res, "Unauthorized", 401);
    if (!prisma.notification) {
      logger_default.error(
        "[ERROR] prisma.notification is UNDEFINED. Current models:",
        Object.keys(prisma)
      );
      return ApiResponse.error(
        res,
        "Database model 'notification' not found in Prisma client",
        500
      );
    }
    const profile = await getProfileByUserId(userId);
    if (!profile) return ApiResponse.error(res, "Profile not found", 404);
    const notifications = await prisma.notification.findMany({
      where: { receiverId: profile.id },
      include: {
        sender: {
          select: { id: true, name: true, imageUrl: true }
        }
      },
      orderBy: { createdAt: "desc" },
      take: 50
    });
    return ApiResponse.success(res, notifications);
  } catch (error) {
    console.error("[GET_NOTIFICATIONS]", error);
    return ApiResponse.error(res, "Internal server error");
  }
};
var getUnreadCount = async (req, res) => {
  try {
    const userId = res.locals.userId;
    if (!userId) return ApiResponse.error(res, "Unauthorized", 401);
    const profile = await getProfileByUserId(userId);
    if (!profile) return ApiResponse.error(res, "Profile not found", 404);
    const count = await prisma.notification.count({
      where: {
        receiverId: profile.id,
        isRead: false
      }
    });
    return ApiResponse.success(res, { count });
  } catch (error) {
    console.error("[GET_UNREAD_COUNT]", error);
    return ApiResponse.error(res, "Internal server error");
  }
};
var markAsRead = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const userId = res.locals.userId;
    if (!userId) return ApiResponse.error(res, "Unauthorized", 401);
    const profile = await getProfileByUserId(userId);
    if (!profile) return ApiResponse.error(res, "Profile not found", 404);
    const notification = await prisma.notification.update({
      where: {
        id: notificationId,
        receiverId: profile.id
      },
      data: { isRead: true }
    });
    const io2 = req.app.get("io");
    io2.to(`user:${userId}`).emit("notification:read", notification);
    return ApiResponse.success(
      res,
      notification,
      "Notification marked as read"
    );
  } catch (error) {
    console.error("[MARK_AS_READ]", error);
    return ApiResponse.error(res, "Internal server error");
  }
};
var markAllAsRead = async (req, res) => {
  try {
    const userId = res.locals.userId;
    if (!userId) return ApiResponse.error(res, "Unauthorized", 401);
    const profile = await getProfileByUserId(userId);
    if (!profile) return ApiResponse.error(res, "Profile not found", 404);
    await prisma.notification.updateMany({
      where: {
        receiverId: profile.id,
        isRead: false
      },
      data: { isRead: true }
    });
    const io2 = req.app.get("io");
    io2.to(`user:${userId}`).emit("notification:all-read");
    return ApiResponse.success(
      res,
      { success: true },
      "All notifications marked as read"
    );
  } catch (error) {
    console.error("[MARK_ALL_AS_READ]", error);
    return ApiResponse.error(res, "Internal server error");
  }
};
var deleteNotification = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const userId = res.locals.userId;
    if (!userId) return ApiResponse.error(res, "Unauthorized", 401);
    const profile = await getProfileByUserId(userId);
    if (!profile) return ApiResponse.error(res, "Profile not found", 404);
    await prisma.notification.delete({
      where: {
        id: notificationId,
        receiverId: profile.id
      }
    });
    const io2 = req.app.get("io");
    io2.to(`user:${userId}`).emit("notification:deleted", {
      id: notificationId
    });
    return ApiResponse.success(res, { success: true }, "Notification deleted");
  } catch (error) {
    console.error("[DELETE_NOTIFICATION]", error);
    return ApiResponse.error(res, "Internal server error");
  }
};
var deleteAllNotifications = async (req, res) => {
  try {
    const userId = res.locals.userId;
    if (!userId) return ApiResponse.error(res, "Unauthorized", 401);
    const profile = await getProfileByUserId(userId);
    if (!profile) return ApiResponse.error(res, "Profile not found", 404);
    await prisma.notification.deleteMany({
      where: { receiverId: profile.id }
    });
    const io2 = req.app.get("io");
    io2.to(`user:${userId}`).emit("notification:all-deleted");
    return ApiResponse.success(
      res,
      { success: true },
      "All notifications deleted"
    );
  } catch (error) {
    console.error("[DELETE_ALL_NOTIFICATIONS]", error);
    return ApiResponse.error(res, "Internal server error");
  }
};

// src/routes/notifications.ts
var router5 = (0, import_express5.Router)();
router5.use(authMiddleware);
router5.get("/", getNotifications);
router5.get("/unread-count", getUnreadCount);
router5.patch("/:notificationId/read", markAsRead);
router5.patch("/mark-all-read", markAllAsRead);
router5.delete("/:notificationId", deleteNotification);
router5.delete("/delete-all", deleteAllNotifications);
var notifications_default = router5;

// src/routes/reactions.ts
var import_express6 = require("express");

// src/services/reaction.ts
var ReactionService = class {
  /**
   * Add a reaction to a message
   */
  static async addReaction(payload) {
    const { userId, emoji, messageId, directMessageId } = payload;
    const profile = await getProfileByUserId(userId);
    if (!profile) throw new NotFoundError("Profile not found");
    let authorProfileId = null;
    let authorUserId = null;
    if (messageId) {
      const message = await prisma.message.findUnique({
        where: { id: messageId },
        include: { member: { include: { profile: true } } }
      });
      authorProfileId = message?.member.profile.id || null;
      authorUserId = message?.member.profile.userId || null;
    } else if (directMessageId) {
      const directMessage = await prisma.directMessage.findUnique({
        where: { id: directMessageId },
        include: { member: { include: { profile: true } } }
      });
      authorProfileId = directMessage?.member.profile.id || null;
      authorUserId = directMessage?.member.profile.userId || null;
    }
    const existingReaction = await prisma.reaction.findFirst({
      where: {
        profileId: profile.id,
        messageId,
        directMessageId
      }
    });
    if (existingReaction) {
      if (existingReaction.emoji === emoji) {
        await prisma.reaction.delete({
          where: { id: existingReaction.id }
        });
        events.emit(REACTION_EVENTS.REMOVED, { reaction: existingReaction });
        return null;
      }
      const oldReaction = { ...existingReaction };
      const updatedReaction = await prisma.reaction.update({
        where: { id: existingReaction.id },
        data: { emoji },
        include: {
          profile: {
            select: { id: true, name: true, imageUrl: true }
          }
        }
      });
      events.emit(REACTION_EVENTS.REMOVED, { reaction: oldReaction });
      events.emit(REACTION_EVENTS.ADDED, {
        reaction: updatedReaction,
        authorProfileId,
        authorUserId,
        senderProfileId: profile.id
      });
      return updatedReaction;
    }
    const reaction = await prisma.reaction.create({
      data: {
        emoji,
        profileId: profile.id,
        messageId,
        directMessageId
      },
      include: {
        profile: {
          select: { id: true, name: true, imageUrl: true }
        }
      }
    });
    events.emit(REACTION_EVENTS.ADDED, {
      reaction,
      authorProfileId,
      authorUserId,
      senderProfileId: profile.id
    });
    return reaction;
  }
  /**
   * Remove a reaction
   */
  static async removeReaction(payload) {
    const { userId, reactionId } = payload;
    const profile = await getProfileByUserId(userId);
    if (!profile) throw new NotFoundError("Profile not found");
    const reaction = await prisma.reaction.delete({
      where: {
        id: reactionId,
        profileId: profile.id
      }
    });
    events.emit(REACTION_EVENTS.REMOVED, { reaction });
    return reaction;
  }
};

// src/controllers/reaction.ts
var addReaction = async (req, res) => {
  try {
    const userId = res.locals.userId;
    if (!userId) return ApiResponse.error(res, "Unauthorized", 401);
    const { emoji, messageId, directMessageId } = req.body;
    if (!emoji || !messageId && !directMessageId) {
      return ApiResponse.error(res, "Missing required fields", 400);
    }
    const reaction = await ReactionService.addReaction({
      userId,
      emoji,
      messageId,
      directMessageId
    });
    return ApiResponse.success(res, reaction, "Reaction added");
  } catch (error) {
    logger_default.error("[ADD_REACTION]", error);
    const status = error.message === "Profile not found" ? 404 : 500;
    return ApiResponse.error(
      res,
      error.message || "Internal server error",
      status
    );
  }
};
var removeReaction = async (req, res) => {
  try {
    const { reactionId } = req.params;
    const userId = res.locals.userId;
    if (!userId) return ApiResponse.error(res, "Unauthorized", 401);
    await ReactionService.removeReaction({
      userId,
      reactionId
    });
    return ApiResponse.success(res, { success: true }, "Reaction removed");
  } catch (error) {
    logger_default.error("[REMOVE_REACTION]", error);
    const status = error.message === "Profile not found" ? 404 : 500;
    return ApiResponse.error(
      res,
      error.message || "Internal server error",
      status
    );
  }
};
var getMessageReactions = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { type } = req.query;
    const reactions = await prisma.reaction.findMany({
      where: type === "direct" ? { directMessageId: messageId } : { messageId },
      include: {
        profile: {
          select: { id: true, name: true, imageUrl: true }
        }
      },
      orderBy: { createdAt: "asc" }
    });
    const groupedReactions = reactions.reduce(
      (acc, reaction) => {
        if (!acc[reaction.emoji]) {
          acc[reaction.emoji] = [];
        }
        acc[reaction.emoji].push(reaction);
        return acc;
      },
      {}
    );
    return ApiResponse.success(res, groupedReactions);
  } catch (error) {
    logger_default.error("[GET_MESSAGE_REACTIONS]", error);
    return ApiResponse.error(res, "Internal server error");
  }
};

// src/routes/reactions.ts
var router6 = (0, import_express6.Router)();
router6.get("/message/:messageId", getMessageReactions);
router6.use(authMiddleware);
router6.post("/", addReaction);
router6.delete("/:reactionId", removeReaction);
router6.get("/message/:messageId", getMessageReactions);
var reactions_default = router6;

// src/routes/members.ts
var import_express7 = require("express");

// src/controllers/member.ts
var getServerMembers = async (req, res) => {
  try {
    const { serverId } = req.params;
    const userId = res.locals.userId;
    if (!serverId) {
      return ApiResponse.error(res, "Server ID missing", 400);
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
      return ApiResponse.error(res, "Forbidden", 403);
    }
    const members = await prisma.member.findMany({
      where: {
        serverId
      },
      include: {
        profile: true
      },
      orderBy: {
        role: "asc"
      }
    });
    return ApiResponse.success(res, members);
  } catch (error) {
    console.error("[GET_SERVER_MEMBERS]", error);
    return ApiResponse.error(res, "Internal server error");
  }
};

// src/routes/members.ts
var router7 = (0, import_express7.Router)();
router7.get("/server/:serverId", getServerMembers);
var members_default = router7;

// src/routes/channels.ts
var import_express8 = require("express");

// src/controllers/channel.ts
var getServerChannels = async (req, res) => {
  try {
    const { serverId } = req.params;
    const userId = res.locals.userId;
    if (!serverId) {
      return ApiResponse.error(res, "Server ID missing", 400);
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
      return ApiResponse.error(res, "Forbidden", 403);
    }
    const channels = await prisma.channel.findMany({
      where: {
        serverId
      },
      orderBy: {
        createdAt: "asc"
      }
    });
    return ApiResponse.success(res, channels);
  } catch (error) {
    console.error("[GET_SERVER_CHANNELS]", error);
    return ApiResponse.error(res, "Internal server error");
  }
};

// src/routes/channels.ts
var router8 = (0, import_express8.Router)();
router8.get("/server/:serverId", getServerChannels);
var channels_default = router8;

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
  app2.all("/api/auth/*", (0, import_node2.toNodeHandler)(auth));
  app2.get("/health", (req, res) => {
    res.json({
      status: "ok",
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      uptime: process.uptime()
    });
  });
  app2.use(authMiddleware);
  app2.use("/api/messages", messages_default);
  app2.use("/api/conversations", conversations_default);
  app2.use("/api/link-preview", link_preview_default);
  app2.use("/api/threads", threads_default);
  app2.use("/api/notifications", notifications_default);
  app2.use("/api/reactions", reactions_default);
  app2.use("/api/members", members_default);
  app2.use("/api/channels", channels_default);
  app2.use(errorHandler);
}

// src/services/socket.ts
var SocketService = class {
  io = null;
  /**
   * Initialize the service with the Socket.IO instance
   */
  initialize(io2) {
    this.io = io2;
    logger_default.info("[SocketService] Initialized");
  }
  /**
   * Emit a message to a specific room or channel
   */
  emit(event, data, room) {
    if (!this.io) {
      logger_default.error("[SocketService] Called before initialization");
      return;
    }
    if (room) {
      this.io.to(room).emit(event, data);
    } else {
      this.io.emit(event, data);
    }
  }
  /**
   * Emit a chat message to a channel or conversation
   */
  emitChatMessage(contextId, event, data) {
    const eventKey = `chat:${contextId}:${event}`;
    this.emit(eventKey, data);
  }
  /**
   * Emit a notification to a specific user
   */
  emitNotification(userId, data) {
    this.emit("notification:new", data, `user:${userId}`);
  }
};
var socketService = new SocketService();

// src/services/notification.ts
var NotificationService = class {
  /**
   * Create a notification and emit it via socket
   */
  static async createNotification(payload) {
    try {
      const {
        senderId,
        receiverId,
        messageId,
        channelId,
        serverId,
        conversationId,
        emoji,
        ...rest
      } = payload;
      const notification = await prisma.notification.create({
        data: {
          ...rest,
          sender: { connect: { id: senderId } },
          receiver: { connect: { id: receiverId } },
          messageId,
          channelId,
          serverId,
          conversationId,
          emoji
        }
      });
      const receiverProfile = await prisma.profile.findUnique({
        where: { id: receiverId }
      });
      if (receiverProfile) {
        socketService.emitNotification(receiverProfile.userId, notification);
      }
      return notification;
    } catch (error) {
      logger_default.error("[NotificationService] Error creating notification", error);
      throw error;
    }
  }
};

// src/utils/mention-parser.ts
function parseMentions(content) {
  const mentions = [];
  const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g;
  let match;
  while ((match = mentionRegex.exec(content)) !== null) {
    mentions.push({
      username: match[1],
      userId: match[2],
      startIndex: match.index,
      endIndex: match.index + match[0].length
    });
  }
  return mentions;
}
function extractMentionedUserIds(content) {
  const mentions = parseMentions(content);
  const uniqueIds = [...new Set(mentions.map((m) => m.userId))];
  return uniqueIds;
}

// src/events/message.handler.ts
events.on(MESSAGE_EVENTS.CREATED, async ({ message, type, contextId }) => {
  try {
    socketService.emitChatMessage(contextId, "messages", message);
    if (type === "channel") {
      const mentionedUserIds = extractMentionedUserIds(message.content);
      if (mentionedUserIds.length > 0) {
        const mentionedProfiles = await prisma.profile.findMany({
          where: { userId: { in: mentionedUserIds } }
        });
        const channel = await prisma.channel.findUnique({
          where: { id: message.channelId }
        });
        for (const profile of mentionedProfiles) {
          if (profile.id !== message.member.profileId) {
            await NotificationService.createNotification({
              type: "MENTION",
              content: `mentioned you in #${channel?.name || "channel"}`,
              senderId: message.member.profileId,
              receiverId: profile.id,
              messageId: message.id,
              channelId: message.channelId,
              serverId: channel?.serverId
            });
          }
        }
      }
    }
  } catch (error) {
    logger_default.error("[MessageHandler] Error handling message:created", error);
  }
});
events.on(MESSAGE_EVENTS.UPDATED, async ({ message, type, contextId }) => {
  socketService.emitChatMessage(contextId, "messages:update", message);
});
events.on(
  REACTION_EVENTS.ADDED,
  async ({ reaction, authorProfileId, authorUserId, senderProfileId }) => {
    const roomId = reaction.messageId || reaction.directMessageId;
    socketService.emit("reaction:added", reaction, roomId);
    if (authorProfileId && authorProfileId !== senderProfileId && authorUserId) {
      await NotificationService.createNotification({
        type: "REACTION",
        content: `reacted ${reaction.emoji} to your message`,
        senderId: senderProfileId,
        receiverId: authorProfileId,
        messageId: reaction.messageId || void 0
      });
    }
  }
);
events.on(REACTION_EVENTS.REMOVED, async ({ reaction }) => {
  const roomId = reaction.messageId || reaction.directMessageId;
  socketService.emit("reaction:removed", { id: reaction.id }, roomId);
});

// src/libs/socket.ts
var import_socket3 = require("socket.io");
var import_node3 = require("better-auth/node");
var io;
var initializeSocket = (httpServer2, allowedOrigins2, app2) => {
  io = new import_socket3.Server(httpServer2, {
    cors: {
      origin: allowedOrigins2,
      credentials: true,
      methods: ["GET", "POST"]
    },
    transports: ["websocket", "polling"],
    allowEIO3: true
  });
  socketService.initialize(io);
  app2.set("io", io);
  io.use(async (socket, next) => {
    logger_default.info("[Socket.io] New connection attempt");
    const session = await auth.api.getSession({
      headers: (0, import_node3.fromNodeHeaders)(socket.handshake.headers)
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
    prisma.user.update({
      where: { id: socket.user.id },
      data: { isOnline: true }
    }).catch(
      (err) => logger_default.error(
        `[Socket.io] Error updating online status for ${socket.user.id}:`,
        err
      )
    );
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
    socket.on("join-room", (room) => {
      socket.join(room);
      logger_default.info(`[Socket.io] User ${socket.user.id} joined room ${room}`);
    });
    socket.on("leave-room", (room) => {
      socket.leave(room);
      logger_default.info(`[Socket.io] User ${socket.user.id} left room ${room}`);
    });
    socket.on("disconnect", async () => {
      logger_default.info(`[Socket.io] Client disconnected: ${socket.id}`);
      const userId = socket.user.id;
      const matchingSockets = await io.in(userId).fetchSockets();
      const isStillConnected = matchingSockets.length > 0;
      if (!isStillConnected) {
        logger_default.info(
          `[Socket.io] Last connection for user ${userId} closed. Marking offline.`
        );
        try {
          await prisma.user.update({
            where: { id: userId },
            data: {
              isOnline: false,
              lastSeenAt: /* @__PURE__ */ new Date()
            }
          });
          socket.broadcast.emit("user disconnected", userId);
        } catch (err) {
          logger_default.error(
            `[Socket.io] Error updating offline status for ${userId}:`,
            err
          );
        }
      }
    });
  });
};

// src/config/app.ts
var import_express9 = __toESM(require("express"));
var import_cors = __toESM(require("cors"));
var import_cookie_parser = __toESM(require("cookie-parser"));
var import_express_rate_limit = require("express-rate-limit");
var allowedOrigins = process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(",") : ["http://localhost:3000"];
function createApp() {
  const app2 = (0, import_express9.default)();
  app2.set("trust proxy", 1);
  app2.use(import_express9.default.json());
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
    max: 1e3,
    // Increased limit for development/active usage
    standardHeaders: true,
    legacyHeaders: false
  });
  app2.use(limiter);
  return app2;
}

// src/config/shutdown.ts
function serverShutdown(httpServer2) {
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
initializeSocket(server, allowedOrigins, app);
var httpServer;
if (process.env.NODE_ENV !== "test") {
  httpServer = server.listen(Number(port), "0.0.0.0", () => {
    logger_default.info(`\u26A1 Server is ready on port:${port} \u{1F525}`);
    logger_default.info(`Allowed origins: ${allowedOrigins}`);
  });
}
serverShutdown(httpServer);
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  app
});
//# sourceMappingURL=server.js.map