import { Module } from '@nestjs/common';
import { InicializacionService } from './inicializacion.service';
import { InicializacionController } from './inicializacion.controller';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  providers: [InicializacionService, PrismaService],
  controllers: [InicializacionController]
})
export class InicializacionModule {}
