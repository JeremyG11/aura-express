"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateUserStatus = void 0;
const updateUserStatus = async (userId, status) => {
    try {
        await prisma.user.update({
            where: {
                id: userId,
            },
            data: {
                isOnline: status,
            },
        });
        return await prisma.user.findMany({
            where: {
                isOnline: true,
            },
        });
    }
    catch (error) {
        console.error(error);
    }
};
exports.updateUserStatus = updateUserStatus;
//# sourceMappingURL=user-controller.js.map