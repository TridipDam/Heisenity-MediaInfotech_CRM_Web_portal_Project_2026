const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function seedCustomerPrefixes() {
  try {
    console.log('Seeding customer ID prefixes...');

    // Default prefixes
    const defaultPrefixes = [
      { prefix: 'CUS', nextSequence: 1 }, // Default customer
      { prefix: 'VIP', nextSequence: 1 }, // VIP customers
      { prefix: 'ENT', nextSequence: 1 }, // Enterprise customers
      { prefix: 'CHM', nextSequence: 1 }, // Custom prefix as requested
    ];

    for (const prefixData of defaultPrefixes) {
      const existing = await prisma.customerIdConfig.findUnique({
        where: { prefix: prefixData.prefix }
      });

      if (!existing) {
        await prisma.customerIdConfig.create({
          data: {
            prefix: prefixData.prefix,
            nextSequence: prefixData.nextSequence,
            isActive: true
          }
        });
        console.log(`✓ Added prefix: ${prefixData.prefix}`);
      } else {
        console.log(`- Prefix ${prefixData.prefix} already exists`);
      }
    }

    console.log('Customer ID prefixes seeded successfully!');
  } catch (error) {
    console.error('Error seeding customer prefixes:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seedCustomerPrefixes();