"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.auth = void 0;
const better_auth_1 = require("better-auth");
const prisma_1 = require("better-auth/adapters/prisma");
const plugins_1 = require("better-auth/plugins");
const passkey_1 = require("@better-auth/passkey");
const db_1 = require("./db");
const permissions_1 = require("./permissions");
const argon2_1 = require("./argon2");
const email_1 = require("./email");
exports.auth = (0, better_auth_1.betterAuth)({
    database: (0, prisma_1.prismaAdapter)(db_1.prisma, {
        provider: "mongodb",
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
            await (0, email_1.sendEmailAction)({
                to: user.email,
                subject: "Verify your email address",
                meta: {
                    description: "Please verify your email address to complete the registration process.",
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
            hash: argon2_1.hashPassword,
            verify: argon2_1.verifyPassword,
        },
        requireEmailVerification: false,
        sendResetPassword: async ({ user, url }) => {
            await (0, email_1.sendEmailAction)({
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
        accountLinking: {
            enabled: true,
            trustedProviders: ["google", "github"],
        },
    },
    advanced: {
        database: {
            generateId: false,
        },
    },
    socialProviders: {
        google: {
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        },
        github: {
            clientId: process.env.GITHUB_CLIENT_ID,
            clientSecret: process.env.GITHUB_CLIENT_SECRET,
        },
    },
    plugins: [
        (0, plugins_1.admin)({
            defaultRole: "USER",
            adminRoles: ["ADMIN"],
            ac: permissions_1.ac,
            roles: permissions_1.roles,
        }),
        (0, plugins_1.magicLink)({
            sendMagicLink: async ({ email, url }) => {
                await (0, email_1.sendEmailAction)({
                    to: email,
                    subject: "Magic Link Login",
                    meta: {
                        description: "Please click the link below to log in.",
                        link: String(url),
                    },
                });
            },
        }),
        (0, plugins_1.twoFactor)({
            otpOptions: {},
        }),
        (0, passkey_1.passkey)(),
        (0, plugins_1.customSession)(async ({ user, session }) => {
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
                    role: user.role,
                },
            };
        }),
    ],
});
//# sourceMappingURL=auth.js.map