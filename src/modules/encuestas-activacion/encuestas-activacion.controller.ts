import { Body, Controller, Delete, Get, HttpStatus, Param, Patch, Post, Res, UseGuards } from '@nestjs/common';
import { EncuestasActivacionService } from './encuestas-activacion.service';
import { Prisma } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('encuestas-activacion')
export class EncuestasActivacionController {

  constructor(private readonly encuestasActivacionService: EncuestasActivacionService) { }

  // Obtener programaciones de una encuesta
  @UseGuards(JwtAuthGuard)
  @Get('encuesta/:encuestaId')
  async getByEncuesta(@Res() res, @Param('encuestaId') encuestaId: number): Promise<any> {
    const programaciones = await this.encuestasActivacionService.getByEncuesta(encuestaId);

    return res.status(HttpStatus.OK).json({
      success: true,
      message: 'Programaciones obtenidas correctamente',
      programaciones
    });
  }

  // Obtener programación por ID
  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async getId(@Res() res, @Param('id') id: number): Promise<any> {
    const programacion = await this.encuestasActivacionService.getId(id);

    return res.status(HttpStatus.OK).json({
      success: true,
      message: 'Programación obtenida correctamente',
      programacion
    });
  }

  // Crear programación
  @UseGuards(JwtAuthGuard)
  @Post()
  async insert(@Res() res, @Body() createData: Prisma.EncuestasActivacionCreateInput): Promise<any> {
    const programacion = await this.encuestasActivacionService.insert(createData);

    return res.status(HttpStatus.CREATED).json({
      success: true,
      message: 'Programación creada correctamente',
      programacion
    });
  }

  // Actualizar programación
  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  async update(@Res() res, @Param('id') id: number, @Body() dataUpdate: Prisma.EncuestasActivacionUpdateInput) {
    const programacion = await this.encuestasActivacionService.update(id, dataUpdate);

    return res.status(HttpStatus.OK).json({
      success: true,
      message: 'Programación actualizada correctamente',
      programacion
    });
  }

  // Eliminar programación
  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async delete(@Res() res, @Param('id') id: number): Promise<any> {
    await this.encuestasActivacionService.delete(id);
    return res.status(HttpStatus.OK).json({
      success: true,
      message: 'Programación eliminada correctamente'
    });
  }

  // Verificar estados manualmente
  @UseGuards(JwtAuthGuard)
  @Post('verificar')
  async verificarAhora(@Res() res): Promise<any> {
    const result = await this.encuestasActivacionService.verificarAhora();
    return res.status(HttpStatus.OK).json({
      success: true,
      ...result
    });
  }

}
