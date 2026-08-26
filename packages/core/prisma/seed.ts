import { PrismaClient } from '@prisma/client';
import ratesConfig from '../src/config/rates.config.json';

const prisma = new PrismaClient();

async function main() {
  for (const c of ratesConfig.classifications) {
    const classification = await prisma.classification.upsert({
      where: { code: c.code },
      update: {
        label: c.label,
        description: c.description,
        sortOrder: c.sortOrder,
      },
      create: {
        code: c.code,
        label: c.label,
        description: c.description,
        sortOrder: c.sortOrder,
      },
    });

    const currentRate = await prisma.rateHistory.findFirst({
      where: { classificationId: classification.id, effectiveTo: null },
      orderBy: { effectiveFrom: 'desc' },
    });

    if (!currentRate) {
      await prisma.rateHistory.create({
        data: {
          classificationId: classification.id,
          hourlyRateCents: c.hourlyRateCents,
        },
      });
      console.log(`Seeded ${c.code}: $${(c.hourlyRateCents / 100).toFixed(2)}/hr`);
    } else if (currentRate.hourlyRateCents !== c.hourlyRateCents) {
      // Rate changed since last seed: close out the old row, open a new one,
      // so historical costs keep using the rate that was active at the time.
      const now = new Date();
      await prisma.rateHistory.update({
        where: { id: currentRate.id },
        data: { effectiveTo: now },
      });
      await prisma.rateHistory.create({
        data: {
          classificationId: classification.id,
          hourlyRateCents: c.hourlyRateCents,
          effectiveFrom: now,
        },
      });
      console.log(`Updated ${c.code} rate: $${(c.hourlyRateCents / 100).toFixed(2)}/hr`);
    } else {
      console.log(`${c.code} already up to date`);
    }
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
