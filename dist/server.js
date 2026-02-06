var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
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
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/shared/core/logger.ts
import winston from "winston";
var logger, logger_default;
var init_logger = __esm({
  "src/shared/core/logger.ts"() {
    logger = winston.createLogger({
      level: "info",
      format: winston.format.json(),
      defaultMeta: { service: "user-service" },
      transports: []
    });
    if (process.env.NODE_ENV !== "production") {
      logger.add(
        new winston.transports.Console({
          format: winston.format.simple()
        })
      );
    } else {
      logger.add(
        new winston.transports.Console({
          format: winston.format.json()
        })
      );
    }
    logger_default = logger;
  }
});

// src/shared/core/db.ts
import { PrismaClient } from "@prisma/client";
var prismaClientSingleton, globalForPrisma, prisma;
var init_db = __esm({
  "src/shared/core/db.ts"() {
    prismaClientSingleton = () => {
      return new PrismaClient();
    };
    globalForPrisma = globalThis;
    prisma = globalForPrisma.prisma ?? prismaClientSingleton();
    if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
  }
});

// src/shared/utils/errors.ts
var AppError, BadRequestError, UnauthorizedError, NotFoundError;
var init_errors = __esm({
  "src/shared/utils/errors.ts"() {
    AppError = class extends Error {
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
    BadRequestError = class extends AppError {
      constructor(message = "Bad Request") {
        super(message, 400);
      }
    };
    UnauthorizedError = class extends AppError {
      constructor(message = "Unauthorized") {
        super(message, 401);
      }
    };
    NotFoundError = class extends AppError {
      constructor(message = "Resource not found") {
        super(message, 404);
      }
    };
  }
});

// src/shared/core/events.ts
import { EventEmitter } from "events";
var events, MESSAGE_EVENTS, REACTION_EVENTS, POLL_EVENTS;
var init_events = __esm({
  "src/shared/core/events.ts"() {
    events = new EventEmitter();
    MESSAGE_EVENTS = {
      CREATED: "message:created",
      UPDATED: "message:updated",
      DELETED: "message:deleted"
    };
    REACTION_EVENTS = {
      ADDED: "reaction:added",
      REMOVED: "reaction:removed"
    };
    POLL_EVENTS = {
      VOTED: "poll:voted"
    };
  }
});

// src/core/servers/services.ts
var MemberService;
var init_services = __esm({
  "src/core/servers/services.ts"() {
    init_db();
    MemberService = class {
      /**
       * Resolve a member from a userId and context
       */
      static async resolveMember(userId, context) {
        const { serverId, conversationId } = context;
        if (serverId) {
          return await prisma.member.findFirst({
            where: {
              serverId,
              profile: { userId }
            },
            include: { profile: true }
          });
        }
        if (conversationId) {
          const conversation = await prisma.conversation.findUnique({
            where: { id: conversationId },
            include: {
              memberOne: { include: { profile: true } },
              memberTwo: { include: { profile: true } }
            }
          });
          if (!conversation) return null;
          if (conversation.memberOne.profile.userId === userId) {
            return conversation.memberOne;
          }
          if (conversation.memberTwo.profile.userId === userId) {
            return conversation.memberTwo;
          }
        }
        return null;
      }
    };
  }
});

// src/core/users/services.ts
var getProfileByUserId;
var init_services2 = __esm({
  "src/core/users/services.ts"() {
    init_db();
    init_logger();
    getProfileByUserId = async (userId) => {
      return await prisma.profile.findFirst({
        where: { userId }
      });
    };
  }
});

// src/core/messaging/services.ts
var services_exports = {};
__export(services_exports, {
  MessageService: () => MessageService,
  ReactionService: () => ReactionService,
  findOrCreateConversation: () => findOrCreateConversation
});
var MessageService, findOrCreateConversation, findConversation, createNewConversation, ReactionService;
var init_services3 = __esm({
  "src/core/messaging/services.ts"() {
    init_db();
    init_events();
    init_errors();
    init_services();
    init_services2();
    MessageService = class {
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
          userId,
          poll
        } = payload;
        const member = await MemberService.resolveMember(userId, { serverId });
        if (!member) {
          throw new NotFoundError("Member not found in this server");
        }
        console.time(
          `[MessageService.createChannelMessage] DB Create with Poll: ${userId}`
        );
        const message = await prisma.message.create({
          data: {
            content,
            fileUrl: fileUrl || null,
            channelId,
            memberId: member.id,
            isEncrypted: !!isEncrypted,
            parentId: parentId || null,
            ...poll && {
              poll: {
                create: {
                  question: poll.question,
                  expiresAt: poll.expiresAt,
                  options: {
                    create: poll.options.map((text) => ({ text }))
                  }
                }
              }
            }
          },
          include: {
            member: {
              include: {
                profile: true
              }
            },
            poll: {
              include: {
                options: {
                  include: {
                    votes: true,
                    _count: {
                      select: { votes: true }
                    }
                  }
                }
              }
            }
          }
        });
        console.timeEnd(
          `[MessageService.createChannelMessage] DB Create with Poll: ${userId}`
        );
        events.emit(MESSAGE_EVENTS.CREATED, {
          message,
          type: "channel",
          contextId: channelId
        });
        return message;
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
        const {
          content,
          fileUrl,
          isEncrypted,
          parentId,
          conversationId,
          userId,
          poll
        } = payload;
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
            parentId: parentId || null,
            ...poll && {
              poll: {
                create: {
                  question: poll.question,
                  expiresAt: poll.expiresAt,
                  options: {
                    create: poll.options.map((text) => ({ text }))
                  }
                }
              }
            }
          },
          include: {
            member: {
              include: {
                profile: true
              }
            },
            poll: {
              include: {
                options: {
                  include: {
                    votes: true,
                    _count: {
                      select: { votes: true }
                    }
                  }
                }
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
    findOrCreateConversation = async (memberOneId, memberTwoId) => {
      let conversation = await findConversation(memberOneId, memberTwoId);
      if (!conversation) {
        conversation = await createNewConversation(memberOneId, memberTwoId);
      }
      return conversation;
    };
    findConversation = async (memberOneId, memberTwoId) => {
      try {
        return await prisma.conversation.findFirst({
          where: {
            OR: [
              { AND: [{ memberOneId }, { memberTwoId }] },
              { AND: [{ memberOneId: memberTwoId }, { memberTwoId: memberOneId }] }
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
            }
          }
        });
      } catch (error) {
        console.error("Error finding conversation:", error);
        return null;
      }
    };
    createNewConversation = async (memberOneId, memberTwoId) => {
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
    ReactionService = class {
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
  }
});

// src/server.ts
init_logger();
import dotenv from "dotenv";
import http from "http";

// src/config/routes.ts
import express from "express";
import { toNodeHandler } from "better-auth/node";

// src/core/auth/config.ts
init_db();
init_logger();
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import {
  admin,
  customSession,
  magicLink,
  twoFactor,
  organization
} from "better-auth/plugins";
import { passkey } from "@better-auth/passkey";
import { stripe } from "@better-auth/stripe";
import { Stripe } from "stripe";

// src/shared/utils/permissions.ts
import { createAccessControl } from "better-auth/plugins/access";
import { defaultStatements, adminAc } from "better-auth/plugins/admin/access";
var statements = {
  ...defaultStatements,
  posts: ["create", "read", "update", "delete", "update:own", "delete:own"]
};
var ac = createAccessControl(statements);
var roles = {
  USER: ac.newRole({
    posts: ["create", "read", "update:own", "delete:own"]
  }),
  ADMIN: ac.newRole({
    posts: ["create", "read", "update", "delete", "update:own", "delete:own"],
    ...adminAc.statements
  })
};

// src/email/nodemailer.ts
import nodemailer from "nodemailer";
var transporter = nodemailer.createTransport({
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

// src/shared/libs/argon2.ts
import { hash, verify } from "@node-rs/argon2";
var opts = {
  memoryCost: 19456,
  timeCost: 2,
  outputLen: 32,
  parallelism: 1
};
async function hashPassword(password) {
  const result = await hash(password, opts);
  return result;
}
async function verifyPassword(data) {
  const { password, hash: hashedPassword } = data;
  const result = await verify(hashedPassword, password, opts);
  return result;
}

// src/core/auth/config.ts
var auth = betterAuth({
  appName: "Aura",
  basePath: "/api/auth",
  trustProxy: true,
  database: prismaAdapter(prisma, {
    provider: "mongodb"
  }),
  debug: true,
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL || "https://node-socket-io-hxb4.onrender.com",
  trustedOrigins: [
    "http://localhost:3000",
    "http://localhost:7272",
    "https://node-socket-io-hxb4.onrender.com",
    "https://aura-seven-lyart.vercel.app",
    process.env.FRONTEND_URL,
    process.env.BETTER_AUTH_URL
  ].filter((origin) => !!origin),
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
    skipStateCookieCheck: true,
    accountLinking: {
      enabled: true,
      trustedProviders: ["google", "github"]
    }
  },
  advanced: {
    database: {
      generateId: false
    },
    defaultCookieAttributes: {
      sameSite: "none",
      secure: true
    },
    useSecureCookies: true
  },
  secondaryStorage: {
    get: async (key) => {
      const value = await prisma.verification.findUnique({
        where: { identifier: key }
      });
      logger_default.info(`[SecondaryStorage] GET key=${key} found=${!!value}`);
      return value?.value || null;
    },
    set: async (key, value, expiresAt) => {
      logger_default.info(`[SecondaryStorage] SET key=${key} expires=${expiresAt}`);
      await prisma.verification.upsert({
        where: { identifier: key },
        create: {
          identifier: key,
          value,
          expiresAt: new Date(expiresAt)
        },
        update: {
          value,
          expiresAt: new Date(expiresAt)
        }
      });
    },
    delete: async (key) => {
      logger_default.info(`[SecondaryStorage] DELETE key=${key}`);
      await prisma.verification.deleteMany({
        where: { identifier: key }
      });
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
    admin({
      defaultRole: "USER",
      adminRoles: ["ADMIN"],
      ac,
      roles
    }),
    magicLink({
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
    twoFactor({
      otpOptions: {}
    }),
    passkey(),
    organization(),
    stripe({
      stripeClient: new Stripe(process.env.STRIPE_KEY || "sk_test_"),
      stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
      subscription: {
        enabled: true,
        plans: [
          {
            name: "Plus",
            priceId: process.env.STRIPE_PLUS_PRICE_ID || "price_1RoxnJHmTADgihIthZTLmrPn"
          },
          {
            name: "Pro",
            priceId: process.env.STRIPE_PRO_PRICE_ID || "price_1RoxnRHmTADgihIt4y8c0lVE"
          }
        ]
      }
    }),
    customSession(async ({ user, session }) => {
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

// src/core/auth/middleware.ts
init_logger();
import { fromNodeHeaders } from "better-auth/node";
var authMiddleware = async (req, res, next) => {
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(req.headers)
  });
  if (session) {
    res.locals.userId = session.user.id;
    res.locals.user = session.user;
    return next();
  }
  const internalSecret = req.headers["x-internal-secret"];
  const bridgedUserId = req.headers["x-user-id"];
  if (internalSecret && internalSecret === process.env.SERVER_INTERNAL_SECRET && bridgedUserId) {
    res.locals.userId = bridgedUserId;
    return next();
  }
  if (process.env.NODE_ENV !== "production" && bridgedUserId) {
    logger_default.warn(
      "[Auth] WARNING: Using insecure fallback userId:",
      bridgedUserId
    );
    res.locals.userId = bridgedUserId;
    return next();
  }
  logger_default.error("[Auth] Authentication FAILED for:", req.url);
  return res.status(401).json({ error: "Unauthorized - No valid session or secure bridge found" });
};

// src/shared/utils/api-response.ts
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

// src/shared/middlewares/errorHandler.ts
init_errors();
init_logger();
var errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || "Something went wrong";
  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
  }
  if (statusCode >= 500) {
    logger_default.error(
      `[Error] ${req.method} ${req.url} - Status: ${statusCode}`,
      err
    );
  }
  ApiResponse.error(res, message, statusCode, err.stack);
};

// src/core/messaging/routes.ts
import { Router } from "express";

// src/core/messaging/controllers.ts
init_db();
init_logger();
init_services3();

// src/core/messaging/pin.service.ts
init_db();
init_services();
init_errors();
var PinService = class {
  /**
   * Pin a message
   */
  static async pinMessage(payload) {
    return this.setPinStatus({ ...payload, isPinned: true });
  }
  /**
   * Unpin a message
   */
  static async unpinMessage(payload) {
    return this.setPinStatus({ ...payload, isPinned: false });
  }
  /**
   * Shared logic for pinning/unpinning (DRY)
   */
  static async setPinStatus(payload) {
    const { messageId, userId, isPinned, serverId, conversationId } = payload;
    const member = await MemberService.resolveMember(userId, {
      serverId,
      conversationId
    });
    if (!member) throw new UnauthorizedError("Member not found");
    if (serverId) {
      if (!["ADMIN", "MODERATOR"].includes(member.role)) {
        throw new UnauthorizedError(
          "Insufficient permissions to manage pinned messages"
        );
      }
      const message = await prisma.message.findFirst({
        where: { id: messageId, channel: { serverId } }
      });
      if (!message) throw new NotFoundError("Message not found in this server");
      return await prisma.message.update({
        where: { id: messageId },
        data: { isPinned },
        include: { member: { include: { profile: true } } }
      });
    } else if (conversationId) {
      const message = await prisma.directMessage.findFirst({
        where: { id: messageId, conversationId }
      });
      if (!message)
        throw new NotFoundError("Message not found in this conversation");
      return await prisma.directMessage.update({
        where: { id: messageId },
        data: { isPinned },
        include: { member: { include: { profile: true } } }
      });
    }
    throw new BadRequestError(
      "Context missing (serverId or conversationId required)"
    );
  }
};

// src/core/messaging/poll.service.ts
init_db();
init_services2();
init_errors();
var PollService = class {
  /**
   * Create a new poll attached to a message
   */
  static async createPoll(payload) {
    const { question, options, expiresAt, messageId, directMessageId } = payload;
    if (!options || options.length < 2) {
      throw new BadRequestError("A poll must have at least 2 options");
    }
    return await prisma.poll.create({
      data: {
        question,
        expiresAt,
        messageId,
        directMessageId,
        options: {
          create: options.map((text) => ({ text }))
        }
      },
      include: {
        options: {
          include: {
            votes: true,
            _count: {
              select: { votes: true }
            }
          }
        }
      }
    });
  }
  /**
   * Cast a vote in a poll
   */
  static async castVote(payload) {
    const { pollId, userId, optionId } = payload;
    const profile = await getProfileByUserId(userId);
    if (!profile) throw new NotFoundError("Profile not found");
    const poll = await prisma.poll.findUnique({
      where: { id: pollId }
    });
    if (!poll) throw new NotFoundError("Poll not found");
    if (poll.expiresAt && poll.expiresAt < /* @__PURE__ */ new Date()) {
      throw new BadRequestError("This poll has expired");
    }
    const existingVote = await prisma.pollVote.findUnique({
      where: {
        profileId_pollId: {
          profileId: profile.id,
          pollId
        }
      }
    });
    if (existingVote) {
      if (existingVote.optionId === optionId) {
        return await prisma.pollVote.delete({
          where: { id: existingVote.id }
        });
      }
      return await prisma.pollVote.update({
        where: { id: existingVote.id },
        data: { optionId }
      });
    }
    return await prisma.pollVote.create({
      data: {
        profileId: profile.id,
        pollId,
        optionId
      }
    });
  }
  /**
   * Get poll results with vote counts
   */
  static async getPollResults(pollId) {
    return await prisma.poll.findUnique({
      where: { id: pollId },
      include: {
        options: {
          include: {
            votes: true,
            _count: {
              select: { votes: true }
            }
          }
        }
      }
    });
  }
};

// src/core/messaging/controllers.ts
init_services3();
init_events();
import axios from "axios";
var createChannelMessage = async (req, res) => {
  try {
    const { content, fileUrl, isEncrypted, parentId, poll } = req.body;
    const { serverId, channelId } = req.query;
    const userId = res.locals.userId;
    if (!serverId || !channelId) {
      return ApiResponse.error(res, "Server ID or Channel ID missing", 400);
    }
    console.time(`[CREATE_CHANNEL_MESSAGE] Total: ${userId}`);
    const message = await MessageService.createChannelMessage({
      content,
      fileUrl,
      isEncrypted,
      parentId,
      serverId,
      channelId,
      userId,
      poll
    });
    console.timeEnd(`[CREATE_CHANNEL_MESSAGE] Total: ${userId}`);
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
    const { content, fileUrl, isEncrypted, parentId, poll } = req.body;
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
      userId,
      poll
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
        include: {
          member: { include: { profile: true } },
          poll: {
            include: {
              options: {
                include: {
                  votes: true,
                  _count: { select: { votes: true } }
                }
              }
            }
          }
        },
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
var getConversations = async (req, res) => {
  try {
    const { serverId } = req.query;
    const userId = res.locals.userId;
    const profile = await prisma.profile.findFirst({
      where: {
        userId
      },
      select: {
        id: true,
        userId: true,
        members: serverId ? {
          where: { serverId },
          select: { id: true, serverId: true }
        } : {
          select: { id: true, serverId: true }
        }
      }
    });
    if (!profile) {
      logger_default.warn(
        `[ConversationController] No profile found for userId=${userId}`
      );
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
    logger_default.error("[GET_CONVERSATIONS]", error);
    return ApiResponse.error(res, "Internal server error");
  }
};
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
    logger_default.error("[GET_CHANNEL_THREAD_METADATA]", error);
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
    logger_default.error("[GET_DIRECT_THREAD_METADATA]", error);
    return ApiResponse.error(res, "Internal server error");
  }
};
var addReaction = async (req, res) => {
  try {
    const userId = res.locals.userId;
    if (!userId) return ApiResponse.error(res, "Unauthorized", 401);
    const { emoji, messageId, directMessageId } = req.body;
    if (!emoji || !messageId && !directMessageId) {
      return ApiResponse.error(res, "Missing required fields", 400);
    }
    const reaction = await ReactionService2.addReaction({
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
    await ReactionService2.removeReaction({
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
var getLinkPreview = async (req, res) => {
  try {
    const { url } = req.query;
    if (!url || typeof url !== "string") {
      return ApiResponse.error(res, "URL is required", 400);
    }
    const apiKey = process.env.OPENGRAPH_IO_KEY;
    if (!apiKey) {
      logger_default.error("[LinkPreview] OPENGRAPH_IO_KEY is missing");
      return ApiResponse.error(
        res,
        "Link preview service is not configured.",
        500
      );
    }
    const opengraphUrl = `https://opengraph.io/api/1.1/site/${encodeURIComponent(url)}?app_id=${apiKey}`;
    const response = await axios.get(opengraphUrl, { timeout: 1e4 });
    const data = response.data;
    if (data.error) {
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
    logger_default.error(`[LinkPreview] Error: ${error.message}`);
    return ApiResponse.error(res, "Failed to fetch link preview");
  }
};
var ReactionService2 = {
  addReaction: async (payload) => {
    const { ReactionService: RealReactionService } = (init_services3(), __toCommonJS(services_exports));
    return await RealReactionService.addReaction(payload);
  },
  removeReaction: async (payload) => {
    const { ReactionService: RealReactionService } = (init_services3(), __toCommonJS(services_exports));
    return await RealReactionService.removeReaction(payload);
  }
};
var pinMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { serverId, conversationId } = req.query;
    const userId = res.locals.userId;
    const message = await PinService.pinMessage({
      messageId,
      userId,
      serverId,
      conversationId
    });
    events.emit(MESSAGE_EVENTS.UPDATED, {
      message,
      type: serverId ? "channel" : "direct",
      contextId: serverId ? message.channelId : message.conversationId
    });
    return ApiResponse.success(res, message, "Message pinned");
  } catch (error) {
    logger_default.error("[PIN_MESSAGE]", error);
    return ApiResponse.error(res, error.message || "Internal server error");
  }
};
var unpinMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { serverId, conversationId } = req.query;
    const userId = res.locals.userId;
    const message = await PinService.unpinMessage({
      messageId,
      userId,
      serverId,
      conversationId
    });
    events.emit(MESSAGE_EVENTS.UPDATED, {
      message,
      type: serverId ? "channel" : "direct",
      contextId: serverId ? message.channelId : message.conversationId
    });
    return ApiResponse.success(res, message, "Message unpinned");
  } catch (error) {
    logger_default.error("[UNPIN_MESSAGE]", error);
    return ApiResponse.error(res, error.message || "Internal server error");
  }
};
var castPollVote = async (req, res) => {
  try {
    const { pollId } = req.params;
    const { optionId } = req.body;
    const userId = res.locals.userId;
    if (!optionId) {
      return ApiResponse.error(res, "Option ID missing", 400);
    }
    await PollService.castVote({
      pollId,
      userId,
      optionId
    });
    const updatedPoll = await PollService.getPollResults(pollId);
    events.emit(POLL_EVENTS.VOTED, { poll: updatedPoll });
    return ApiResponse.success(res, updatedPoll, "Vote cast successfully");
  } catch (error) {
    logger_default.error("[CAST_POLL_VOTE]", error);
    return ApiResponse.error(res, error.message || "Internal server error");
  }
};

// src/shared/middlewares/validationMiddleware.ts
init_logger();
var validator = (schema) => (req, res, next) => {
  try {
    schema.parse({
      body: req.body,
      query: req.query,
      params: req.params
    });
    next();
  } catch (err) {
    logger_default.error("[ValidationMiddleware] Validation error:", err);
    return res.status(400).send(err.errors);
  }
};
var validationMiddleware_default = validator;

// src/shared/schemas/message.schema.ts
import { z } from "zod";
var createChannelMessageSchema = z.object({
  body: z.object({
    content: z.string().min(1).max(5e3),
    fileUrl: z.string().url().optional().nullable(),
    isEncrypted: z.boolean().optional()
  }),
  query: z.object({
    serverId: z.string().min(1),
    channelId: z.string().min(1)
  })
});
var createDirectMessageSchema = z.object({
  body: z.object({
    content: z.string().min(1).max(5e3),
    fileUrl: z.string().url().optional().nullable(),
    isEncrypted: z.boolean().optional()
  }),
  query: z.object({
    conversationId: z.string().min(1)
  })
});
var updateMessageSchema = z.object({
  params: z.object({
    messageId: z.string().min(1)
  }),
  body: z.object({
    content: z.string().min(1).max(5e3)
  }),
  query: z.object({
    serverId: z.string().optional(),
    channelId: z.string().optional(),
    conversationId: z.string().optional()
  })
});
var deleteMessageSchema = z.object({
  params: z.object({
    messageId: z.string().min(1)
  }),
  query: z.object({
    serverId: z.string().optional(),
    channelId: z.string().optional(),
    conversationId: z.string().optional()
  })
});
var conversationSchema = z.object({
  query: z.object({
    receiverId: z.string().min(1)
  })
});
var sendMessageSchema = z.object({
  body: z.object({
    message: z.string().min(1)
  }),
  query: z.object({
    receiverId: z.string().min(1)
  })
});

// src/core/messaging/routes.ts
var router = Router();
var messageRouter = Router();
messageRouter.post(
  "/channel",
  validationMiddleware_default(createChannelMessageSchema),
  createChannelMessage
);
messageRouter.post(
  "/direct",
  validationMiddleware_default(createDirectMessageSchema),
  createDirectMessage
);
messageRouter.patch(
  "/:messageId",
  validationMiddleware_default(updateMessageSchema),
  updateMessage
);
messageRouter.delete(
  "/:messageId",
  validationMiddleware_default(deleteMessageSchema),
  deleteMessage
);
messageRouter.post("/:messageId/pin", pinMessage);
messageRouter.delete("/:messageId/pin", unpinMessage);
messageRouter.get("/conversation", getConversation);
messageRouter.get("/", getMessages);
var conversationRouter = Router();
conversationRouter.get("/", getConversations);
var threadRouter = Router();
threadRouter.get("/channel/:messageId", getChannelThreadMetadata);
threadRouter.get("/direct/:messageId", getDirectThreadMetadata);
var reactionRouter = Router();
reactionRouter.get("/message/:messageId", getMessageReactions);
reactionRouter.post("/", addReaction);
reactionRouter.delete("/:reactionId", removeReaction);
var pollRouter = Router();
pollRouter.post("/:pollId/vote", castPollVote);
var linkPreviewRouter = Router();
linkPreviewRouter.get("/", getLinkPreview);
router.use("/messages", messageRouter);
router.use("/conversations", conversationRouter);
router.use("/threads", threadRouter);
router.use("/reactions", reactionRouter);
router.use("/polls", pollRouter);
router.use("/link-preview", linkPreviewRouter);
var routes_default = router;

// src/core/servers/routes.ts
import { Router as Router2 } from "express";

// src/core/servers/controllers.ts
init_db();
init_logger();
var getChannel = async (req, res) => {
  try {
    const { channelId } = req.params;
    const channel = await prisma.channel.findUnique({
      where: { id: channelId }
    });
    return ApiResponse.success(res, channel);
  } catch (error) {
    logger_default.error("[GET_CHANNEL]", error);
    return ApiResponse.error(res, "Internal server error");
  }
};
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
        profile: { userId }
      }
    });
    if (!currentMember) {
      return ApiResponse.error(res, "Forbidden", 403);
    }
    const channels = await prisma.channel.findMany({
      where: { serverId },
      orderBy: { createdAt: "asc" }
    });
    return ApiResponse.success(res, channels);
  } catch (error) {
    logger_default.error("[GET_SERVER_CHANNELS]", error);
    return ApiResponse.error(res, "Internal server error");
  }
};
var getMember = async (req, res) => {
  try {
    const { memberId } = req.params;
    const member = await prisma.member.findUnique({
      where: { id: memberId },
      include: { profile: true }
    });
    return ApiResponse.success(res, member);
  } catch (error) {
    logger_default.error("[GET_MEMBER]", error);
    return ApiResponse.error(res, "Internal server error");
  }
};
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
        profile: { userId }
      }
    });
    if (!currentMember) {
      return ApiResponse.error(res, "Forbidden", 403);
    }
    const members = await prisma.member.findMany({
      where: { serverId },
      include: { profile: true },
      orderBy: { role: "asc" }
    });
    return ApiResponse.success(res, members);
  } catch (error) {
    logger_default.error("[GET_SERVER_MEMBERS]", error);
    return ApiResponse.error(res, "Internal server error");
  }
};
var createChannel = async (req, res) => {
  try {
    const { serverId } = req.query;
    const { name, type } = req.body;
    const userId = res.locals.userId;
    if (!serverId || typeof serverId !== "string") {
      return ApiResponse.error(res, "Server ID missing", 400);
    }
    if (!name) {
      return ApiResponse.error(res, "Channel name is required", 400);
    }
    const currentMember = await prisma.member.findFirst({
      where: {
        serverId,
        profile: { userId },
        role: { in: ["ADMIN", "MODERATOR"] }
      }
    });
    if (!currentMember) {
      return ApiResponse.error(res, "Forbidden", 403);
    }
    const server2 = await prisma.server.update({
      where: { id: serverId },
      data: {
        channels: {
          create: {
            name,
            type: type || "TEXT",
            profileId: currentMember.profileId
          }
        }
      },
      include: {
        channels: { orderBy: { createdAt: "asc" } },
        members: { include: { profile: true }, orderBy: { role: "asc" } }
      }
    });
    return ApiResponse.success(res, server2);
  } catch (error) {
    logger_default.error("[CREATE_CHANNEL]", error);
    return ApiResponse.error(res, "Internal server error");
  }
};
var updateChannel = async (req, res) => {
  try {
    const { channelId } = req.params;
    const { serverId } = req.query;
    const { name, type } = req.body;
    const userId = res.locals.userId;
    if (!serverId || typeof serverId !== "string") {
      return ApiResponse.error(res, "Server ID missing", 400);
    }
    if (!channelId) {
      return ApiResponse.error(res, "Channel ID missing", 400);
    }
    const currentMember = await prisma.member.findFirst({
      where: {
        serverId,
        profile: { userId },
        role: { in: ["ADMIN", "MODERATOR"] }
      }
    });
    if (!currentMember) {
      return ApiResponse.error(res, "Forbidden", 403);
    }
    const channel = await prisma.channel.findFirst({
      where: { id: channelId, serverId }
    });
    if (!channel) {
      return ApiResponse.error(res, "Channel not found", 404);
    }
    if (channel.name === "general") {
      return ApiResponse.error(res, "Cannot edit general channel", 400);
    }
    const server2 = await prisma.server.update({
      where: { id: serverId },
      data: {
        channels: {
          update: {
            where: { id: channelId },
            data: { name, type }
          }
        }
      },
      include: {
        channels: { orderBy: { createdAt: "asc" } },
        members: { include: { profile: true }, orderBy: { role: "asc" } }
      }
    });
    return ApiResponse.success(res, server2);
  } catch (error) {
    logger_default.error("[UPDATE_CHANNEL]", error);
    return ApiResponse.error(res, "Internal server error");
  }
};
var deleteChannel = async (req, res) => {
  try {
    const { channelId } = req.params;
    const { serverId } = req.query;
    const userId = res.locals.userId;
    if (!serverId || typeof serverId !== "string") {
      return ApiResponse.error(res, "Server ID missing", 400);
    }
    if (!channelId) {
      return ApiResponse.error(res, "Channel ID missing", 400);
    }
    const currentMember = await prisma.member.findFirst({
      where: {
        serverId,
        profile: { userId },
        role: { in: ["ADMIN", "MODERATOR"] }
      }
    });
    if (!currentMember) {
      return ApiResponse.error(res, "Forbidden", 403);
    }
    const channel = await prisma.channel.findFirst({
      where: { id: channelId, serverId }
    });
    if (!channel) {
      return ApiResponse.error(res, "Channel not found", 404);
    }
    if (channel.name === "general") {
      return ApiResponse.error(res, "Cannot delete general channel", 400);
    }
    const server2 = await prisma.server.update({
      where: { id: serverId },
      data: {
        channels: {
          delete: { id: channelId }
        }
      },
      include: {
        channels: { orderBy: { createdAt: "asc" } },
        members: { include: { profile: true }, orderBy: { role: "asc" } }
      }
    });
    return ApiResponse.success(res, server2);
  } catch (error) {
    logger_default.error("[DELETE_CHANNEL]", error);
    return ApiResponse.error(res, "Internal server error");
  }
};
var updateMemberRole = async (req, res) => {
  try {
    const { memberId } = req.params;
    const { serverId } = req.query;
    const { role } = req.body;
    const userId = res.locals.userId;
    if (!serverId || typeof serverId !== "string") {
      return ApiResponse.error(res, "Server ID missing", 400);
    }
    if (!memberId) {
      return ApiResponse.error(res, "Member ID missing", 400);
    }
    const currentMember = await prisma.member.findFirst({
      where: {
        serverId,
        profile: { userId },
        role: "ADMIN"
      }
    });
    if (!currentMember) {
      return ApiResponse.error(res, "Forbidden", 403);
    }
    const server2 = await prisma.server.update({
      where: { id: serverId },
      data: {
        members: {
          update: {
            where: { id: memberId },
            data: { role }
          }
        }
      },
      include: {
        channels: { orderBy: { createdAt: "asc" } },
        members: { include: { profile: true }, orderBy: { role: "asc" } }
      }
    });
    return ApiResponse.success(res, server2);
  } catch (error) {
    logger_default.error("[UPDATE_MEMBER_ROLE]", error);
    return ApiResponse.error(res, "Internal server error");
  }
};
var kickMember = async (req, res) => {
  try {
    const { memberId } = req.params;
    const { serverId } = req.query;
    const userId = res.locals.userId;
    if (!serverId || typeof serverId !== "string") {
      return ApiResponse.error(res, "Server ID missing", 400);
    }
    if (!memberId) {
      return ApiResponse.error(res, "Member ID missing", 400);
    }
    const currentMember = await prisma.member.findFirst({
      where: {
        serverId,
        profile: { userId },
        role: "ADMIN"
      }
    });
    if (!currentMember) {
      return ApiResponse.error(res, "Forbidden", 403);
    }
    const server2 = await prisma.server.update({
      where: { id: serverId },
      data: {
        members: {
          delete: { id: memberId }
        }
      },
      include: {
        channels: { orderBy: { createdAt: "asc" } },
        members: { include: { profile: true }, orderBy: { role: "asc" } }
      }
    });
    return ApiResponse.success(res, server2);
  } catch (error) {
    logger_default.error("[KICK_MEMBER]", error);
    return ApiResponse.error(res, "Internal server error");
  }
};

// src/core/servers/routes.ts
var router2 = Router2();
var channelRouter = Router2();
channelRouter.get("/server/:serverId", getServerChannels);
channelRouter.get("/:channelId", getChannel);
channelRouter.post("/", createChannel);
channelRouter.patch("/:channelId", updateChannel);
channelRouter.delete("/:channelId", deleteChannel);
var memberRouter = Router2();
memberRouter.get("/server/:serverId", getServerMembers);
memberRouter.get("/:memberId", getMember);
memberRouter.patch("/:memberId", updateMemberRole);
memberRouter.delete("/:memberId", kickMember);
router2.use("/channels", channelRouter);
router2.use("/members", memberRouter);
var routes_default2 = router2;

// src/core/notifications/routes.ts
import { Router as Router3 } from "express";

// src/core/notifications/controllers.ts
init_db();
init_logger();
var getNotifications = async (req, res) => {
  try {
    const userId = res.locals.userId;
    const profile = await prisma.profile.findFirst({ where: { userId } });
    if (!profile) {
      return ApiResponse.error(res, "Profile not found", 404);
    }
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
    logger_default.error("[GET_NOTIFICATIONS]", error);
    return ApiResponse.error(res, "Internal server error");
  }
};
var getUnreadCount = async (req, res) => {
  try {
    const userId = res.locals.userId;
    const profile = await prisma.profile.findFirst({ where: { userId } });
    if (!profile) {
      return ApiResponse.error(res, "Profile not found", 404);
    }
    const count = await prisma.notification.count({
      where: {
        receiverId: profile.id,
        isRead: false
      }
    });
    return ApiResponse.success(res, { count });
  } catch (error) {
    logger_default.error("[GET_UNREAD_COUNT]", error);
    return ApiResponse.error(res, "Internal server error");
  }
};
var markAsRead = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const userId = res.locals.userId;
    const profile = await prisma.profile.findFirst({ where: { userId } });
    if (!profile) return ApiResponse.error(res, "Profile not found", 404);
    const notification = await prisma.notification.update({
      where: {
        id: notificationId,
        receiverId: profile.id
      },
      data: { isRead: true }
    });
    return ApiResponse.success(
      res,
      notification,
      "Notification marked as read"
    );
  } catch (error) {
    logger_default.error("[MARK_AS_READ]", error);
    return ApiResponse.error(res, "Internal server error");
  }
};
var markAllAsRead = async (req, res) => {
  try {
    const userId = res.locals.userId;
    const profile = await prisma.profile.findFirst({ where: { userId } });
    if (!profile) return ApiResponse.error(res, "Profile not found", 404);
    await prisma.notification.updateMany({
      where: {
        receiverId: profile.id,
        isRead: false
      },
      data: { isRead: true }
    });
    return ApiResponse.success(
      res,
      { success: true },
      "All notifications marked as read"
    );
  } catch (error) {
    logger_default.error("[MARK_ALL_AS_READ]", error);
    return ApiResponse.error(res, "Internal server error");
  }
};
var deleteNotification = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const userId = res.locals.userId;
    const profile = await prisma.profile.findFirst({ where: { userId } });
    if (!profile) return ApiResponse.error(res, "Profile not found", 404);
    await prisma.notification.delete({
      where: {
        id: notificationId,
        receiverId: profile.id
      }
    });
    return ApiResponse.success(res, { success: true }, "Notification deleted");
  } catch (error) {
    logger_default.error("[DELETE_NOTIFICATION]", error);
    return ApiResponse.error(res, "Internal server error");
  }
};
var deleteAllNotifications = async (req, res) => {
  try {
    const userId = res.locals.userId;
    const profile = await prisma.profile.findFirst({ where: { userId } });
    if (!profile) return ApiResponse.error(res, "Profile not found", 404);
    await prisma.notification.deleteMany({
      where: { receiverId: profile.id }
    });
    return ApiResponse.success(
      res,
      { success: true },
      "All notifications deleted"
    );
  } catch (error) {
    logger_default.error("[DELETE_ALL_NOTIFICATIONS]", error);
    return ApiResponse.error(res, "Internal server error");
  }
};

