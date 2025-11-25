import { Injectable, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsuariosService } from '../usuarios/usuarios.service';
import * as bcryptjs from 'bcryptjs';

@Injectable()
export class AuthService {

  constructor(
    private usuarioService: UsuariosService,
    private jwtService: JwtService,
  ) { }

  // Validar usuario
  async validateUser(username: string, pass: string): Promise<any> {
    const user = await this.usuarioService.getUsuarioPorNombre(username);
    if (!user) throw new NotFoundException('Datos incorrectos'); // El usuario no coincide
    const validPassword = bcryptjs.compareSync(pass, user.password);
    if (user && validPassword) {
      const { password, ...result } = user;
      return result;
    }
    throw new NotFoundException('Datos incorrectos'); // El password no coincide
  }

  // Login
  async login(user: any) {

    // Se genera el arreglo de permisos
    // let permisos: any = [];
    // user.permisos.map( permiso => {permisos.push( permiso.permiso )});

    const payload = {
      userId: user.id,
      usuario: user.usuario,
      dni: user.dni,
      email: user.email,
      apellido: user.apellido,
      nombre: user.nombre,
      // permisos: permisos,
      role: user.role
    };

    return {
      token: this.jwtService.sign(payload),
      usuario: payload
    }
    
  }

}
