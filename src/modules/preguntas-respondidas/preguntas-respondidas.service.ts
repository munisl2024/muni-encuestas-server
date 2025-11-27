import { Injectable, NotFoundException } from '@nestjs/common';
import { PreguntasRespondidas, Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class PreguntasRespondidasService {

    constructor(private prisma: PrismaService) { }

    // Pregunta Respondida por ID
    async getId(id: number): Promise<PreguntasRespondidas> {

        const preguntaRespondida = await this.prisma.preguntasRespondidas.findFirst({
            where: { id },
            include: {
                encuesta: true,
                pregunta: true,
                respuesta: true
            }
        })

        if (!preguntaRespondida) throw new NotFoundException('La pregunta respondida no existe');
        return preguntaRespondida;

    }

    // Listar preguntas respondidas
    async getAll({
        columna = 'id',
        direccion = 'desc',
        preguntaId = '',
        creatorUserId = '',
        encuestaId = '',
        pagina = 1,
        itemsPorPagina = 1000000
    }: any): Promise<any> {

        // Ordenando datos
        let orderBy = {};
        orderBy[columna] = direccion;

        let where = {};

        // Filtro por pregunta
        if (preguntaId) where = { ...where, preguntaId: Number(preguntaId) };

        // Filtro por encuesta
        if (encuestaId) where = { ...where, encuestaId: Number(encuestaId) };

        // Filtro por creador de usuario
        if (creatorUserId) where = { ...where, creatorUserId: Number(creatorUserId) };

        // Total de preguntas respondidas
        const totalItems = await this.prisma.preguntasRespondidas.count({ where });

        // Listado de preguntas respondidas
        const preguntasRespondidas = await this.prisma.preguntasRespondidas.findMany({
            take: Number(itemsPorPagina),
            include: {
                encuesta: true,
                pregunta: true,
                respuesta: true
            },
            skip: (pagina - 1) * itemsPorPagina,
            orderBy,
            where
        })

        return {
            preguntasRespondidas,
            totalItems,
        };

    }

    // Crear pregunta respondida
    async insert(createData: Prisma.PreguntasRespondidasCreateInput): Promise<PreguntasRespondidas> {
        return await this.prisma.preguntasRespondidas.create({
            data: createData,
            include: {
                encuesta: true,
                pregunta: true,
                respuesta: true
            }
        });
    }

    // Actualizar pregunta respondida
    async update(id: number, updateData: Prisma.PreguntasRespondidasUpdateInput): Promise<PreguntasRespondidas> {

        const preguntaRespondidaDB = await this.prisma.preguntasRespondidas.findFirst({ where: { id } });

        // Verificacion: La pregunta respondida no existe
        if (!preguntaRespondidaDB) throw new NotFoundException('La pregunta respondida no existe');

        return await this.prisma.preguntasRespondidas.update({
            where: { id },
            data: updateData,
            include: {
                encuesta: true,
                pregunta: true,
                respuesta: true
            }
        })

    }

    // Eliminar pregunta respondida
    async delete(id: number): Promise<PreguntasRespondidas> {
        return await this.prisma.preguntasRespondidas.delete({ where: { id } });
    }

    /**
     * Obtener respuestas agrupadas por sesión de encuesta
     * Optimizado para no sobrecargar al cliente
     */
    async obtenerRespuestasAgrupadas(
        encuestaId: number,
        pagina: number = 1,
        itemsPorPagina: number = 10,
        creatorUserId?: number,
        genero?: string,
        sigem?: boolean,
        fechaInicio?: string,
        fechaFin?: string
    ): Promise<any> {

        // Construir filtro
        const where: any = { encuestaId };
        if (creatorUserId) {
            where.creatorUserId = creatorUserId;
        }

        // Filtros de fecha
        if (fechaInicio || fechaFin) {
            where.createdAt = {};

            if (fechaInicio) {
                // Parsear la fecha en zona horaria local evitando conversión UTC
                const [year, month, day] = fechaInicio.split('-').map(Number);
                const inicio = new Date(year, month - 1, day, 0, 0, 0, 0);
                where.createdAt.gte = inicio;
            }

            if (fechaFin) {
                // Parsear la fecha en zona horaria local evitando conversión UTC
                const [year, month, day] = fechaFin.split('-').map(Number);
                const fin = new Date(year, month - 1, day, 23, 59, 59, 999);
                where.createdAt.lte = fin;
            }
        }

        // Filtros demográficos (se aplican a personaEncuestaRespondidas)
        const filtrosDemograficos: any = { activo: true };
        if (genero) {
            filtrosDemograficos.genero = genero;
        }
        if (sigem !== undefined) {
            filtrosDemograficos.sigem = sigem;
        }

        // Aplicar filtros demográficos solo si hay alguno activo
        const hayFiltrosDemograficos = genero || sigem !== undefined;
        if (hayFiltrosDemograficos) {
            where.personaEncuestaRespondidas = {
                some: filtrosDemograficos
            };
        }

        // Obtener sesiones de encuestas respondidas (con paginación)
        const encuestasRespondidas = await this.prisma.encuestasRespondidas.findMany({
            where,
            include: {
                creatorUser: {
                    select: {
                        id: true,
                        apellido: true,
                        nombre: true,
                        usuario: true
                    }
                },
                personaEncuestaRespondidas: {
                    where: { activo: true },
                    include: {
                        barrio: {
                            select: {
                                id: true,
                                descripcion: true
                            }
                        }
                    }
                },
                PreguntasRespondidas: {
                    include: {
                        pregunta: {
                            select: {
                                id: true,
                                descripcion: true,
                                orden: true
                            }
                        },
                        respuesta: {
                            select: {
                                id: true,
                                descripcion: true
                            }
                        }
                    },
                    orderBy: {
                        pregunta: {
                            orden: 'asc'
                        }
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            },
            skip: (pagina - 1) * itemsPorPagina,
            take: itemsPorPagina
        });

        // Contar total
        const total = await this.prisma.encuestasRespondidas.count({ where });

        // Formatear datos para el cliente
        const respuestasAgrupadas = encuestasRespondidas.map(sesion => {
            const datosPersona = sesion.personaEncuestaRespondidas[0] || null;

            return {
                id: sesion.id,
                fecha: sesion.createdAt,
                encuestador: {
                    id: sesion.creatorUser.id,
                    nombre: `${sesion.creatorUser.apellido}, ${sesion.creatorUser.nombre}`,
                    usuario: sesion.creatorUser.usuario
                },
                participante: datosPersona ? {
                    email: datosPersona.email,
                    telefono: datosPersona.telefono,
                    rangoEdad: datosPersona.rangoEdad,
                    genero: datosPersona.genero,
                    sigem: datosPersona.sigem,
                    barrio: datosPersona.barrio?.descripcion || 'Sin especificar'
                } : null,
                respuestas: sesion.PreguntasRespondidas.map(pr => ({
                    pregunta: pr.pregunta.descripcion,
                    respuesta: pr.respuesta.descripcion,
                    orden: pr.pregunta.orden
                }))
            };
        });

        return {
            respuestasAgrupadas,
            total,
            pagina,
            itemsPorPagina,
            totalPaginas: Math.ceil(total / itemsPorPagina)
        };
    }

    /**
     * Obtener lista de encuestadores que han respondido una encuesta
     */
    async obtenerEncuestadores(encuestaId: number): Promise<any> {
        const encuestadores = await this.prisma.encuestasRespondidas.findMany({
            where: { encuestaId },
            select: {
                creatorUser: {
                    select: {
                        id: true,
                        apellido: true,
                        nombre: true,
                        usuario: true
                    }
                }
            },
            distinct: ['creatorUserId']
        });

        // Formatear y eliminar duplicados
        const encuestadoresUnicos = encuestadores.map(e => ({
            id: e.creatorUser.id,
            nombre: `${e.creatorUser.apellido}, ${e.creatorUser.nombre}`,
            usuario: e.creatorUser.usuario
        }));

        return encuestadoresUnicos;
    }

}