// src/core/notifications/routes.ts
var router3 = Router3();
router3.get("/notifications", getNotifications);
router3.get("/notifications/unread-count", getUnreadCount);
router3.patch("/notifications/:notificationId/read", markAsRead);
router3.patch("/notifications/mark-all-read", markAllAsRead);
router3.delete("/notifications/:notificationId", deleteNotification);
router3.delete("/notifications/delete-all", deleteAllNotifications);
var routes_default3 = router3;

// src/core/users/routes.ts
import { Router as Router4 } from "express";

// src/core/users/controllers.ts
init_db();
init_logger();
var getCurrentUser = async (req, res) => {
  try {
    const userId = res.locals.userId;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true }
    });
    return ApiResponse.success(res, user);
  } catch (error) {
    logger_default.error("[GET_CURRENT_USER]", error);
    return ApiResponse.error(res, "Internal server error");
  }
};

// src/core/users/routes.ts
var router4 = Router4();
router4.get("/users/me", getCurrentUser);
var routes_default4 = router4;

// src/config/routes.ts
init_logger();
function setupRoutes(app2) {
  app2.get("/", (req, res) => {
    res.json({
      message: "Lively Backend API is running",
      documentation: "/health"
    });
  });
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
  app2.all("/api/auth/*", toNodeHandler(auth));
  app2.get("/health", (req, res) => {
    res.json({
      status: "ok",
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      uptime: process.uptime()
    });
  });
  app2.use(authMiddleware);
  app2.use(express.json());
  const v1Router = express.Router();
  v1Router.use(routes_default);
  v1Router.use(routes_default2);
  v1Router.use(routes_default3);
  v1Router.use(routes_default4);
  app2.use("/api/v1", v1Router);
  app2.use(errorHandler);
}

