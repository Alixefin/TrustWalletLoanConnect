
import { PrismaClient } from '@prisma/client';

let prisma: PrismaClient;

// ensuring the client is instantiated globally *once* per serverless instance's cold start.
if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient();
} else {
  if (!global.prisma) {
    global.prisma = new PrismaClient();
  }
  prisma = global.prisma;
}

export { prisma }; // Export as named export
