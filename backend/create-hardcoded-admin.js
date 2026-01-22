const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createHardcodedAdmin() {
  try {
    // Check if admin already exists
    const existingAdmin = await prisma.admin.findUnique({
      where: { id: 'admin-001' }
    });

    if (existingAdmin) {
      console.log('Hardcoded admin already exists:', existingAdmin);
      return;
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash('Admin@123', 12);

    // Create the hardcoded admin
    const admin = await prisma.admin.create({
      data: {
        id: 'admin-001',
        name: 'System Administrator',
        email: 'admin@mediainfotech.org',
        adminId: 'ADMIN001',
        password: hashedPassword
      }
    });

    console.log('Hardcoded admin created successfully:', {
      id: admin.id,
      name: admin.name,
      email: admin.email,
      adminId: admin.adminId
    });
  } catch (error) {
    console.error('Error creating hardcoded admin:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

createHardcodedAdmin();