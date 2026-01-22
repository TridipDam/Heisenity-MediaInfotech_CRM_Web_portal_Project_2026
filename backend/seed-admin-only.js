const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

async function seedAdmin() {
  const prisma = new PrismaClient();
  
  try {
    // Check if admin already exists
    const existingAdmin = await prisma.admin.findFirst({
      where: {
        OR: [
          { email: 'admin@mediainfotech.org' },
          { adminId: 'ADMIN001' }
        ]
      }
    });

    if (existingAdmin) {
      console.log('Admin already exists, updating credentials...');
      
      // Update existing admin with new credentials
      const hashedPassword = await bcrypt.hash('Admin@123', 12);
      
      const updatedAdmin = await prisma.admin.update({
        where: { id: existingAdmin.id },
        data: {
          name: 'System Administrator',
          email: 'admin@mediainfotech.org',
          adminId: 'ADMIN001',
          password: hashedPassword
        }
      });
      
      console.log('Admin updated successfully:', {
        id: updatedAdmin.id,
        name: updatedAdmin.name,
        email: updatedAdmin.email,
        adminId: updatedAdmin.adminId
      });
    } else {
      // Create new admin
      const hashedPassword = await bcrypt.hash('Admin@123', 12);
      
      const admin = await prisma.admin.create({
        data: {
          name: 'System Administrator',
          email: 'admin@mediainfotech.org',
          adminId: 'ADMIN001',
          password: hashedPassword
        }
      });

      console.log('Admin created successfully:', {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        adminId: admin.adminId
      });
    }
  } catch (error) {
    console.error('Error seeding admin:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seedAdmin();