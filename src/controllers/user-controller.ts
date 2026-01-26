import { prisma } from "../libs/db";

export const updateUserStatus = async (userId: string, status: boolean) => {
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
  } catch (error) {
    console.error(error);
  }
};
