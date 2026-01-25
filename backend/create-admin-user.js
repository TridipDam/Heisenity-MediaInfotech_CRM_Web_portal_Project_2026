const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function createAdminUser() {
  try {
    // First, check if admin already exists
    const existingAdmin = await prisma.admin.findUnique({
      where: { adminId: 'ADMIN001' }
    });

    if (existingAdmin) {
      console.log('Admin user already exists. Updating password...');
      
      // Update the existing admin with correct password
      const hashedPassword = await bcrypt.hash('admin123456', 12);
      
      await prisma.admin.update({
        where: { adminId: 'ADMIN001' },
        data: {
          email: 'admin@company.com',
          password: hashedPassword
        }
      });
      
      console.log('✅ Admin user updated successfully!');
    } else {
      console.log('Creating new admin user...');
      
      // Create new admin user
      const hashedPassword = await bcrypt.hash('admin123456', 12);
      
      await prisma.admin.create({
        data: {
          adminId: 'ADMIN001',
          email: 'admin@company.com',
          password: hashedPassword
        }
      });
      
      console.log('✅ Admin user created successfully!');
    }

    console.log('\n=== LOGIN CREDENTIALS ===');
    console.log('Admin ID: ADMIN001');
    console.log('Email: admin@company.com');
    console.log('Password: admin123456');
    console.log('========================\n');

  } catch (error) {
    console.error('❌ Error creating admin user:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createAdminUser();