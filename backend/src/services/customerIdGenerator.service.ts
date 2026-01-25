import { prisma } from '@/lib/prisma';

export class CustomerIdGeneratorService {
  private static async getNextSequenceForPrefix(prefix: string): Promise<number> {
    // Get or create config for this prefix
    let config = await prisma.customerIdConfig.findUnique({
      where: { prefix }
    });

    if (!config) {
      // Create new config for this prefix
      config = await prisma.customerIdConfig.create({
        data: {
          prefix,
          nextSequence: 1,
          isActive: true
        }
      });
    }

    // Get the next sequence and increment it
    const nextSequence = config.nextSequence;
    
    await prisma.customerIdConfig.update({
      where: { prefix },
      data: { nextSequence: nextSequence + 1 }
    });

    return nextSequence;
  }

  static async generateCustomerId(customPrefix?: string): Promise<string> {
    const prefix = customPrefix || 'CUS';
    const sequence = await this.getNextSequenceForPrefix(prefix);
    return `${prefix}${sequence.toString().padStart(4, '0')}`;
  }

  static async getAvailablePrefixes(): Promise<string[]> {
    const configs = await prisma.customerIdConfig.findMany({
      where: { isActive: true },
      select: { prefix: true },
      orderBy: { createdAt: 'asc' }
    });
    
    return configs.map(config => config.prefix);
  }

  static async addCustomPrefix(prefix: string): Promise<void> {
    // Validate prefix (only letters, 2-5 characters)
    if (!/^[A-Z]{2,5}$/.test(prefix)) {
      throw new Error('Prefix must be 2-5 uppercase letters only');
    }

    // Check if prefix already exists
    const existing = await prisma.customerIdConfig.findUnique({
      where: { prefix }
    });

    if (existing) {
      throw new Error('Prefix already exists');
    }

    await prisma.customerIdConfig.create({
      data: {
        prefix,
        nextSequence: 1,
        isActive: true
      }
    });
  }
}
