import { Injectable, NotFoundException } from '@nestjs/common';
import { Encuestas, Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class EncuestasService {

    constructor(private prisma: PrismaService) { }

    // Encuesta por ID
    async getId(id: number): Promise<Encuestas> {

        const encuesta = await this.prisma.encuestas.findFirst({
            where: { id },
            include: {
                creatorUser: true,
                Preguntas: {
                    include: {
                        Respuestas: true,
                    },
                    orderBy: { orden: 'asc' }
                },
            }
        })

        if (!encuesta) throw new NotFoundException('La encuesta no existe');
        return encuesta;

    }

    // Listar encuestas
    async getAll({
        columna = 'id',
        direccion = 'desc',
        estado = '',
        parametro = '',
        pagina = 1,
        itemsPorPagina = 1000000
    }: any): Promise<any> {

        // Ordenando datos
        let orderBy = {};
        orderBy[columna] = direccion;

        let where = {};

        // Filtro por estado
        if (estado) where = { ...where, estado };

        // Filtro por parametro
        if (parametro) {
            where = {
                ...where,
                OR: [
                    { id: Number(parametro) || undefined },
                    { titulo: { contains: parametro } },
                    { descripcion: { contains: parametro } },
                ]
            }
        }

        // Total de encuestas
        const totalItems = await this.prisma.encuestas.count({ where });

        // Listado de encuestas
        const encuestas = await this.prisma.encuestas.findMany({
            take: Number(itemsPorPagina),
            include: {
                creatorUser: true,
                Preguntas: {
                    where: { activo: true },
                    orderBy: { orden: 'asc' }
                },
            },
            skip: (pagina - 1) * itemsPorPagina,
            orderBy,
            where
        })

        return {
            encuestas,
            totalItems,
        };

    }

    // Crear encuesta
    async insert(createData: Prisma.EncuestasCreateInput): Promise<Encuestas> {

        // Uppercase
        createData.titulo = createData.titulo?.toLocaleUpperCase().trim();
        createData.descripcion = createData.descripcion?.toLocaleUpperCase().trim();

        // Verificacion: Titulo repetido
        let encuestaDB = await this.prisma.encuestas.findFirst({ where: { titulo: createData.titulo } });
        if (encuestaDB) throw new NotFoundException('La encuesta ya se encuentra cargada');

        return await this.prisma.encuestas.create({
            data: createData,
            include: {
                creatorUser: true,
                Preguntas: {
                    where: { activo: true },
                    orderBy: { orden: 'asc' }
                },
            }
        });

    }

    // Actualizar encuesta
    async update(id: number, updateData: Prisma.EncuestasUpdateInput): Promise<Encuestas> {

        const { titulo } = updateData;

        // Uppercase
        updateData.titulo = updateData.titulo?.toString().toLocaleUpperCase().trim();
        updateData.descripcion = updateData.descripcion?.toString().toLocaleUpperCase().trim();

        const encuestaDB = await this.prisma.encuestas.findFirst({ where: { id } });

        // Verificacion: La encuesta no existe
        if (!encuestaDB) throw new NotFoundException('La encuesta no existe');

        // Verificacion: Encuesta repetida
        if (titulo) {
            const encuestaRepetida = await this.prisma.encuestas.findFirst({ where: { titulo: titulo.toString() } })
            if (encuestaRepetida && encuestaRepetida.id !== id) throw new NotFoundException('La encuesta ya se encuentra cargada');
        }

        return await this.prisma.encuestas.update({
            where: { id },
            data: updateData,
            include: {
                creatorUser: true,
                Preguntas: {
                    where: { activo: true },
                    orderBy: { orden: 'asc' }
                },
            }
        })

    }

    // Eliminar encuesta
    async delete(id: number): Promise<Encuestas> {

        // Eliminar las respuestas de la encuesta
        await this.prisma.respuestas.deleteMany({ where: { encuestaId: Number(id) } });

        // Eliminar las preguntas de la encuesta
        await this.prisma.preguntas.deleteMany({ where: { encuestaId: Number(id) } });

        return await this.prisma.encuestas.delete({ where: { id } });

    }

    // Obtener estadísticas generales de una encuesta
    async getEstadisticas(id: number, fechaInicio?: string, fechaFin?: string): Promise<any> {

        const encuesta = await this.prisma.encuestas.findFirst({
            where: { id },
            include: {
                Preguntas: {
                    where: { activo: true },
                    include: {
                        Respuestas: {
                            where: { activo: true },
                            orderBy: { orden: 'asc' }
                        }
                    },
                    orderBy: { orden: 'asc' }
                }
            }
        });

        if (!encuesta) throw new NotFoundException('La encuesta no existe');

        // Construir el filtro de fecha para ambas consultas
        let whereClauseEncuestasRespondidas: any = { encuestaId: id };
        let whereClausePreguntasRespondidas: any = { encuestaId: id };

        if (fechaInicio || fechaFin) {
            whereClauseEncuestasRespondidas.createdAt = {};
            whereClausePreguntasRespondidas.createdAt = {};

            if (fechaInicio) {
                // Parsear la fecha en zona horaria local evitando conversión UTC
                const [year, month, day] = fechaInicio.split('-').map(Number);
                const inicio = new Date(year, month - 1, day, 0, 0, 0, 0);
                whereClauseEncuestasRespondidas.createdAt.gte = inicio;
                whereClausePreguntasRespondidas.createdAt.gte = inicio;
            }

            if (fechaFin) {
                // Parsear la fecha en zona horaria local evitando conversión UTC
                const [year, month, day] = fechaFin.split('-').map(Number);
                const fin = new Date(year, month - 1, day, 23, 59, 59, 999);
                whereClauseEncuestasRespondidas.createdAt.lte = fin;
                whereClausePreguntasRespondidas.createdAt.lte = fin;
            }
        }

        // Total de respuestas registradas (con filtro de fecha)
        const totalRespuestas = await this.prisma.preguntasRespondidas.count({
            where: whereClausePreguntasRespondidas
        });

        // Total de preguntas
        const totalPreguntas = encuesta.Preguntas.length;

        // Calcular participantes únicos usando PreguntasRespondidas (con filtro de fecha)
        const participantesUnicos = await this.prisma.preguntasRespondidas.groupBy({
            by: ['creatorUserId'],
            where: whereClausePreguntasRespondidas
        });

        const totalParticipantes = participantesUnicos.length;

        // Contar encuestas completadas usando la tabla EncuestasRespondidas (con filtro de fecha)
        const encuestasCompletas = await this.prisma.encuestasRespondidas.count({
            where: whereClauseEncuestasRespondidas
        });

        return {
            encuesta: {
                id: encuesta.id,
                titulo: encuesta.titulo,
                descripcion: encuesta.descripcion,
                estado: encuesta.estado
            },
            estadisticas: {
                totalPreguntas,
                totalRespuestas,
                totalParticipantes,
                encuestasCompletas,
                promedioRespuestasPorParticipante: totalParticipantes > 0
                    ? Math.round((totalRespuestas / totalParticipantes) * 100) / 100
                    : 0
            }
        };
    }

    // Obtener distribución de respuestas por pregunta
    async getDistribucionRespuestas(id: number, fechaInicio?: string, fechaFin?: string): Promise<any> {

        const encuesta = await this.prisma.encuestas.findFirst({
            where: { id },
            include: {
                Preguntas: {
                    where: { activo: true },
                    include: {
                        Respuestas: {
                            where: { activo: true },
                            orderBy: { orden: 'asc' }
                        }
                    },
                    orderBy: { orden: 'asc' }
                }
            }
        });

        if (!encuesta) throw new NotFoundException('La encuesta no existe');

        // Construir el filtro de fecha
        let whereClause: any = { encuestaId: id };

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

        const distribucion = await Promise.all(
            encuesta.Preguntas.map(async (pregunta) => {
                const respuestasConConteo = await Promise.all(
                    pregunta.Respuestas.map(async (respuesta) => {
                        const conteo = await this.prisma.preguntasRespondidas.count({
                            where: {
                                ...whereClause,
                                preguntaId: pregunta.id,
                                respuestaId: respuesta.id
                            }
                        });

                        return {
                            id: respuesta.id,
                            descripcion: respuesta.descripcion,
                            votos: conteo
                        };
                    })
                );

                const totalVotos = respuestasConConteo.reduce((sum, r) => sum + r.votos, 0);

                return {
                    preguntaId: pregunta.id,
                    pregunta: pregunta.descripcion,
                    multiplesRespuestas: pregunta.multiplesRespuestas,
                    totalVotos,
                    respuestas: respuestasConConteo.map(r => ({
                        ...r,
                        porcentaje: totalVotos > 0
                            ? Math.round((r.votos / totalVotos) * 10000) / 100
                            : 0
                    }))
                };
            })
        );

        return {
            encuesta: {
                id: encuesta.id,
                titulo: encuesta.titulo,
                descripcion: encuesta.descripcion
            },
            distribucion
        };
    }

    // Obtener reporte detallado de la encuesta
    async getReporteDetallado(id: number, fechaInicio?: string, fechaFin?: string): Promise<any> {

        // Construir el filtro de fecha
        let whereClause: any = {};

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

        const encuesta = await this.prisma.encuestas.findFirst({
            where: { id },
            include: {
                Preguntas: {
                    where: { activo: true },
                    include: {
                        Respuestas: {
                            where: { activo: true },
                            orderBy: { orden: 'asc' }
                        }
                    },
                    orderBy: { orden: 'asc' }
                },
                encuestasRespondidas: {
                    where: whereClause,
                    include: {
                        creatorUser: true,
                        PreguntasRespondidas: {
                            include: {
                                pregunta: true,
                                respuesta: true
                            }
                        },
                        personaEncuestaRespondidas: {
                            include: {
                                barrio: true
                            }
                        }
                    },
                    orderBy: {
                        createdAt: 'desc'
                    }
                }
            }
        });

        if (!encuesta) throw new NotFoundException('La encuesta no existe');

        // Construir el array de participantes con toda la información
        const participantes = encuesta.encuestasRespondidas.map(encuestaResp => {
            // Obtener datos personales (puede ser null si no se completaron)
            const datosPersonales = encuestaResp.personaEncuestaRespondidas[0] || null;

            return {
                id: encuestaResp.id,
                usuario: {
                    id: encuestaResp.creatorUser.id,
                    nombre: encuestaResp.creatorUser.nombre,
                    apellido: encuestaResp.creatorUser.apellido,
                    usuario: encuestaResp.creatorUser.usuario
                },
                datosPersonales: datosPersonales ? {
                    email: datosPersonales.email || '',
                    telefono: datosPersonales.telefono || '',
                    genero: datosPersonales.genero || '',
                    rangoEdad: datosPersonales.rangoEdad || '',
                    sigem: datosPersonales.sigem || false,
                    barrio: datosPersonales.barrio ? {
                        id: datosPersonales.barrio.id,
                        descripcion: datosPersonales.barrio.descripcion
                    } : null
                } : null,
                respuestas: encuestaResp.PreguntasRespondidas.map(pregResp => ({
                    pregunta: pregResp.pregunta.descripcion,
                    respuesta: pregResp.respuesta.descripcion,
                    fecha: pregResp.createdAt
                })),
                fechaRespuesta: encuestaResp.createdAt
            };
        });

        return {
            encuesta: {
                id: encuesta.id,
                titulo: encuesta.titulo,
                descripcion: encuesta.descripcion,
                estado: encuesta.estado
            },
            participantes
        };
    }

    // Obtener resumen para exportación
    async getResumenExportacion(id: number): Promise<any> {

        const estadisticas = await this.getEstadisticas(id);
        const distribucion = await this.getDistribucionRespuestas(id);

        return {
            ...estadisticas,
            distribucionRespuestas: distribucion.distribucion
        };
    }

    // Asignar usuario a encuesta
    async asignarUsuario(encuestaId: number, usuarioId: number): Promise<any> {

        // Verificar que la encuesta existe
        const encuesta = await this.prisma.encuestas.findFirst({ where: { id: encuestaId } });
        if (!encuesta) throw new NotFoundException('La encuesta no existe');

        // Verificar que el usuario existe
        const usuario = await this.prisma.usuarios.findFirst({ where: { id: usuarioId } });
        if (!usuario) throw new NotFoundException('El usuario no existe');

        // Verificar si ya está asignado
        const asignacionExistente = await this.prisma.encuestasToUsuarios.findFirst({
            where: {
                encuestaId,
                usuarioId
            }
        });

        if (asignacionExistente) throw new NotFoundException('El usuario ya está asignado a esta encuesta');

        // Crear la asignación
        return await this.prisma.encuestasToUsuarios.create({
            data: {
                encuestaId,
                usuarioId
            },
            include: {
                encuesta: true,
                usuario: {
                    select: {
                        id: true,
                        usuario: true,
                        nombre: true,
                        apellido: true,
                        email: true,
                        role: true
                    }
                }
            }
        });
    }

    // Remover usuario de encuesta
    async removerUsuario(encuestaId: number, usuarioId: number): Promise<any> {

        // Verificar que la asignación existe
        const asignacion = await this.prisma.encuestasToUsuarios.findFirst({
            where: {
                encuestaId,
                usuarioId
            }
        });

        if (!asignacion) throw new NotFoundException('El usuario no está asignado a esta encuesta');

        // Eliminar la asignación
        return await this.prisma.encuestasToUsuarios.delete({
            where: {
                id: asignacion.id
            }
        });
    }

    // Listar usuarios asignados a una encuesta
    async getUsuariosAsignados(encuestaId: number): Promise<any> {

        // Verificar que la encuesta existe
        const encuesta = await this.prisma.encuestas.findFirst({ where: { id: encuestaId } });
        if (!encuesta) throw new NotFoundException('La encuesta no existe');

        const asignaciones = await this.prisma.encuestasToUsuarios.findMany({
            where: { encuestaId },
            include: {
                usuario: {
                    select: {
                        id: true,
                        usuario: true,
                        nombre: true,
                        apellido: true,
                        dni: true,
                        email: true,
                        role: true,
                        activo: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        return asignaciones.map(asignacion => ({
            id: asignacion.id,
            usuario: asignacion.usuario,
            dni: asignacion.usuario.dni,
            fechaAsignacion: asignacion.createdAt
        }));
    }

    // Listar encuestas asignadas a un usuario
    async getEncuestasAsignadas(usuarioId: number): Promise<any> {

        // Verificar que el usuario existe
        const usuario = await this.prisma.usuarios.findFirst({ where: { id: usuarioId } });
        if (!usuario) throw new NotFoundException('El usuario no existe');

        const asignaciones = await this.prisma.encuestasToUsuarios.findMany({
            where: { usuarioId },
            include: {
                encuesta: {
                    include: {
                        creatorUser: {
                            select: {
                                id: true,
                                usuario: true,
                                nombre: true,
                                apellido: true
                            }
                        },
                        Preguntas: {
                            where: { activo: true }
                        },
                        EncuestasActivacion: {
                            where: { activo: true },
                            orderBy: { createdAt: 'desc' }
                        }
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        const now = new Date();

        return asignaciones.map(asignacion => {
            // Buscar la programación activa actual (entre fechaInicio y fechaFin)
            const programacionActiva = asignacion.encuesta.EncuestasActivacion.find(prog => {
                const inicio = new Date(prog.fechaInicio);
                const fin = new Date(prog.fechaFin);
                return now >= inicio && now <= fin;
            });

            return {
                id: asignacion.id,
                encuesta: {
                    ...asignacion.encuesta,
                    programacionActiva: programacionActiva || null
                },
                fechaAsignacion: asignacion.createdAt
            };
        });
    }

    // Responder encuesta completa (crea EncuestasRespondidas + PreguntasRespondidas)
    async responderEncuesta(
        encuestaId: number,
        usuarioId: number,
        respuestas: any,
        datosPersonales?: { email: string; sigem: boolean; genero: string; telefono: string; rangoEdad: string; barrioId: number }
    ): Promise<any> {

        console.log(respuestas);

        // Validar que la encuesta existe
        const encuesta = await this.prisma.encuestas.findFirst({
            where: { id: encuestaId },
            include: {
                Preguntas: {
                    include: {
                        Respuestas: true
                    }
                }
            }
        });

        if (!encuesta) throw new NotFoundException('La encuesta no existe');

        // Validar que la encuesta está activa
        if (encuesta.estado !== 'Activa') {
            throw new NotFoundException('La encuesta no está activa');
        }

        // Validar que se respondieron todas las preguntas
        const preguntasActivas = encuesta.Preguntas.filter(p => p.activo);
        if (respuestas.length !== preguntasActivas.length) {
            throw new NotFoundException('Debes responder todas las preguntas activas de la encuesta');
        }

        // Validar que todas las respuestas pertenecen a preguntas de esta encuesta
        for (const resp of respuestas) {
            
            const pregunta = encuesta.Preguntas.find(p => p.id === resp.preguntaId);
            if (!pregunta) {
                throw new NotFoundException(`La pregunta ${resp.preguntaId} no pertenece a esta encuesta`);
            }

            // Validar que respuestaIds no esté vacío
            if (!resp.respuestaIds || resp.respuestaIds.length === 0) {
                throw new NotFoundException(`Debes seleccionar al menos una respuesta para la pregunta ${resp.preguntaId}`);
            }

            // Validar que si la pregunta NO permite múltiples respuestas, solo se envíe una
            if (!pregunta.multiplesRespuestas && resp.respuestaIds.length > 1) {
                throw new NotFoundException(`La pregunta ${resp.preguntaId} solo permite seleccionar una respuesta`);
            }

            // Validar que todas las respuestaIds pertenecen a esta pregunta
            for (const respuestaId of resp.respuestaIds) {
                // Validar que respuestaId no sea null, undefined o inválido
                if (respuestaId === undefined || respuestaId === null || isNaN(respuestaId)) {
                    throw new NotFoundException(`Se recibió un ID de respuesta inválido (${respuestaId}) para la pregunta ${resp.preguntaId}. Por favor recarga la página e intenta nuevamente.`);
                }

                const respuestaValida = pregunta.Respuestas.find(r => r.id === respuestaId);
                if (!respuestaValida) {
                    throw new NotFoundException(`La respuesta ${respuestaId} no pertenece a la pregunta ${resp.preguntaId} (${pregunta.descripcion})`);
                }
            }
        }

        // Validar que se proporcionaron datos personales con barrioId
        if (!datosPersonales || !datosPersonales.barrioId) {
            throw new NotFoundException('El barrio es obligatorio');
        }

        // Crear la encuesta respondida y todas las preguntas respondidas en una transacción
        const encuestaRespondida = await this.prisma.$transaction(async (prisma) => {

            // 1. Crear el registro de EncuestasRespondidas
            const encuestaResp = await prisma.encuestasRespondidas.create({
                data: {
                    encuestaId,
                    creatorUserId: usuarioId
                }
            });

            // 2. Crear el registro de PersonaEncuestaRespondida si se proporcionaron datos personales
            let personaEncuesta = null;
            if (datosPersonales) {
                await prisma.personaEncuestaRespondida.create({
                    data: {
                        encuestaRespondidaId: encuestaResp.id,
                        email: datosPersonales.email.trim().toLowerCase() || '',
                        sigem: datosPersonales.sigem || false,
                        genero: datosPersonales.genero || 'Masculino',
                        telefono: datosPersonales.telefono.trim() || '',
                        rangoEdad: datosPersonales.rangoEdad || '18-25',
                        barrioId: datosPersonales.barrioId,
                        creatorUserId: usuarioId
                    }
                });
            }

            // 3. Crear todos los registros de PreguntasRespondidas
            // Si una pregunta tiene múltiples respuestas, se crea un registro por cada una
            const preguntasRespondidasPromises: Promise<any>[] = [];
            for (const resp of respuestas) {
                for (const respuestaId of resp.respuestaIds) {
                    preguntasRespondidasPromises.push(
                        prisma.preguntasRespondidas.create({
                            data: {
                                encuestaId,
                                preguntaId: resp.preguntaId,
                                respuestaId: respuestaId,
                                encuestaRespondidaId: encuestaResp.id,
                                creatorUserId: usuarioId
                            },
                            include: {
                                pregunta: true,
                                respuesta: true
                            }
                        })
                    );
                }
            }
            const preguntasRespondidas = await Promise.all(preguntasRespondidasPromises);

            // 4. Retornar la encuesta respondida completa
            return {
                ...encuestaResp,
                personaEncuesta,
                preguntasRespondidas
            };
        });

        return encuestaRespondida;
    }

}
