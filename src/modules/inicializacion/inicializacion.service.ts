import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import * as bcryptjs from 'bcryptjs';

@Injectable()
export class InicializacionService {

    constructor(private prisma: PrismaService) { }

    async inicializacion(): Promise<any> {
  
      // 1) - Verificacion
      const verificacion = await this.prisma.usuarios.findMany();
      if (verificacion.length != 0) throw new NotFoundException('El sistema ya fue inicializado');
  
      // 2) - Se crea usuario administrador
      const data: any = {
        usuario: 'lmoreno',
        apellido: 'MORENO',
        nombre: 'LUCAS OMAR',
        dni: '34060398',
        email: 'ing.lucasmoreno@gmail.com',
        role: 'ADMIN_ROLE',
        activo: true
      }
  
      // Generacion de password encriptado
      const salt = bcryptjs.genSaltSync();
      data.password = bcryptjs.hashSync('craneo', salt);
  
      // Se crea y se almacena en la base de datos al usuario administrador    
      return await this.prisma.usuarios.create({ data })
  
    }  

}
