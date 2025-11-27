import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import PdfPrinter = require('pdfmake');
import { TDocumentDefinitions } from 'pdfmake/interfaces';

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

  /**
   * Genera un PDF con el reporte completo de la encuesta
   */
  async generarPDFReporte(
    encuestaId: number,
    fechaInicio?: string,
    fechaFin?: string,
  ): Promise<Buffer> {
    // Obtener todas las estadísticas
    const resultado = await this.obtenerEstadisticasCompletas(
      encuestaId,
      fechaInicio,
      fechaFin,
    );

    const { data } = resultado;
    const {
      encuesta,
      estadisticasGenerales,
      distribucionPreguntas,
      datosdemograficos,
      tendenciaTemporal,
      filtros,
    } = data;

    // Configurar fuentes para pdfmake
    const fonts = {
      Roboto: {
        normal: 'Helvetica',
        bold: 'Helvetica-Bold',
        italics: 'Helvetica-Oblique',
        bolditalics: 'Helvetica-BoldOblique',
      },
    };

    // Definir el documento PDF
    const docDefinition: any = {
      content: [
        // Encabezado con banner
        {
          canvas: [
            {
              type: 'rect',
              x: 0,
              y: 0,
              w: 515,
              h: 100,
              linearGradient: ['#667EEA', '#764BA2'],
            },
          ],
          absolutePosition: { x: 40, y: 40 },
        },
        {
          text: 'REPORTE DE ENCUESTA',
          style: 'header',
          alignment: 'center',
          color: 'white',
          margin: [0, 50, 0, 5],
        },
        {
          text: encuesta.titulo.toUpperCase(),
          style: 'titleEncuesta',
          alignment: 'center',
          color: 'white',
          margin: [0, 0, 0, 15],
        },

        // Filtros aplicados
        ...(filtros.fechaInicio || filtros.fechaFin
          ? [
              {
                table: {
                  widths: ['*'],
                  body: [
                    [
                      {
                        text: [
                          {
                            text: 'Período del reporte: ',
                            style: 'subsectionHeader',
                          },
                          {
                            text: `${filtros.fechaInicio || '...'} al ${filtros.fechaFin || '...'}`,
                            style: 'normalText',
                          },
                        ],
                        fillColor: '#F3F4F6',
                        margin: [10, 10, 10, 10],
                      },
                    ],
                  ],
                },
                layout: {
                  hLineWidth: () => 0,
                  vLineWidth: () => 0,
                },
                margin: [0, 0, 0, 20],
              },
            ]
          : []),

        // Estadísticas Generales
        {
          text: 'ESTADÍSTICAS GENERALES',
          style: 'sectionHeader',
          margin: [0, 0, 0, 15],
        },
        // Tarjetas de métricas principales (3 columnas)
        {
          columns: [
            {
              width: '*',
              table: {
                widths: ['*'],
                body: [
                  [
                    {
                      stack: [
                        {
                          text: estadisticasGenerales.totalRespuestas.toString(),
                          style: 'metricNumber',
                          color: '#3B82F6',
                        },
                        {
                          text: 'Encuestas Respondidas',
                          style: 'metricLabel',
                        },
                      ],
                      fillColor: '#EFF6FF',
                      margin: [10, 15, 10, 15],
                      alignment: 'center',
                    },
                  ],
                ],
              },
              layout: {
                hLineWidth: () => 1,
                vLineWidth: () => 1,
                hLineColor: () => '#3B82F6',
                vLineColor: () => '#3B82F6',
              },
            },
            {
              width: '*',
              table: {
                widths: ['*'],
                body: [
                  [
                    {
                      stack: [
                        {
                          text: estadisticasGenerales.totalPreguntas.toString(),
                          style: 'metricNumber',
                          color: '#10B981',
                        },
                        {
                          text: 'Total Preguntas',
                          style: 'metricLabel',
                        },
                      ],
                      fillColor: '#ECFDF5',
                      margin: [10, 15, 10, 15],
                      alignment: 'center',
                    },
                  ],
                ],
              },
              layout: {
                hLineWidth: () => 1,
                vLineWidth: () => 1,
                hLineColor: () => '#10B981',
                vLineColor: () => '#10B981',
              },
            },
            {
              width: '*',
              table: {
                widths: ['*'],
                body: [
                  [
                    {
                      stack: [
                        {
                          text: estadisticasGenerales.totalPreguntasRespondidas.toString(),
                          style: 'metricNumber',
                          color: '#F59E0B',
                        },
                        {
                          text: 'Preguntas Respondidas',
                          style: 'metricLabel',
                        },
                      ],
                      fillColor: '#FFFBEB',
                      margin: [10, 15, 10, 15],
                      alignment: 'center',
                    },
                  ],
                ],
              },
              layout: {
                hLineWidth: () => 1,
                vLineWidth: () => 1,
                hLineColor: () => '#F59E0B',
                vLineColor: () => '#F59E0B',
              },
            },
          ],
          columnGap: 10,
          margin: [0, 0, 0, 15],
        },

        // Datos Demográficos
        {
          text: 'DATOS DEMOGRÁFICOS',
          style: 'sectionHeader',
          pageBreak: 'before',
          margin: [0, 0, 0, 10],
        },
        {
          table: {
            widths: ['*'],
            body: [
              [
                {
                  text: `Total de Participantes: ${datosdemograficos.totalParticipantes}`,
                  style: 'subsectionHeader',
                  fillColor: '#EFF6FF',
                  color: '#1E40AF',
                  margin: [10, 10, 10, 10],
                  alignment: 'center',
                },
              ],
            ],
          },
          layout: 'noBorders',
          margin: [0, 0, 0, 15],
        },

        // Distribución por Género
        {
          text: 'Distribución por Género',
          style: 'subsectionHeader',
          margin: [0, 5, 0, 8],
        },
        {
          table: {
            widths: ['*', 'auto', 'auto'],
            headerRows: 1,
            body: [
              [
                {
                  text: 'Género',
                  style: 'tableHeader',
                  fillColor: '#10B981',
                  color: 'white',
                },
                {
                  text: 'Cantidad',
                  style: 'tableHeader',
                  fillColor: '#10B981',
                  color: 'white',
                },
                {
                  text: 'Porcentaje',
                  style: 'tableHeader',
                  fillColor: '#10B981',
                  color: 'white',
                },
              ],
              ...datosdemograficos.distribucionGenero.map((g) => [
                g.genero,
                { text: g.cantidad.toString(), alignment: 'center' },
                { text: `${g.porcentaje}%`, alignment: 'center', bold: true },
              ]),
            ],
          },
          layout: {
            hLineWidth: (i, node) => (i === 0 || i === node.table.body.length ? 0 : 1),
            vLineWidth: () => 0,
            hLineColor: () => '#E5E7EB',
            paddingLeft: () => 10,
            paddingRight: () => 10,
            paddingTop: () => 8,
            paddingBottom: () => 8,
          },
          margin: [0, 0, 0, 15],
        },

        // Distribución por Edad
        {
          text: 'Distribución por Rango de Edad',
          style: 'subsectionHeader',
          margin: [0, 5, 0, 8],
        },
        {
          table: {
            widths: ['*', 'auto', 'auto'],
            headerRows: 1,
            body: [
              [
                {
                  text: 'Rango de Edad',
                  style: 'tableHeader',
                  fillColor: '#F59E0B',
                  color: 'white',
                },
                {
                  text: 'Cantidad',
                  style: 'tableHeader',
                  fillColor: '#F59E0B',
                  color: 'white',
                },
                {
                  text: 'Porcentaje',
                  style: 'tableHeader',
                  fillColor: '#F59E0B',
                  color: 'white',
                },
              ],
              ...datosdemograficos.distribucionEdad.map((e) => [
                e.rango,
                { text: e.cantidad.toString(), alignment: 'center' },
                { text: `${e.porcentaje}%`, alignment: 'center', bold: true },
              ]),
            ],
          },
          layout: {
            hLineWidth: (i, node) => (i === 0 || i === node.table.body.length ? 0 : 1),
            vLineWidth: () => 0,
            hLineColor: () => '#E5E7EB',
            paddingLeft: () => 10,
            paddingRight: () => 10,
            paddingTop: () => 8,
            paddingBottom: () => 8,
          },
          margin: [0, 0, 0, 15],
        },

        // SIGEM
        {
          text: 'Distribución SIGEM',
          style: 'subsectionHeader',
          margin: [0, 5, 0, 8],
        },
        {
          table: {
            widths: ['*', 'auto', 'auto'],
            headerRows: 1,
            body: [
              [
                {
                  text: 'SIGEM',
                  style: 'tableHeader',
                  fillColor: '#8B5CF6',
                  color: 'white',
                },
                {
                  text: 'Cantidad',
                  style: 'tableHeader',
                  fillColor: '#8B5CF6',
                  color: 'white',
                },
                {
                  text: 'Porcentaje',
                  style: 'tableHeader',
                  fillColor: '#8B5CF6',
                  color: 'white',
                },
              ],
              [
                'Sí',
                { text: datosdemograficos.sigem.si.toString(), alignment: 'center' },
                {
                  text: `${datosdemograficos.sigem.porcentajeSi}%`,
                  alignment: 'center',
                  bold: true,
                },
              ],
              [
                'No',
                { text: datosdemograficos.sigem.no.toString(), alignment: 'center' },
                {
                  text: `${datosdemograficos.sigem.porcentajeNo}%`,
                  alignment: 'center',
                  bold: true,
                },
              ],
            ],
          },
          layout: {
            hLineWidth: (i, node) => (i === 0 || i === node.table.body.length ? 0 : 1),
            vLineWidth: () => 0,
            hLineColor: () => '#E5E7EB',
            paddingLeft: () => 10,
            paddingRight: () => 10,
            paddingTop: () => 8,
            paddingBottom: () => 8,
          },
          margin: [0, 0, 0, 20],
        },

        // Distribución de Respuestas por Pregunta
        {
          text: 'DISTRIBUCIÓN DE RESPUESTAS POR PREGUNTA',
          style: 'sectionHeader',
          pageBreak: 'before',
          margin: [0, 0, 0, 15],
        },
        ...distribucionPreguntas.flatMap((pregunta, index) => [
          {
            table: {
              widths: ['*'],
              body: [
                [
                  {
                    text: `Pregunta ${pregunta.orden}: ${pregunta.descripcion}`,
                    style: 'subsectionHeader',
                    fillColor: '#F3F4F6',
                    color: '#374151',
                    margin: [10, 10, 10, 5],
                  },
                ],
                [
                  {
                    text: `Total de votos: ${pregunta.totalVotos}`,
                    fontSize: 9,
                    color: '#6B7280',
                    margin: [10, 5, 10, 10],
                  },
                ],
              ],
            },
            layout: 'noBorders',
            margin: [0, index > 0 ? 10 : 0, 0, 8],
          },
          {
            table: {
              widths: ['*', 'auto', 'auto'],
              headerRows: 1,
              body: [
                [
                  {
                    text: 'Respuesta',
                    style: 'tableHeader',
                    fillColor: '#3B82F6',
                    color: 'white',
                  },
                  {
                    text: 'Votos',
                    style: 'tableHeader',
                    fillColor: '#3B82F6',
                    color: 'white',
                  },
                  {
                    text: 'Porcentaje',
                    style: 'tableHeader',
                    fillColor: '#3B82F6',
                    color: 'white',
                  },
                ],
                ...pregunta.respuestas.map((r) => [
                  r.descripcion,
                  { text: r.votos.toString(), alignment: 'center' },
                  {
                    text: `${r.porcentaje}%`,
                    alignment: 'center',
                    bold: true,
                    color: r.porcentaje > 50 ? '#10B981' : '#6B7280',
                  },
                ]),
              ],
            },
            layout: {
              hLineWidth: (i, node) => (i === 0 || i === node.table.body.length ? 0 : 1),
              vLineWidth: () => 0,
              hLineColor: () => '#E5E7EB',
              paddingLeft: () => 10,
              paddingRight: () => 10,
              paddingTop: () => 8,
              paddingBottom: () => 8,
            },
            margin: [0, 0, 0, 5],
          },
        ]),

        // Tendencia Temporal
        {
          text: 'TENDENCIA TEMPORAL',
          style: 'sectionHeader',
          pageBreak: 'before',
          margin: [0, 0, 0, 15],
        },
        {
          table: {
            widths: ['*', '*'],
            body: [
              [
                {
                  stack: [
                    {
                      text: 'Primera Respuesta',
                      style: 'subsectionHeader',
                      color: '#3B82F6',
                      margin: [0, 0, 0, 5],
                    },
                    {
                      text: tendenciaTemporal.primerRespuesta
                        ? new Date(
                            tendenciaTemporal.primerRespuesta,
                          ).toLocaleString('es-AR', {
                            dateStyle: 'full',
                            timeStyle: 'short',
                          })
                        : 'N/A',
                      fontSize: 10,
                    },
                  ],
                  fillColor: '#EFF6FF',
                  margin: [15, 15, 15, 15],
                },
                {
                  stack: [
                    {
                      text: 'Última Respuesta',
                      style: 'subsectionHeader',
                      color: '#10B981',
                      margin: [0, 0, 0, 5],
                    },
                    {
                      text: tendenciaTemporal.ultimaRespuesta
                        ? new Date(
                            tendenciaTemporal.ultimaRespuesta,
                          ).toLocaleString('es-AR', {
                            dateStyle: 'full',
                            timeStyle: 'short',
                          })
                        : 'N/A',
                      fontSize: 10,
                    },
                  ],
                  fillColor: '#ECFDF5',
                  margin: [15, 15, 15, 15],
                },
              ],
            ],
          },
          layout: 'noBorders',
          margin: [0, 0, 0, 30],
        },

        // Separador antes del footer
        {
          canvas: [
            {
              type: 'line',
              x1: 0,
              y1: 0,
              x2: 515,
              y2: 0,
              lineWidth: 1,
              lineColor: '#E5E7EB',
            },
          ],
          margin: [0, 20, 0, 15],
        },

        // Footer profesional
        {
          columns: [
            {
              width: '*',
              text: [
                {
                  text: 'Reporte generado el ',
                  fontSize: 9,
                  color: '#6B7280',
                },
                {
                  text: new Date().toLocaleString('es-AR', {
                    dateStyle: 'long',
                    timeStyle: 'short',
                  }),
                  fontSize: 9,
                  color: '#374151',
                  bold: true,
                },
              ],
            },
            {
              width: 'auto',
              text: 'Sistema de Encuestas',
              fontSize: 9,
              color: '#667EEA',
              bold: true,
            },
          ],
          margin: [0, 0, 0, 10],
        },
        {
          text: [
            {
              text: 'Encuesta: ',
              fontSize: 8,
              color: '#6B7280',
            },
            {
              text: encuesta.titulo,
              fontSize: 8,
              color: '#374151',
              bold: true,
            },
          ],
          alignment: 'center',
          margin: [0, 0, 0, 5],
        },
        {
          text: 'Este documento contiene información confidencial',
          alignment: 'center',
          fontSize: 8,
          color: '#9CA3AF',
          italics: true,
        },
      ],
      styles: {
        header: {
          fontSize: 24,
          bold: true,
          letterSpacing: 1,
        },
        titleEncuesta: {
          fontSize: 16,
          bold: true,
          letterSpacing: 0.5,
        },
        badge: {
          fontSize: 10,
          bold: true,
          margin: [8, 4, 8, 4],
        },
        sectionHeader: {
          fontSize: 16,
          bold: true,
          color: '#667EEA',
          letterSpacing: 0.5,
        },
        subsectionHeader: {
          fontSize: 11,
          bold: true,
          color: '#374151',
        },
        tableHeader: {
          fontSize: 10,
          bold: true,
          alignment: 'center',
        },
        metricNumber: {
          fontSize: 28,
          bold: true,
          margin: [0, 0, 0, 5],
        },
        metricLabel: {
          fontSize: 9,
          color: '#6B7280',
        },
        normalText: {
          fontSize: 10,
          color: '#374151',
        },
      },
      defaultStyle: {
        font: 'Roboto',
        fontSize: 10,
        color: '#1F2937',
        lineHeight: 1.4,
      },
      pageMargins: [40, 60, 40, 60],
    };

    // Crear el PDF
    const printer = new PdfPrinter(fonts);
    const pdfDoc = printer.createPdfKitDocument(docDefinition);

    // Convertir el stream a buffer
    return new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = [];
      pdfDoc.on('data', (chunk) => chunks.push(chunk));
      pdfDoc.on('end', () => resolve(Buffer.concat(chunks)));
      pdfDoc.on('error', reject);
      pdfDoc.end();
    });
  }
}
