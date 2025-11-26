import { Body, Controller, Delete, Get, HttpStatus, Param, Patch, Post, Query, Res, UseGuards } from '@nestjs/common';
import { EncuestasService } from './encuestas.service';
import { Prisma } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('encuestas')
export class EncuestasController {

  constructor(private readonly encuestasService: EncuestasService){}

  @UseGuards(JwtAuthGuard)
  @Get()
  async getAll(@Res() res, @Query() query): Promise<any> {

    const { encuestas, totalItems } = await this.encuestasService.getAll(query);

    return res.status(HttpStatus.OK).json({
      success: true,
      message: 'Encuestas obtenidas correctamente',
      encuestas,
      totalItems
    })

  }

  // Listar encuestas asignadas a un usuario
  @UseGuards(JwtAuthGuard)
  @Get('usuario/:usuarioId')
  async getEncuestasAsignadas(@Res() res, @Param('usuarioId') usuarioId: number): Promise<any> {
    const encuestas = await this.encuestasService.getEncuestasAsignadas(Number(usuarioId));
    return res.status(HttpStatus.OK).json({
      success: true,
      message: 'Encuestas asignadas obtenidas correctamente',
      encuestas
    })
  }

  // Obtener estadísticas generales de una encuesta
  @UseGuards(JwtAuthGuard)
  @Get(':id/estadisticas')
  async getEstadisticas(
    @Res() res,
    @Param('id') id: number,
    @Query('fechaInicio') fechaInicio?: string,
    @Query('fechaFin') fechaFin?: string,
    @Query('encuestadorId') encuestadorId?: number
  ): Promise<any> {
    const data = await this.encuestasService.getEstadisticas(id, fechaInicio, fechaFin);
    return res.status(HttpStatus.OK).json({
      success: true,
      message: 'Estadísticas obtenidas correctamente',
      ...data
    })
  }

  // Obtener distribución de respuestas por pregunta
  @UseGuards(JwtAuthGuard)
  @Get(':id/distribucion')
  async getDistribucionRespuestas(
    @Res() res,
    @Param('id') id: number,
    @Query('fechaInicio') fechaInicio?: string,
    @Query('fechaFin') fechaFin?: string,
    @Query('encuestadorId') encuestadorId?: number
  ): Promise<any> {
    const data = await this.encuestasService.getDistribucionRespuestas(id, fechaInicio, fechaFin);
    return res.status(HttpStatus.OK).json({
      success: true,
      message: 'Distribución de respuestas obtenida correctamente',
      ...data
    })
  }

  // Obtener reporte detallado de la encuesta
  @UseGuards(JwtAuthGuard)
  @Get(':id/reporte')
  async getReporteDetallado(
    @Res() res,
    @Param('id') id: number,
    @Query('fechaInicio') fechaInicio?: string,
    @Query('fechaFin') fechaFin?: string,
  ): Promise<any> {
    const data = await this.encuestasService.getReporteDetallado(id, fechaInicio, fechaFin);
    return res.status(HttpStatus.OK).json({
      success: true,
      message: 'Reporte detallado obtenido correctamente',
      ...data
    })
  }

  // Obtener resumen completo para exportación
  @UseGuards(JwtAuthGuard)
  @Get(':id/resumen')
  async getResumenExportacion(@Res() res, @Param('id') id: number): Promise<any> {
    const data = await this.encuestasService.getResumenExportacion(id);
    return res.status(HttpStatus.OK).json({
      success: true,
      message: 'Resumen obtenido correctamente',
      ...data
    })
  }

  // Asignar usuario a encuesta
  @UseGuards(JwtAuthGuard)
  @Post(':id/usuarios')
  async asignarUsuario(
    @Res() res,
    @Param('id') encuestaId: number,
    @Body('usuarioId') usuarioId: number
  ): Promise<any> {
    const asignacion = await this.encuestasService.asignarUsuario(Number(encuestaId), Number(usuarioId));
    return res.status(HttpStatus.CREATED).json({
      success: true,
      message: 'Usuario asignado a la encuesta correctamente',
      asignacion
    })
  }

  // Remover usuario de encuesta
  @UseGuards(JwtAuthGuard)
  @Delete(':id/usuarios/:usuarioId')
  async removerUsuario(
    @Res() res,
    @Param('id') encuestaId: number,
    @Param('usuarioId') usuarioId: number
  ): Promise<any> {
    await this.encuestasService.removerUsuario(Number(encuestaId), Number(usuarioId));
    return res.status(HttpStatus.OK).json({
      success: true,
      message: 'Usuario removido de la encuesta correctamente'
    })
  }

  // Listar usuarios asignados a una encuesta
  @UseGuards(JwtAuthGuard)
  @Get(':id/usuarios')
  async getUsuariosAsignados(@Res() res, @Param('id') encuestaId: number): Promise<any> {
    const usuarios = await this.encuestasService.getUsuariosAsignados(Number(encuestaId));
    return res.status(HttpStatus.OK).json({
      success: true,
      message: 'Usuarios asignados obtenidos correctamente',
      usuarios
    })
  }

  // Responder encuesta completa
  @UseGuards(JwtAuthGuard)
  @Post(':id/responder')
  async responderEncuesta(
    @Res() res,
    @Param('id') encuestaId: number,
    @Body() body: {
      usuarioId: number;
      respuestas: Array<{ preguntaId: number; respuestaId: number }>;
      datosPersonales?: { email: string; sigem: boolean; genero: string; telefono: string; rangoEdad: string; barrioId: number };
    }
  ): Promise<any> {
    
    const encuestaRespondida = await this.encuestasService.responderEncuesta(
      Number(encuestaId),
      Number(body.usuarioId),
      body.respuestas,
      body.datosPersonales
    );

    return res.status(HttpStatus.CREATED).json({
      success: true,
      message: 'Encuesta respondida correctamente',
      encuestaRespondida
    })
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async getId(@Res() res, @Param('id') id: number): Promise<any> {

    const encuesta = await this.encuestasService.getId(id);

    return res.status(HttpStatus.OK).json({
      success: true,
      message: 'Encuesta obtenida correctamente',
      encuesta
    })

  }

  @UseGuards(JwtAuthGuard)
  @Post()
  async insert(@Res() res, @Body() createData: Prisma.EncuestasCreateInput): Promise<any> {

    const encuesta = await this.encuestasService.insert(createData);

    return res.status(HttpStatus.CREATED).json({
      success: true,
      message: 'Encuesta creada correctamente',
      encuesta
    })
  
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  async update(@Res() res, @Param('id') id: number, @Body() dataUpdate: Prisma.EncuestasUpdateInput){

    const encuesta = await this.encuestasService.update(id, dataUpdate);

    return res.status(HttpStatus.OK).json({
      success: true,
      message: 'Encuesta actualizada correctamente',
      encuesta
    })

  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async delete(@Res() res, @Param('id') id: number): Promise<any> {
    await this.encuestasService.delete(id);
    return res.status(HttpStatus.OK).json({
      success: true,
      message: 'Encuesta eliminada correctamente'
    })
  }

}
