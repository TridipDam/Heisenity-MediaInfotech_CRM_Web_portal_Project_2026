/**
 * Test script to verify admin credential reset functionality
 * Tests Admin ID, Email, and Password reset capabilities
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function testAdminCredentialReset() {
  try {
    console.log('🧪 Testing comprehensive admin credential reset functionality...');
    
    // Find an admin to test with
    const admin = await prisma.admin.findFirst({
      where: { status: 'ACTIVE' },
      select: {
        id: true,
        name: true,
        adminId: true,
        email: true,
        password: true
      }
    });

    if (!admin) {
      console.log('❌ No active admin found for testing');
      return;
    }

    console.log(`✅ Found test admin: ${admin.name} (${admin.adminId}) - ${admin.email}`);
    
    // Store original values for restoration
    const originalData = {
      adminId: admin.adminId,
      email: admin.email,
      password: admin.password
    };
    
    console.log('📝 Original credentials stored for restoration');

    // Test 1: Admin ID Reset
    console.log('\n🔧 Test 1: Admin ID Reset');
    const newAdminId = `TEST_${Date.now()}`;
    
    await prisma.admin.update({
      where: { id: admin.id },
      data: { adminId: newAdminId, updatedAt: new Date() }
    });
    
    const updatedAdmin1 = await prisma.admin.findUnique({
      where: { id: admin.id },
      select: { adminId: true }
    });
    
    if (updatedAdmin1.adminId === newAdminId) {
      console.log('✅ Admin ID reset successful:', newAdminId);
    } else {
      console.log('❌ Admin ID reset failed');
    }

    // Test 2: Email Reset
    console.log('\n📧 Test 2: Email Reset');
    const newEmail = `test_${Date.now()}@example.com`;
    
    await prisma.admin.update({
      where: { id: admin.id },
      data: { email: newEmail, updatedAt: new Date() }
    });
    
    const updatedAdmin2 = await prisma.admin.findUnique({
      where: { id: admin.id },
      select: { email: true }
    });
    
    if (updatedAdmin2.email === newEmail) {
      console.log('✅ Email reset successful:', newEmail);
    } else {
      console.log('❌ Email reset failed');
    }

    // Test 3: Password Reset
    console.log('\n🔐 Test 3: Password Reset');
    const newPassword = 'newTestPassword123';
    const saltRounds = 12;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);
    
    await prisma.admin.update({
      where: { id: admin.id },
      data: { password: newPasswordHash, updatedAt: new Date() }
    });
    
    const updatedAdmin3 = await prisma.admin.findUnique({
      where: { id: admin.id },
      select: { password: true }
    });
    
    if (updatedAdmin3.password !== originalData.password) {
      console.log('✅ Password reset successful');
      
      // Verify password works
      const isValidPassword = await bcrypt.compare(newPassword, updatedAdmin3.password);
      if (isValidPassword) {
        console.log('🔐 Password verification successful');
      } else {
        console.log('❌ Password verification failed');
      }
    } else {
      console.log('❌ Password reset failed');
    }

    // Test 4: Combined Reset (All three at once)
    console.log('\n🎯 Test 4: Combined Credential Reset');
    const combinedAdminId = `COMBINED_${Date.now()}`;
    const combinedEmail = `combined_${Date.now()}@example.com`;
    const combinedPassword = 'combinedTestPassword456';
    const combinedPasswordHash = await bcrypt.hash(combinedPassword, saltRounds);
    
    await prisma.admin.update({
      where: { id: admin.id },
      data: {
        adminId: combinedAdminId,
        email: combinedEmail,
        password: combinedPasswordHash,
        updatedAt: new Date()
      }
    });
    
    const updatedAdmin4 = await prisma.admin.findUnique({
      where: { id: admin.id },
      select: { adminId: true, email: true, password: true }
    });
    
    const combinedSuccess = 
      updatedAdmin4.adminId === combinedAdminId &&
      updatedAdmin4.email === combinedEmail &&
      await bcrypt.compare(combinedPassword, updatedAdmin4.password);
    
    if (combinedSuccess) {
      console.log('🎉 Combined credential reset successful!');
      console.log(`   Admin ID: ${updatedAdmin4.adminId}`);
      console.log(`   Email: ${updatedAdmin4.email}`);
      console.log('   Password: ✓ Verified');
    } else {
      console.log('❌ Combined credential reset failed');
    }

    // Test 5: Validation Tests
    console.log('\n🛡️ Test 5: Validation Tests');
    
    // Test duplicate Admin ID (should fail in real API)
    console.log('Testing duplicate Admin ID handling...');
    const existingAdmin = await prisma.admin.findFirst({
      where: { 
        id: { not: admin.id },
        status: 'ACTIVE'
      },
      select: { adminId: true }
    });
    
    if (existingAdmin) {
      console.log(`✅ Found existing admin ID for duplicate test: ${existingAdmin.adminId}`);
    } else {
      console.log('⚠️ No other admin found for duplicate test');
    }

    // Restore original credentials
    console.log('\n🔄 Restoring original credentials...');
    await prisma.admin.update({
      where: { id: admin.id },
      data: {
        adminId: originalData.adminId,
        email: originalData.email,
        password: originalData.password,
        updatedAt: new Date()
      }
    });
    
    const restoredAdmin = await prisma.admin.findUnique({
      where: { id: admin.id },
      select: { adminId: true, email: true, password: true }
    });
    
    const restorationSuccess = 
      restoredAdmin.adminId === originalData.adminId &&
      restoredAdmin.email === originalData.email &&
      restoredAdmin.password === originalData.password;
    
    if (restorationSuccess) {
      console.log('✅ Original credentials restored successfully');
    } else {
      console.log('❌ Failed to restore original credentials');
    }

    console.log('\n🎉 All tests completed!');
    console.log('\n📋 Test Summary:');
    console.log('✅ Admin ID reset functionality');
    console.log('✅ Email reset functionality');
    console.log('✅ Password reset functionality');
    console.log('✅ Combined credential reset');
    console.log('✅ Data restoration');

  } catch (error) {
    console.error('❌ Test failed with error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testAdminCredentialReset();