// src/socket/index.ts
init_logger();
import { Server } from "socket.io";

// src/shared/core/socket.ts
init_logger();
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

// src/socket/auth.ts
init_logger();
import { fromNodeHeaders as fromNodeHeaders2 } from "better-auth/node";
var socketAuthMiddleware = async (socket, next) => {
  logger_default.info("[Socket.io] New connection attempt");
  const session = await auth.api.getSession({
    headers: fromNodeHeaders2(socket.handshake.headers)
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
};

// src/socket/messages.ts
init_db();
init_logger();
init_services3();
var registerMessageHandlers = (io2, socket) => {
  socket.on("private message", async ({ content, to }) => {
    io2.to(to).to(socket.user.id).emit("private message", {
      ...content,
      from: socket.user,
      to
    });
    logger_default.info(`[Socket] Private message from ${socket.user.id} to ${to}`);
    try {
      const conversation = await findOrCreateConversation(socket.user.id, to);
      if (!conversation) return;
      const member = conversation.memberOne.profileId === socket.user.id ? conversation.memberOne : conversation.memberTwo;
      await prisma.directMessage.create({
        data: {
          content: content.content || content,
          conversationId: conversation.id,
          memberId: member.id
        }
      });
    } catch (err) {
      logger_default.error("[Socket] Error saving private message:", err);
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
      io2.to(senderId).emit("markAsRead", { senderId, receiverId });
    } catch (error) {
      logger_default.error("[Socket] Error marking messages as read:", error);
    }
  });
};

// src/socket/presence.ts
init_db();
init_logger();
var registerPresenceHandlers = (io2, socket) => {
  prisma.user.update({
    where: { id: socket.user.id },
    data: { isOnline: true }
  }).catch(
    (err) => logger_default.error(
      `[Socket] Error updating online status for ${socket.user.id}:`,
      err
    )
  );
  const activeUsers = [];
  for (let [id, socket2] of io2.of("/").sockets) {
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
  socket.on("typing", (to) => {
    socket.broadcast.to(to).emit("broadcast typing", {});
  });
  socket.on("disconnect", async () => {
    logger_default.info(`[Socket] Client disconnected: ${socket.id}`);
    const userId = socket.user.id;
    const matchingSockets = await io2.in(userId).fetchSockets();
    const isStillConnected = matchingSockets.length > 0;
    if (!isStillConnected) {
      logger_default.info(
        `[Socket] Last connection for user ${userId} closed. Marking offline.`
      );
      prisma.user.update({
        where: { id: userId },
        data: {
          isOnline: false,
          lastSeenAt: /* @__PURE__ */ new Date()
        }
      }).catch(
        (err) => logger_default.error(
          `[Socket] Error updating offline status for ${userId}:`,
          err
        )
      );
      socket.broadcast.emit("user disconnected", userId);
    }
  });
};

// src/socket/notifications.ts
var registerNotificationHandlers = (io2, socket) => {
  socket.on("notification", (arg) => {
    socket.broadcast.to(arg.to).emit("notification", arg.notification);
  });
};

// src/socket/rooms.ts
init_logger();
var registerRoomHandlers = (io2, socket) => {
  socket.on("join-room", (room) => {
    socket.join(room);
    logger_default.info(`[Socket] User ${socket.user.id} joined room ${room}`);
  });
  socket.on("leave-room", (room) => {
    socket.leave(room);
    logger_default.info(`[Socket] User ${socket.user.id} left room ${room}`);
  });
};

// src/core/messaging/events.ts
init_events();

// src/core/notifications/services.ts
init_db();
var NotificationService = class {
  /**
   * Create a new notification
   */
  static async createNotification(payload) {
    const {
      type,
      content,
      senderId,
      receiverId,
      messageId,
      channelId,
      serverId
    } = payload;
    const notification = await prisma.notification.create({
      data: {
        type,
        content,
        senderId,
        receiverId,
        messageId,
        channelId,
        serverId
      },
      include: {
        sender: true
      }
    });
    socketService.emitNotification(receiverId, notification);
    return notification;
  }
};

// src/shared/utils/mention-parser.ts
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

// src/core/messaging/events.ts
init_db();
init_logger();
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

// src/socket/index.ts
var io;
var initializeSocket = (httpServer2, allowedOrigins2, app2) => {
  io = new Server(httpServer2, {
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
  io.use(socketAuthMiddleware);
  io.on("connection", (socket) => {
    logger_default.info(`[Socket.io] Client connected: ${socket.id}`);
    socket.join(socket.user?.id);
    if (process.env.NODE_ENV !== "production") {
      socket.onAny((event, ...args) => {
        logger_default.info(`[Socket Event] ${event}`, args);
      });
    }
    registerMessageHandlers(io, socket);
    registerPresenceHandlers(io, socket);
    registerNotificationHandlers(io, socket);
    registerRoomHandlers(io, socket);
  });
  return io;
};

// src/config/app.ts
init_logger();
import express2 from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { rateLimit } from "express-rate-limit";
var allowedOrigins = process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(",") : ["http://localhost:3000"];
function createApp() {
  const app2 = express2();
  app2.set("trust proxy", 1);
  app2.use(cookieParser());
  app2.use(
    cors({
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
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1e3,
    max: 1e3,
    standardHeaders: true,
    legacyHeaders: false
  });
  app2.use(limiter);
  return app2;
}

// src/config/shutdown.ts
init_db();
init_logger();
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
dotenv.config();
var port = process.env.PORT || 7272;
var app = createApp();
setupRoutes(app);
var server = http.createServer(app);
initializeSocket(server, allowedOrigins, app);
var httpServer;
if (process.env.NODE_ENV !== "test") {
  httpServer = server.listen(Number(port), "0.0.0.0", () => {
    logger_default.info(`\u26A1 Server is ready on port:${port} \u{1F525}`);
    logger_default.info(`Allowed origins: ${allowedOrigins}`);
  });
}
serverShutdown(httpServer);
export {
  app
};
//# sourceMappingURL=server.js.map