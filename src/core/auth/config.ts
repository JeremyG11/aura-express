import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import {
  admin,
  customSession,
  magicLink,
  twoFactor,
  organization,
} from "better-auth/plugins";
import { passkey } from "@better-auth/passkey";
import { stripe } from "@better-auth/stripe";
import { Stripe } from "stripe";

import { prisma } from "@/shared/core/db";
import logger from "@/shared/core/logger";
import { ac, roles } from "@/shared/utils/permissions";
import { sendEmailAction } from "@/email/email";
import { hashPassword, verifyPassword } from "@/shared/libs/argon2";

export const auth = betterAuth({
  appName: "Aura",
  basePath: "/api/auth",
  trustProxy: true,
  database: prismaAdapter(prisma, {
    provider: "mongodb",
  }),
  debug: true,
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL:
    process.env.BETTER_AUTH_URL || "https://node-socket-io-hxb4.onrender.com",
  trustedOrigins: [
    "http://localhost:3000",
    "http://localhost:7272",
    "https://node-socket-io-hxb4.onrender.com",
    "https://aura-seven-lyart.vercel.app",
    process.env.FRONTEND_URL,
    process.env.BETTER_AUTH_URL,
  ].filter((origin): origin is string => !!origin),

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
          description:
            "Please verify your email address to complete the registration process.",
          link: String(link),
        },
      });
    },
  },
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 6,
    autoSignIn: false,
    password: {
      hash: hashPassword,
      verify: verifyPassword,
    },
    requireEmailVerification: false,
    sendResetPassword: async ({ user, url }) => {
      await sendEmailAction({
        to: user.email,
        subject: "Reset your password",
        meta: {
          description: "Please click the link below to reset your password.",
          link: String(url),
        },
      });
    },
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
        },
      },
    },
  },
  user: {
    additionalFields: {
      role: {
        type: ["USER", "ADMIN"],
        input: false,
      },
    },
  },
  session: {
    expiresIn: 30 * 24 * 60 * 60,
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60,
    },
  },

  account: {
    skipStateCookieCheck: true,
    accountLinking: {
      enabled: true,
      trustedProviders: ["google", "github"],
    },
  },

  advanced: {
    database: {
      generateId: false,
    },
    defaultCookieAttributes: {
      sameSite: "none",
      secure: true,
    },
    useSecureCookies: true,
  },

  secondaryStorage: {
    get: async (key) => {
      const value = await prisma.verification.findUnique({
        where: { identifier: key },
      });
      logger.info(`[SecondaryStorage] GET key=${key} found=${!!value}`);
      return value?.value || null;
    },
    set: async (key, value, expiresAt) => {
      logger.info(`[SecondaryStorage] SET key=${key} expires=${expiresAt}`);
      await prisma.verification.upsert({
        where: { identifier: key },
        create: {
          identifier: key,
          value,
          expiresAt: new Date(expiresAt),
        },
        update: {
          value,
          expiresAt: new Date(expiresAt),
        },
      });
    },
    delete: async (key) => {
      logger.info(`[SecondaryStorage] DELETE key=${key}`);
      await prisma.verification.deleteMany({
        where: { identifier: key },
      });
    },
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
    github: {
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    },
  },
  plugins: [
    admin({
      defaultRole: "USER",
      adminRoles: ["ADMIN"],
      ac,
      roles,
    }),
    magicLink({
      sendMagicLink: async ({ email, url }) => {
        await sendEmailAction({
          to: email,
          subject: "Magic Link Login",
          meta: {
            description: "Please click the link below to log in.",
            link: String(url),
          },
        });
      },
    }),
    twoFactor({
      otpOptions: {},
    }),
    passkey(),
    organization(),
    stripe({
      stripeClient: new Stripe(process.env.STRIPE_KEY || "sk_test_"),
      stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET!,
      subscription: {
        enabled: true,
        plans: [
          {
            name: "Plus",
            priceId:
              process.env.STRIPE_PLUS_PRICE_ID ||
              "price_1RoxnJHmTADgihIthZTLmrPn",
          },
          {
            name: "Pro",
            priceId:
              process.env.STRIPE_PRO_PRICE_ID ||
              "price_1RoxnRHmTADgihIt4y8c0lVE",
          },
        ],
      },
    }),
    customSession(async ({ user, session }) => {
      return {
        session: {
          expiresAt: session.expiresAt,
          token: session.token,
          userAgent: session.userAgent,
        },
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          createdAt: user.createdAt,
          role: (user as any).role,
        },
      };
    }),
  ],
});
