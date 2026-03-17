import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
  if (!email) throw new Error("SEED_ADMIN_EMAIL is required");

  const tenant = await db.tenant.upsert({
    where: { slug: "demo" },
    update: {},
    create: { name: "Demo Franchise", slug: "demo" },
  });

  await db.team.upsert({
    where: { shortCode: "DEM" },
    update: { tenantId: tenant.id },
    create: { displayName: "Demo Team", shortCode: "DEM", tenantId: tenant.id },
  });

  await db.user.upsert({
    where: { email },
    update: { role: "LEAGUE_ADMIN", tenantId: null },
    create: { email, role: "LEAGUE_ADMIN", tenantId: null },
  });
}

try {
  await main();
} finally {
  await db.$disconnect();
}

