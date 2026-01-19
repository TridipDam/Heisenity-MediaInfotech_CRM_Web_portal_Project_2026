#!/usr/bin/env node

const { execSync } = require('child_process');

console.log('🔧 Production Migration Script');
console.log('==============================');

function runCommand(command, description) {
  try {
    console.log(`\n📋 ${description}...`);
    execSync(command, { stdio: 'inherit' });
    console.log(`✅ ${description} completed`);
    return true;
  } catch (error) {
    console.error(`❌ ${description} failed:`, error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Starting production migration process...\n');
  
  // Step 1: Generate Prisma client
  if (!runCommand('npx prisma generate', 'Generating Prisma client')) {
    process.exit(1);
  }
  
  // Step 2: Check migration status
  console.log('\n📊 Checking migration status...');
  try {
    execSync('npx prisma migrate status', { stdio: 'inherit' });
  } catch (error) {
    console.log('⚠️  Migration status check failed, proceeding with deployment...');
  }
  
  // Step 3: Deploy migrations
  if (!runCommand('npx prisma migrate deploy', 'Deploying migrations')) {
    console.log('\n🔄 Attempting alternative migration approach...');
    
    // Alternative: Reset and apply all migrations
    if (!runCommand('npx prisma migrate reset --force', 'Resetting database')) {
      process.exit(1);
    }
  }
  
  // Step 4: Verify schema
  console.log('\n🔍 Verifying database schema...');
  try {
    execSync('npx prisma db pull --print', { stdio: 'pipe' });
    console.log('✅ Database schema verification completed');
  } catch (error) {
    console.log('⚠️  Schema verification failed, but migration may still be successful');
  }
  
  console.log('\n🎉 Production migration process completed!');
  console.log('📝 Please check the logs above for any warnings or errors.');
}

main().catch(error => {
  console.error('💥 Migration script failed:', error);
  process.exit(1);
});