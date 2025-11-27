import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class ReportesService {
  constructor(private prisma: PrismaService) { }

  /**
   * Obtiene estadísticas completas de una encuesta
   */
  async obtenerEstadisticasCompletas(
    encuestaId: number,
    fechaInicio?: string,
    fechaFin?: string,
  ) {
    // Verificar que la encuesta existe
    const encuesta = await this.prisma.encuestas.findFirst({
      where: { id: encuestaId, activo: true },
    });

    if (!encuesta) {
      throw new NotFoundException('Encuesta no encontrada');
    }

    // Construir filtro de fechas
    const whereClause: any = { encuestaId, encuesta: { activo: true } };

    if (fechaInicio || fechaFin) {
      whereClause.createdAt = {};

      if (fechaInicio) {
        // Parsear la fecha en zona horaria local evitando conversión UTC
        const [year, month, day] = fechaInicio.split('-').map(Number);
        const inicio = new Date(year, month - 1, day, 0, 0, 0, 0);
        whereClause.createdAt.gte = inicio;
      }

      if (fechaFin) {
        // Parsear la fecha en zona horaria local evitando conversión UTC
        const [year, month, day] = fechaFin.split('-').map(Number);
        const fin = new Date(year, month - 1, day, 23, 59, 59, 999);
        whereClause.createdAt.lte = fin;
      }
    }

    // Ejecutar todas las consultas en paralelo para mejor rendimiento
    const [
      estadisticasGenerales,
      distribucionPreguntas,
      datosdemograficos,
      tendenciaTemporal,
    ] = await Promise.all([
      this.obtenerEstadisticasGenerales(whereClause),
      this.obtenerDistribucionPreguntas(encuestaId, whereClause),
      this.obtenerDatosDemograficos(whereClause),
      this.obtenerTendenciaTemporal(whereClause),
    ]);

    return {
      success: true,
      message: 'Estadísticas obtenidas correctamente',
      data: {
        encuesta: {
          id: encuesta.id,
          titulo: encuesta.titulo,
          descripcion: encuesta.descripcion,
          estado: encuesta.estado,
        },
        estadisticasGenerales,
        distribucionPreguntas,
        datosdemograficos,
        tendenciaTemporal,
        filtros: {
          fechaInicio: fechaInicio || null,
          fechaFin: fechaFin || null,
        },
      },
    };
  }

  /**
   * Estadísticas generales de la encuesta
   */
  private async obtenerEstadisticasGenerales(whereClause: any) {
    const [
      totalRespuestas,
      totalPreguntasRespondidas,
      totalPreguntas,
      promedioTiempo,
    ] = await Promise.all([
      // Total de encuestas respondidas
      this.prisma.encuestasRespondidas.count({ where: whereClause }),

      // Total de preguntas respondidas
      this.prisma.preguntasRespondidas.count({
        where: {
          encuestaId: whereClause.encuestaId,
          ...(whereClause.createdAt && { createdAt: whereClause.createdAt }),
        },
      }),

      // Total de preguntas en la encuesta
      this.prisma.preguntas.count({
        where: { encuestaId: whereClause.encuestaId, activo: true },
      }),

      // Promedio de tiempo entre primera y última respuesta
      this.calcularPromedioTiempo(whereClause),
    ]);

    // Calcular tasa de finalización
    const tasaFinalizacion =
      totalPreguntas > 0
        ? (totalPreguntasRespondidas / (totalRespuestas * totalPreguntas)) * 100
        : 0;

    // Promedio de respuestas por pregunta
    const promedioRespuestasPorPregunta =
      totalPreguntas > 0 ? totalPreguntasRespondidas / totalPreguntas : 0;

    return {
      totalRespuestas,
      totalPreguntasRespondidas,
      totalPreguntas,
      tasaFinalizacion: Math.round(tasaFinalizacion * 100) / 100,
      promedioRespuestasPorPregunta:
        Math.round(promedioRespuestasPorPregunta * 100) / 100,
      promedioTiempoCompletado: promedioTiempo,
    };
  }

  /**
   * Calcula el promedio de tiempo en completar la encuesta (en minutos)
   */
  private async calcularPromedioTiempo(whereClause: any) {
    const respuestas = await this.prisma.encuestasRespondidas.findMany({
      where: whereClause,
      include: {
        PreguntasRespondidas: {
          orderBy: { createdAt: 'asc' },
          select: { createdAt: true },
        },
      },
    });

    if (respuestas.length === 0) return 0;

    let totalTiempo = 0;
    let encuestasConTiempo = 0;

    respuestas.forEach((encuesta) => {
      const respuestasOrdenadas = encuesta.PreguntasRespondidas;
      if (respuestasOrdenadas.length > 1) {
        const primera = new Date(respuestasOrdenadas[0].createdAt).getTime();
        const ultima = new Date(
          respuestasOrdenadas[respuestasOrdenadas.length - 1].createdAt,
        ).getTime();
        const tiempoMinutos = (ultima - primera) / 1000 / 60;
        totalTiempo += tiempoMinutos;
        encuestasConTiempo++;
      }
    });

    return encuestasConTiempo > 0
      ? Math.round((totalTiempo / encuestasConTiempo) * 100) / 100
      : 0;
  }

  /**
   * Distribución de respuestas por pregunta
   */
  private async obtenerDistribucionPreguntas(
    encuestaId: number,
    whereClause: any,
  ) {
    const preguntas = await this.prisma.preguntas.findMany({
      where: { encuestaId, activo: true },
      include: {
        Respuestas: {
          where: { activo: true },
          orderBy: { orden: 'asc' },
        },
      },
      orderBy: { orden: 'asc' },
    });

    const distribucion = await Promise.all(
      preguntas.map(async (pregunta) => {
        const respuestasConVotos = await Promise.all(
          pregunta.Respuestas.map(async (respuesta) => {
            const totalVotos = await this.prisma.preguntasRespondidas.count({
              where: {
                encuestaId,
                preguntaId: pregunta.id,
                respuestaId: respuesta.id,
                ...(whereClause.createdAt && {
                  createdAt: whereClause.createdAt,
                }),
              },
            });

            return {
              id: respuesta.id,
              descripcion: respuesta.descripcion,
              orden: respuesta.orden,
              votos: totalVotos,
            };
          }),
        );

        // Calcular total de votos para esta pregunta
        const totalVotosPregunta = respuestasConVotos.reduce(
          (sum, r) => sum + r.votos,
          0,
        );

        // Agregar porcentajes y ordenar de mayor a menor
        const respuestasConPorcentajes = respuestasConVotos
          .map((resp) => ({
            ...resp,
            porcentaje:
              totalVotosPregunta > 0
                ? Math.round((resp.votos / totalVotosPregunta) * 10000) / 100
                : 0,
          }))
          .sort((a, b) => b.votos - a.votos);

        return {
          id: pregunta.id,
          descripcion: pregunta.descripcion,
          orden: pregunta.orden,
          multiplesRespuestas: pregunta.multiplesRespuestas,
          totalVotos: totalVotosPregunta,
          respuestas: respuestasConPorcentajes,
        };
      }),
    );

    return distribucion;
  }

  /**
   * Datos demográficos de los participantes
   */
  private async obtenerDatosDemograficos(whereClause: any) {
    // Obtener todos los datos demográficos
    const datosParticipantes =
      await this.prisma.personaEncuestaRespondida.findMany({
        where: {
          encuestaRespondida: whereClause,
          activo: true,
        },
        include: {
          barrio: true,
        },
      });

    if (datosParticipantes.length === 0) {
      return {
        totalParticipantes: 0,
        distribucionEdad: [],
        distribucionGenero: [],
        distribucionBarrio: [],
        sigem: { si: 0, no: 0, porcentajeSi: 0, porcentajeNo: 0 },
      };
    }

    const total = datosParticipantes.length;

    // Distribución por rango de edad
    const edades = datosParticipantes.reduce(
      (acc, p) => {
        const rango = p.rangoEdad || 'Sin especificar';
        acc[rango] = (acc[rango] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    const distribucionEdad = Object.entries(edades).map(([rango, cantidad]) => ({
      rango,
      cantidad,
      porcentaje: Math.round((cantidad / total) * 10000) / 100,
    }));

    // Distribución por género
    const generos = datosParticipantes.reduce(
      (acc, p) => {
        const genero = p.genero || 'Sin especificar';
        acc[genero] = (acc[genero] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    const distribucionGenero = Object.entries(generos).map(
      ([genero, cantidad]) => ({
        genero,
        cantidad,
        porcentaje: Math.round((cantidad / total) * 10000) / 100,
      }),
    );

    // Distribución por barrio
    const barrios = datosParticipantes.reduce(
      (acc, p) => {
        const nombreBarrio = p.barrio?.descripcion || 'Sin especificar';
        acc[nombreBarrio] = (acc[nombreBarrio] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    const distribucionBarrio = Object.entries(barrios)
      .map(([barrio, cantidad]) => ({
        barrio,
        cantidad,
        porcentaje: Math.round((cantidad / total) * 10000) / 100,
      }))
      .sort((a, b) => b.cantidad - a.cantidad);

    // Distribución SIGEM
    const sigemSi = datosParticipantes.filter((p) => p.sigem === true).length;
    const sigemNo = total - sigemSi;

    return {
      totalParticipantes: total,
      distribucionEdad: distribucionEdad.sort((a, b) => b.cantidad - a.cantidad),
      distribucionGenero: distribucionGenero.sort((a, b) => b.cantidad - a.cantidad),
      distribucionBarrio,
      sigem: {
        si: sigemSi,
        no: sigemNo,
        porcentajeSi: Math.round((sigemSi / total) * 10000) / 100,
        porcentajeNo: Math.round((sigemNo / total) * 10000) / 100,
      },
    };
  }

  /**
   * Tendencia temporal de respuestas
   */
  private async obtenerTendenciaTemporal(whereClause: any) {
    const respuestas = await this.prisma.encuestasRespondidas.findMany({
      where: whereClause,
      select: { createdAt: true },
      orderBy: { createdAt: 'asc' },
    });

    if (respuestas.length === 0) {
      return {
        respuestasPorDia: [],
        respuestasPorHora: [],
        primerRespuesta: null,
        ultimaRespuesta: null,
      };
    }

    // Agrupar por día
    const porDia = respuestas.reduce(
      (acc, r) => {
        const fecha = new Date(r.createdAt).toISOString().split('T')[0];
        acc[fecha] = (acc[fecha] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    const respuestasPorDia = Object.entries(porDia)
      .map(([fecha, cantidad]) => ({ fecha, cantidad }))
      .sort((a, b) => a.fecha.localeCompare(b.fecha));

    // Agrupar por hora del día (0-23)
    const porHora = respuestas.reduce(
      (acc, r) => {
        const hora = new Date(r.createdAt).getHours();
        acc[hora] = (acc[hora] || 0) + 1;
        return acc;
      },
      {} as Record<number, number>,
    );

    const respuestasPorHora = Array.from({ length: 24 }, (_, hora) => ({
      hora,
      cantidad: porHora[hora] || 0,
    }));

    return {
      respuestasPorDia,
      respuestasPorHora,
      primerRespuesta: respuestas[0].createdAt,
      ultimaRespuesta: respuestas[respuestas.length - 1].createdAt,
    };
  }

  /**
   * Resumen ejecutivo - estadísticas principales de forma compacta
   */
  async obtenerResumenEjecutivo(encuestaId: number) {
    const encuesta = await this.prisma.encuestas.findFirst({
      where: { id: encuestaId, activo: true },
    });

    if (!encuesta) {
      throw new NotFoundException('Encuesta no encontrada');
    }

    const whereClause = { encuestaId, encuesta: { activo: true } };

    const [totalRespuestas, totalPreguntas, datosParticipantes] =
      await Promise.all([
        this.prisma.encuestasRespondidas.count({ where: whereClause }),
        this.prisma.preguntas.count({
          where: { encuestaId, activo: true },
        }),
        this.prisma.personaEncuestaRespondida.count({
          where: {
            encuestaRespondida: whereClause,
            activo: true,
          },
        }),
      ]);

    return {
      success: true,
      message: 'Resumen obtenido correctamente',
      data: {
        encuesta: {
          id: encuesta.id,
          titulo: encuesta.titulo,
          estado: encuesta.estado,
        },
        resumen: {
          totalRespuestas,
          totalPreguntas,
          totalParticipantes: datosParticipantes,
        },
      },
    };
  }
}
