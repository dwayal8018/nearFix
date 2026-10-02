import { PrismaClient, Role, AccountStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const CATEGORIES: { key: string; label: string }[] = [
  { key: "plumbing", label: "Plumbing" },
  { key: "electrical", label: "Electrical" },
  { key: "housekeeping", label: "Housekeeping" },
  { key: "carpentry", label: "Carpentry" },
  { key: "painting", label: "Painting" },
  { key: "appliance_repair", label: "AC & Appliance Repair" },
  { key: "pest_control", label: "Pest Control" },
  { key: "gardening", label: "Gardening" },
];

async function main() {
  console.log("Seeding NearFix database...");

  // 1. Service categories
  for (const c of CATEGORIES) {
    await prisma.serviceCategory.upsert({
      where: { key: c.key },
      update: { label: c.label, active: true },
      create: { key: c.key, label: c.label, active: true },
    });
  }
  console.log(`  ✓ ${CATEGORIES.length} service categories`);

  // 2. Feature flags — monetization is OFF for v1
  await prisma.appSetting.upsert({
    where: { key: "monetization_enabled" },
    update: {},
    create: { key: "monetization_enabled", value: "false" },
  });
  console.log("  ✓ monetization_enabled = false");

  // 3. First admin account (credentials from env)
  const adminPhone = process.env.SEED_ADMIN_PHONE ?? "9999999999";
  const adminName = process.env.SEED_ADMIN_NAME ?? "NearFix Admin";
  const adminPassword =
    process.env.SEED_ADMIN_PASSWORD ?? "change-this-admin-password";

  const passwordHash = await bcrypt.hash(adminPassword, 10);

  await prisma.user.upsert({
    where: { phone: adminPhone },
    update: { role: Role.ADMIN, status: AccountStatus.ACTIVE },
    create: {
      name: adminName,
      phone: adminPhone,
      passwordHash,
      role: Role.ADMIN,
      status: AccountStatus.ACTIVE,
    },
  });
  console.log(`  ✓ admin account (phone: ${adminPhone})`);

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
