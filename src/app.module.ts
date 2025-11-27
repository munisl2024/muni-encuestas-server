import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { WebsocketModule } from './websocket/websocket.module';
import { PrismaService } from './prisma/prisma.service';
import { InicializacionModule } from './modules/inicializacion/inicializacion.module';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { ScheduleModule } from '@nestjs/schedule';
import { join } from 'path';
import { AuthModule } from './modules/auth/auth.module';
import { UsuariosModule } from './modules/usuarios/usuarios.module';
import { EncuestasModule } from './modules/encuestas/encuestas.module';
import { PreguntasModule } from './modules/preguntas/preguntas.module';
import { RespuestasModule } from './modules/respuestas/respuestas.module';
import { PreguntasRespondidasModule } from './modules/preguntas-respondidas/preguntas-respondidas.module';
import { EncuestasActivacionModule } from './modules/encuestas-activacion/encuestas-activacion.module';
import { BarriosModule } from './modules/barrios/barrios.module';
import { ReportesModule } from './modules/reportes/reportes.module';

@Module({
  imports: [

    // Directorio de archivos estáticos
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'public/browser'),
    }),

    // Variables de entorno
    ConfigModule.forRoot({
      envFilePath: '.env', // Especifica la ruta al archivo .env
      isGlobal: true
    }),

    // Cron jobs y tareas programadas
    ScheduleModule.forRoot(),

    WebsocketModule,
    InicializacionModule,
    AuthModule,
    UsuariosModule,
    EncuestasModule,
    PreguntasModule,
    RespuestasModule,
    PreguntasRespondidasModule,
    EncuestasActivacionModule,
    BarriosModule,
    ReportesModule,
  ],
  controllers: [AppController],
  providers: [AppService, PrismaService],
})
export class AppModule { }
