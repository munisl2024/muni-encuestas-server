import { Module } from '@nestjs/common';
import { RespuestasService } from './respuestas.service';
import { RespuestasController } from './respuestas.controller';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  controllers: [RespuestasController],
  providers: [RespuestasService, PrismaService],
})
export class RespuestasModule {}
