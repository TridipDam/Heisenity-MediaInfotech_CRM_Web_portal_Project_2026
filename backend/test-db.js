import { PrismaClient } from './generated/prisma/index.js';
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

const adapter = new PrismaMariaDb({
  host: 'localhost',
  user: 'TRIDIP',
  password: 'prisma_password',
  database: 'prisma_db',
  connectionLimit: 5
});

const prisma = new PrismaClient({ adapter });

async function testDatabase() {
  try {
    console.log('Testing database connection...');
    
    // Test connection
    await prisma.$connect();
    console.log('✅ Database connected successfully');
    
    // Check if tables exist
    const admins = await prisma.admin.findMany();
    console.log(`📊 Admins count: ${admins.length}`);
    
    const fieldEngineers = await prisma.fieldEngineer.findMany();
    console.log(`👷 Field Engineers count: ${fieldEngineers.length}`);
    
    // Try to create a simple field engineer without foreign key
    const testEmployee = await prisma.fieldEngineer.create({
      data: {
        name: 'Test Employee',
        employeeId: 'TEST001',
        email: 'test@example.com',
        password: 'password123',
        phone: '1234567890',
        teamId: null,
        isTeamLeader: false,
        assignedBy: null
      }
    });
    
    console.log('✅ Test field engineer created:', testEmployee.employeeId);
    
    // Clean up
    await prisma.fieldEngineer.delete({
      where: { id: testEmployee.id }
    });
    
    console.log('✅ Test field engineer deleted');
    
  } catch (error) {
    console.error('❌ Database test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testDatabase();