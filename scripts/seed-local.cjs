const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("Seeding local database...");

  // Create User
  const user = await prisma.user.create({
    data: {
      id: "69835990989bc7179a215b2d",
      name: "Gatwech Tap Nguth",
      email: "barodev3211@gmail.com",
    }
  });

  // Create Profile
  const profile = await prisma.profile.create({
    data: {
      id: "698387f650cc39a342d16034",
      userId: user.id,
      name: user.name,
      email: user.email,
    }
  });

  // Create Server
  const server = await prisma.server.create({
    data: {
      id: "69848732ae90adff993487bd",
      name: "Local Test Server",
      inviteCode: "test-invite",
      profileId: profile.id,
    }
  });

  // Create Member
  const member = await prisma.member.create({
    data: {
      id: "69848732ae90adff993487bf",
      profileId: profile.id,
      serverId: server.id,
      role: "ADMIN",
    }
  });

  // Create Channel
  const channel = await prisma.channel.create({
    data: {
      id: "69848732ae90adff993487be",
      name: "general",
      serverId: server.id,
      profileId: profile.id,
    }
  });

  console.log("Seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error("Error during seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
