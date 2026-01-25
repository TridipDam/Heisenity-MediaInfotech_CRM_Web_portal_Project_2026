/**
 * Reset Admin Password Script
 * Updates the existing admin password to match credentials file
 */

const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");
const bcrypt = require('bcryptjs');

// Load environment variables
require('dotenv').config();

// Initialize Prisma client with PostgreSQL adapter
const pool = new Pool({
  host: process.env.DATABASE_HOST,
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME,
  port: parseInt(process.env.DATABASE_PORT || '5432'),
  max: 5,
  ssl: false
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function resetAdminPassword() {
  try {
    console.log('🔄 Resetting admin password...');
    
    // Find the existing admin
    const admin = await prisma.admin.findFirst();
    
    if (!admin) {
      console.log('❌ No admin found in database');
      return;
    }
    
    console.log(`👤 Found admin: ${admin.adminId} (${admin.email})`);
    
    // Hash the correct password from credentials file
    const correctPassword = 'admin123456';
    const hashedPassword = await bcrypt.hash(correctPassword, 12);
    
    // Update the admin password
    await prisma.admin.update({
      where: { id: admin.id },
      data: {
        password: hashedPassword,
        adminId: 'ADMIN001',
        email: 'admin@company.com'
      }
    });
    
    console.log('✅ Admin password reset successfully!');
    console.log('');
    console.log('🔑 UPDATED LOGIN CREDENTIALS:');
    console.log('─'.repeat(30));
    console.log('👤 Admin ID: ADMIN001');
    console.log('📧 Email:    admin@company.com');
    console.log('🔒 Password: admin123456');
    console.log('');
    console.log('🌐 Login URL: http://localhost:3000/admin-login');
    console.log('');
    
  } catch (error) {
    console.error('❌ Error resetting admin password:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
resetAdminPassword()
  .then(() => {
    console.log('🎉 Password reset completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Password reset failed:', error);
    process.exit(1);
  });