import { Module } from '@nestjs/common';
import { EncuestasService } from './encuestas.service';
import { EncuestasController } from './encuestas.controller';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  controllers: [EncuestasController],
  providers: [EncuestasService, PrismaService],
})
export class EncuestasModule {}
