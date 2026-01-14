import { PrismaClient } from '@/generated/prisma/index.js';
const prisma = new PrismaClient();
async function seedTeams() {
    console.log('Seeding teams...');
    try {
        // Create sample teams
        const teams = [
            {
                name: 'Development Team',
                description: 'Software development and engineering team'
            },
            {
                name: 'Field Operations',
                description: 'On-site field engineers and technicians'
            },
            {
                name: 'Support Team',
                description: 'Customer support and maintenance team'
            },
            {
                name: 'Sales Team',
                description: 'Sales and business development team'
            }
        ];
        for (const team of teams) {
            const existingTeam = await prisma.team.findUnique({
                where: { name: team.name }
            });
            if (!existingTeam) {
                await prisma.team.create({
                    data: team
                });
                console.log(`Created team: ${team.name}`);
            }
            else {
                console.log(`Team already exists: ${team.name}`);
            }
        }
        console.log('Teams seeded successfully!');
    }
    catch (error) {
        console.error('Error seeding teams:', error);
        throw error;
    }
    finally {
        await prisma.$disconnect();
    }
}
seedTeams();
