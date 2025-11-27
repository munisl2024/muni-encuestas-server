import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
  Res,
  Header,
} from '@nestjs/common';
import { Response } from 'express';
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

  /**
   * GET /api/reportes/encuesta/:id/pdf
   * Genera y descarga un PDF con el reporte completo de la encuesta
   * Query params: fechaInicio, fechaFin (formato: YYYY-MM-DD)
   */
  @Get('encuesta/:id/pdf')
  @Header('Content-Type', 'application/pdf')
  async generarPDFReporte(
    @Res() res: Response,
    @Param('id', ParseIntPipe) id: number,
    @Query('fechaInicio') fechaInicio?: string,
    @Query('fechaFin') fechaFin?: string,
  ) {
    const pdfBuffer = await this.reportesService.generarPDFReporte(
      id,
      fechaInicio,
      fechaFin,
    );

    // Construir nombre del archivo
    const timestamp = new Date().toISOString().split('T')[0];
    const fileName = `reporte-encuesta-${id}-${timestamp}.pdf`;

    // Configurar headers para descarga
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Length', pdfBuffer.length);

    // Enviar el buffer
    res.send(pdfBuffer);
  }
}
