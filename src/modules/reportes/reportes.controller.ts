import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { ReportesService } from './reportes.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('reportes')
@UseGuards(JwtAuthGuard)
export class ReportesController {
  constructor(private readonly reportesService: ReportesService) {}

  /**
   * GET /api/reportes/encuesta/:id/completo
   * Obtiene todas las estadísticas de una encuesta con filtros opcionales de fecha
   * Query params: fechaInicio, fechaFin (formato: YYYY-MM-DD)
   */
  @Get('encuesta/:id/completo')
  async obtenerEstadisticasCompletas(
    @Param('id', ParseIntPipe) id: number,
    @Query('fechaInicio') fechaInicio?: string,
    @Query('fechaFin') fechaFin?: string,
  ) {
    return this.reportesService.obtenerEstadisticasCompletas(
      id,
      fechaInicio,
      fechaFin,
    );
  }

  /**
   * GET /api/reportes/encuesta/:id/resumen
   * Obtiene un resumen ejecutivo con las métricas principales
   */
  @Get('encuesta/:id/resumen')
  async obtenerResumenEjecutivo(@Param('id', ParseIntPipe) id: number) {
    return this.reportesService.obtenerResumenEjecutivo(id);
  }
}
