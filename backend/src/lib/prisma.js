import "dotenv/config";
import { PrismaClient } from '../../generated/prisma';
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
const adapter = new PrismaMariaDb({
    host: process.env.DATABASE_HOST,
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME,
    connectionLimit: 5,
    allowPublicKeyRetrieval: true,
    ssl: false
});
const prisma = new PrismaClient({ adapter });
export { prisma };
