import { Body, Controller, Get, HttpStatus, Param, Patch, Post, Query, Res, UseGuards } from '@nestjs/common';
import { UsuariosService } from './usuarios.service';
import * as bcryptjs from 'bcryptjs';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Prisma } from '@prisma/client';

@Controller('usuarios')
export class UsuariosController {

  constructor(private readonly usuariosService: UsuariosService){}

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async getUsuario(@Res() res, @Param('id') id: number): Promise<any> {

    const usuario = await this.usuariosService.getUsuario(id);

    return res.status(HttpStatus.OK).json({
      success: true,
      message: 'Usuario obtenido correctamente',
      usuario      
    })

  }

  @UseGuards(JwtAuthGuard)
  @Get()
  async listarUsuarios(@Res() res, @Query() query): Promise<any> {
    const usuarios = await this.usuariosService.listarUsuarios(query);

    return res.status(HttpStatus.OK).json({
      success: true,
      message: 'Usuarios obtenidos correctamente',
      usuarios     
    })

  }

//   @UseGuards(JwtAuthGuard)
  @Post()
  async createUsuario(@Res() res, @Body() createData: Prisma.UsuariosCreateInput): Promise<any> {

    const { password } = createData;

    // Encriptado de password
    const salt = bcryptjs.genSaltSync();
    createData.password = bcryptjs.hashSync(password, salt);

    const usuario = await this.usuariosService.crearUsuario(createData);

    return res.status(HttpStatus.CREATED).json({
      success: true,
      message: 'Usuario creado correctamente',
      usuario
    })
  
  }

//   @UseGuards(JwtAuthGuard)
  @Patch(':id')
  async actualizarUsuario(@Res() res, @Param('id') id: number, @Body() dataUpdate: Prisma.UsuariosUpdateInput){

    const { password } = dataUpdate;

    // Se encripta el password en caso de que se tenga que actualizar
    if(password){
      const salt = bcryptjs.genSaltSync();
      dataUpdate.password = bcryptjs.hashSync(password?.toString(), salt);
    }

    const usuario = await this.usuariosService.actualizarUsuario(id, dataUpdate);

    res.status(HttpStatus.OK).json({
      success: true,
      message: 'Usuario actualizado correctamente',
      usuario
    })

  }

//   @UseGuards(JwtAuthGuard)
  @Patch('/password/:id')
  async actualizarPassword(@Res() res, @Param('id') id: number, @Body() dataChangePassword: any){

    await this.usuariosService.actualizarPasswordPerfil(id, dataChangePassword);

    res.status(HttpStatus.OK).json({
      success: true,
      message: 'Password actualizado correctamente',
    })

  }

  @Get('/excel/exportar')
  async exportarUsuarios(@Res() res, @Query() query): Promise<any> {
    const buffer = await this.usuariosService.exportarUsuarios(query);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats');
    res.setHeader('Content-Disposition', 'attachment; filename=usuarios.xlsx');
    res.send(buffer);
  }

}
