import { Body, Controller, Get, HttpStatus, Param, Patch, Post, Query, Res, UseGuards } from '@nestjs/common';
import { BarriosService } from './barrios.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('barrios')
export class BarriosController {

  constructor(private readonly barriosService: BarriosService) {}

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async getId(@Res() res, @Param('id') id: number): Promise<any> {
    const barrio = await this.barriosService.getId(id);

    return res.status(HttpStatus.OK).json({
      success: true,
      message: 'Barrio obtenido correctamente',
      barrio,
    });
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id/coordenadas')
  async getIdConCoordenadas(@Res() res, @Param('id') id: number): Promise<any> {
    const barrio = await this.barriosService.getIdConCoordenadas(id);

    return res.status(HttpStatus.OK).json({
      success: true,
      message: 'Barrio con coordenadas obtenido correctamente',
      barrio,
    });
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  async getAll(@Res() res, @Query() query): Promise<any> {
    const { barrios, totalItems } = await this.barriosService.getAll(query);

    return res.status(HttpStatus.OK).json({
      success: true,
      message: 'Barrios obtenidos correctamente',
      barrios,
      totalItems,
    });
  }

  @UseGuards(JwtAuthGuard)
  @Get('mapa/coordenadas/general')
  async getAllConCoordenadas(@Res() res): Promise<any> {
    const barrios = await this.barriosService.getAllConCoordenadas();

    return res.status(HttpStatus.OK).json({
      success: true,
      message: 'Barrios con coordenadas obtenidos correctamente',
      barrios,
    });
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  async insert(
    @Res() res,
    @Body()
    createData: {
      descripcion: string;
      activo?: boolean;
      coordenadas: any[];
      creatorUserId: number;
    },
  ): Promise<any> {
    const barrio = await this.barriosService.insert(createData);
    return res.status(HttpStatus.CREATED).json({
      success: true,
      message: 'Barrio creado correctamente',
      barrio,
    });
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  async update(
    @Res() res,
    @Param('id') id: number,
    @Body() dataUpdate: { descripcion?: string; activo?: boolean },
  ) {
    const barrio = await this.barriosService.update(id, dataUpdate);

    res.status(HttpStatus.OK).json({
      success: true,
      message: 'Barrio actualizado correctamente',
      barrio,
    });
  }

  @UseGuards(JwtAuthGuard)
  @Patch('coordenadas/:id')
  async actualizarCoordenadas(
    @Res() res,
    @Param('id') id: number,
    @Body() body: { coordenadas: any },
  ) {
    await this.barriosService.actualizarCoordenadas(id, body.coordenadas);

    res.status(HttpStatus.OK).json({
      success: true,
      message: 'Coordenadas actualizadas correctamente',
    });
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/estado')
  async updateEstado(
    @Res() res,
    @Param('id') id: number,
    @Body() body: { activo: boolean },
  ) {
    const barrio = await this.barriosService.updateEstado(id, body.activo);

    res.status(HttpStatus.OK).json({
      success: true,
      message: `Barrio ${body.activo ? 'activado' : 'desactivado'} correctamente`,
      barrio,
    });
  }

  @UseGuards(JwtAuthGuard)
  @Post('importar-kml')
  async importarKml(
    @Res() res,
    @Body() body: { kmlData: string },
  ): Promise<any> {
    try {
      // Obtener el ID del usuario desde el token JWT
      const creatorUserId = res.locals.user?.id || 1; // Fallback a 1 si no hay usuario

      const resultado = await this.barriosService.importarKml(
        body.kmlData,
        creatorUserId,
      );

      return res.status(HttpStatus.OK).json({
        success: true,
        message: 'KML importado correctamente',
        resultado,
      });
    } catch (error) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: 'Error al importar KML',
        error: error.message,
      });
    }
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/eliminar')
  async delete(@Res() res, @Param('id') id: number): Promise<any> {
    const barrio = await this.barriosService.delete(id);

    return res.status(HttpStatus.OK).json({
      success: true,
      message: 'Barrio eliminado correctamente',
      barrio,
    });
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/reactivar')
  async reactivar(@Res() res, @Param('id') id: number): Promise<any> {
    const barrio = await this.barriosService.reactivar(id);

    return res.status(HttpStatus.OK).json({
      success: true,
      message: 'Barrio reactivado correctamente',
      barrio,
    });
  }

}
