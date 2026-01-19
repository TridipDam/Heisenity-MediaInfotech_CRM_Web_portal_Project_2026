#!/usr/bin/env node

const { execSync } = require('child_process');

console.log('🚀 Starting forced migration deployment...');

try {
  // Generate Prisma client first
  console.log('📦 Generating Prisma client...');
  execSync('npx prisma generate', { stdio: 'inherit' });
  
  // Deploy migrations
  console.log('🔄 Deploying migrations...');
  execSync('npx prisma migrate deploy', { stdio: 'inherit' });
  
  // Verify database connection
  console.log('✅ Verifying database connection...');
  execSync('npx prisma db pull --print', { stdio: 'inherit' });
  
  console.log('🎉 Migration completed successfully!');
} catch (error) {
  console.error('❌ Migration failed:', error.message);
  process.exit(1);
}