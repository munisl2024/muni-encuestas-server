import { Module } from '@nestjs/common';
import { BarriosService } from './barrios.service';
import { BarriosController } from './barrios.controller';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  controllers: [BarriosController],
  providers: [BarriosService, PrismaService],
})
export class BarriosModule {}
