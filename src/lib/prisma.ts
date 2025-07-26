

import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as {
  prisma: PrismaClient | undefined;
};

function getPrismaClient(): PrismaClient {
  if (process.env.NODE_ENV === 'production') {
    return new PrismaClient();
  } else {
    if (!globalForPrisma.prisma) {
      globalForPrisma.prisma = new PrismaClient();
    }
    return globalForPrisma.prisma;
  }
}


export const prisma = getPrismaClient();


// export const prisma = getPrismaClient().$extends({
//   query: {
//     $allModels: {
//       async $allOperations({ model, operation, query, args }) {
//         const start = performance.now();
//         const result = await query(args);
//         const end = performance.now();
//         const time = end - start;
//         console.log(`Query: ${model}.${operation} took ${time.toFixed(2)}ms`);
//         return result;
//       },
//     },
//   },
// });