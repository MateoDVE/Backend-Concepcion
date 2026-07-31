import { Module, Global } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';
import { PrismaUserRepository } from './prisma/prisma-user.repository';
import { PrismaClientRepository } from './prisma/prisma-client.repository';
import { PrismaProductRepository } from './prisma/prisma-product.repository';
import { PrismaOrderRepository } from './prisma/prisma-order.repository';
import { PrismaClosingRepository } from './prisma/prisma-closing.repository';
import {
  USER_REPOSITORY_TOKEN,
  CLIENT_REPOSITORY_TOKEN,
  PRODUCT_REPOSITORY_TOKEN,
  ORDER_REPOSITORY_TOKEN,
  CLOSING_REPOSITORY_TOKEN,
} from '../../domain/repositories/tokens';

@Global()
@Module({
  providers: [
    PrismaService,
    {
      provide: USER_REPOSITORY_TOKEN,
      useClass: PrismaUserRepository,
    },
    {
      provide: CLIENT_REPOSITORY_TOKEN,
      useClass: PrismaClientRepository,
    },
    {
      provide: PRODUCT_REPOSITORY_TOKEN,
      useClass: PrismaProductRepository,
    },
    {
      provide: ORDER_REPOSITORY_TOKEN,
      useClass: PrismaOrderRepository,
    },
    {
      provide: CLOSING_REPOSITORY_TOKEN,
      useClass: PrismaClosingRepository,
    },
  ],
  exports: [
    PrismaService,
    USER_REPOSITORY_TOKEN,
    CLIENT_REPOSITORY_TOKEN,
    PRODUCT_REPOSITORY_TOKEN,
    ORDER_REPOSITORY_TOKEN,
    CLOSING_REPOSITORY_TOKEN,
  ],
})
export class PersistenceModule {}
