import { Module } from '@nestjs/common';
import { EncuestasActivacionController } from './encuestas-activacion.controller';
import { EncuestasActivacionService } from './encuestas-activacion.service';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  controllers: [EncuestasActivacionController],
  providers: [EncuestasActivacionService, PrismaService],
  exports: [EncuestasActivacionService]
})
export class EncuestasActivacionModule { }
