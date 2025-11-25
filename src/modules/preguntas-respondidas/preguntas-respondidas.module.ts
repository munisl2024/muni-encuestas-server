import { Module } from '@nestjs/common';
import { PreguntasRespondidasService } from './preguntas-respondidas.service';
import { PreguntasRespondidasController } from './preguntas-respondidas.controller';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  controllers: [PreguntasRespondidasController],
  providers: [PreguntasRespondidasService, PrismaService],
})
export class PreguntasRespondidasModule {}
