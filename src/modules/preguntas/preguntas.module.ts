import { Module } from '@nestjs/common';
import { PreguntasService } from './preguntas.service';
import { PreguntasController } from './preguntas.controller';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  controllers: [PreguntasController],
  providers: [PreguntasService, PrismaService],
})
export class PreguntasModule {}
