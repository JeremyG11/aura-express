"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findOrCreateConversation = void 0;
const db_1 = require("./db");
const findOrCreateConversation = async (memberOneId, memberTwoId) => {
    let conversation = (await findConversation(memberOneId, memberTwoId)) ||
        (await findConversation(memberTwoId, memberOneId));
    if (!conversation) {
        conversation = await createNewConversation(memberOneId, memberTwoId);
    }
    return conversation;
};
exports.findOrCreateConversation = findOrCreateConversation;
const findConversation = async (memberOneId, memberTwoId) => {
    try {
        return await db_1.prisma.conversation.findFirst({
            where: {
                AND: [{ memberOneId: memberOneId }, { memberTwoId: memberTwoId }],
            },
            include: {
                memberOne: {
                    include: {
                        profile: true,
                    },
                },
                memberTwo: {
                    include: {
                        profile: true,
                    },
                },
            },
        });
    }
    catch (error) {
        console.error("Error finding conversation:", error);
        return null;
    }
};
const createNewConversation = async (memberOneId, memberTwoId) => {
    try {
        return await db_1.prisma.conversation.create({
            data: {
                memberOneId,
                memberTwoId,
            },
            include: {
                memberOne: {
                    include: {
                        profile: true,
                    },
                },
                memberTwo: {
                    include: {
                        profile: true,
                    },
                },
            },
        });
    }
    catch {
        return null;
    }
};
//# sourceMappingURL=conversation.js.map