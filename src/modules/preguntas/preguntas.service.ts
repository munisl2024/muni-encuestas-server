import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Preguntas, Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class PreguntasService {

    constructor(private prisma: PrismaService) { }

    // Pregunta por ID
    async getId(id: number): Promise<Preguntas> {

        const pregunta = await this.prisma.preguntas.findFirst({
            where: { id, activo: true },
            include: {
                encuesta: true,
                Respuestas: {
                    where: { activo: true },
                    orderBy: { orden: 'asc' }
                }
            }
        })

        if (!pregunta) throw new NotFoundException('La pregunta no existe');
        return pregunta;

    }

    // Listar preguntas
    async getAll({
        columna = 'orden',
        direccion = 'asc',
        parametro = '',
        encuestaId = '',
        activo = 'true',
        pagina = 1,
        itemsPorPagina = 1000000
    }: any): Promise<any> {

        // Ordenando datos
        let orderBy = {};
        orderBy[columna] = direccion;

        let where: any = {};

        // Filtro por estado activo/inactivo
        if (activo === 'true') {
            where.activo = true;
        } else if (activo === 'false') {
            where.activo = false;
        }
        // Si activo === 'all', no se filtra por activo

        // Filtro por encuesta
        if (encuestaId) where = { ...where, encuestaId: Number(encuestaId) };

        // Filtro por parametro
        if (parametro) {
            where = {
                ...where,
                OR: [
                    { id: Number(parametro) || undefined },
                    { descripcion: { contains: parametro } },
                ]
            }
        }

        // Total de preguntas
        const totalItems = await this.prisma.preguntas.count({ where });

        // Listado de preguntas
        const preguntas = await this.prisma.preguntas.findMany({
            take: Number(itemsPorPagina),
            include: {
                encuesta: true,
                Respuestas: {
                    // Mostrar respuestas con el mismo filtro de activo que las preguntas
                    where: activo === 'all' ? {} : { activo: activo === 'true' },
                    orderBy: { orden: 'asc' }
                }
            },
            skip: (pagina - 1) * itemsPorPagina,
            orderBy,
            where
        })

        return {
            preguntas,
            totalItems,
        };

    }

    // Crear pregunta
    async insert(createData: any): Promise<Preguntas> {

        const { respuestas, encuestaId } = createData;

        // Verificar si la encuesta existe
        const encuesta = await this.prisma.encuestas.findFirst({ where: { id: createData.encuestaId } });
        if (!encuesta) throw new NotFoundException('La encuesta no existe');

        // Verificar que se tiene al menos 2 respuestas
        if(respuestas.length < 2){
            throw new BadRequestException('Debe tener al menos 2 respuestas');
        }

        // Verificar que se tiene al menos 2 respuestas con descripcion
        if(respuestas.some(respuesta => respuesta.descripcion.trim() === '')){
            throw new BadRequestException('No puede tener respuestas vacias');
        }

        // Obtener el orden siguiente para la pregunta
        const ultimaPregunta = await this.prisma.preguntas.findFirst({
            where: { encuestaId },
            orderBy: { orden: 'desc' }
        });

        const ordenPregunta = ultimaPregunta ? ultimaPregunta.orden + 1 : 0;

        delete createData.respuestas;

        // Uppercase
        // createData.descripcion = createData.descripcion?.toLocaleUpperCase().trim();

        let preguntaDB: any = await this.prisma.preguntas.create({
            data: {
                descripcion: createData.descripcion,
                encuestaId: createData.encuestaId,
                creatorUserId: createData.creatorUserId,
                orden: ordenPregunta,
                activo: createData.activo !== undefined ? createData.activo : true
            },
            include: {
                encuesta: true,
                Respuestas: {
                    where: { activo: true }
                },
            }
        });

        // Agregar las respuestas a la pregunta con orden secuencial
        await this.prisma.respuestas.createMany({
            data: respuestas.map((respuesta, index) => ({
                ...respuesta,
                encuestaId,
                preguntaId: preguntaDB.id,
                creatorUserId: createData.creatorUserId,
                orden: index
            })),
        });

        // Obtener pregunta con las respuestas
        preguntaDB = await this.prisma.preguntas.findFirst({
            where: { id: preguntaDB.id },
            include: {
                Respuestas: {
                    where: { activo: true },
                    orderBy: { orden: 'asc' }
                },
            }
        });

        return preguntaDB;

    }

    // Actualizar pregunta
    async update(id: number, updateData: any): Promise<Preguntas> {

        const { respuestas, encuestaId, creatorUserId } = updateData;

        // Verificar si la encuesta existe
        const encuesta = await this.prisma.encuestas.findFirst({ where: { id: encuestaId } });
        if (!encuesta) throw new NotFoundException('La encuesta no existe');

        // Uppercase
        // updateData.descripcion = updateData.descripcion?.toString().toLocaleUpperCase().trim();

        const preguntaDB = await this.prisma.preguntas.findFirst({ where: { id } });

        // Verificacion: La pregunta no existe
        if (!preguntaDB) throw new NotFoundException('La pregunta no existe');

        // Dar de baja respuestas que no estan en el array de respuestas (soft delete)
        const respuestasDB = await this.prisma.respuestas.findMany({ where: { preguntaId: id, activo: true } });
        for(const respuesta of respuestasDB){
            if(!respuestas.some(r => r.id === respuesta.id)){
                await this.prisma.respuestas.update({
                    where: { id: respuesta.id },
                    data: { activo: false }
                });
            }
        }

        // Si la respuesta tiene id, actualizamos sino la creamos
        for(let i = 0; i < respuestas.length; i++){
            const respuesta = respuestas[i];
            if(respuesta.id){
                // Actualizar respuesta existente con su nuevo orden
                await this.prisma.respuestas.update({
                    where: { id: respuesta.id },
                    data: {
                        descripcion: respuesta.descripcion,
                        orden: i
                    }
                });
            } else {
                // Crear nueva respuesta con orden secuencial
                const data = {
                    descripcion: respuesta.descripcion,
                    encuestaId,
                    preguntaId: id,
                    creatorUserId,
                    orden: i
                };
                await this.prisma.respuestas.create({ data });
            }
        }
       
        delete updateData.respuestas;

        // Eliminar el campo orden si viene en updateData para no sobrescribirlo
        delete updateData.orden;

        // Actualizamos la pregunta
        return await this.prisma.preguntas.update({
            where: { id },
            data: updateData,
            include: {
                encuesta: true,
                Respuestas: {
                    where: { activo: true },
                    orderBy: { orden: 'asc' }
                },
            }
        })

    }

    // Dar de baja pregunta (soft delete)
    async delete(id: number): Promise<Preguntas> {

        // Verificar que la pregunta existe
        const preguntaDB = await this.prisma.preguntas.findFirst({ where: { id } });
        if (!preguntaDB) throw new NotFoundException('La pregunta no existe');

        // Dar de baja las respuestas de la pregunta (soft delete)
        await this.prisma.respuestas.updateMany({
            where: { preguntaId: id },
            data: { activo: false }
        });

        // Dar de baja la pregunta (soft delete)
        return await this.prisma.preguntas.update({
            where: { id },
            data: { activo: false }
        });
    }

    // Activar pregunta (dar de alta)
    async activate(id: number): Promise<Preguntas> {

        // Verificar que la pregunta existe
        const preguntaDB = await this.prisma.preguntas.findFirst({ where: { id } });
        if (!preguntaDB) throw new NotFoundException('La pregunta no existe');

        // Activar las respuestas de la pregunta
        await this.prisma.respuestas.updateMany({
            where: { preguntaId: id },
            data: { activo: true }
        });

        // Activar la pregunta
        return await this.prisma.preguntas.update({
            where: { id },
            data: { activo: true },
            include: {
                encuesta: true,
                Respuestas: {
                    orderBy: { orden: 'asc' }
                }
            }
        });
    }

    // Activar respuesta individual
    async activateRespuesta(id: number): Promise<any> {

        // Verificar que la respuesta existe
        const respuestaDB = await this.prisma.respuestas.findFirst({ where: { id } });
        if (!respuestaDB) throw new NotFoundException('La respuesta no existe');

        // Activar la respuesta
        return await this.prisma.respuestas.update({
            where: { id },
            data: { activo: true }
        });
    }

    // Desactivar respuesta individual
    async deactivateRespuesta(id: number): Promise<any> {

        // Verificar que la respuesta existe
        const respuestaDB = await this.prisma.respuestas.findFirst({ where: { id } });
        if (!respuestaDB) throw new NotFoundException('La respuesta no existe');

        // Desactivar la respuesta
        return await this.prisma.respuestas.update({
            where: { id },
            data: { activo: false }
        });
    }

    // Reordenar pregunta
    async reordenarPregunta(id: number, direccion: 'arriba' | 'abajo'): Promise<any> {
        const pregunta = await this.prisma.preguntas.findFirst({ where: { id, activo: true } });
        if (!pregunta) throw new NotFoundException('La pregunta no existe');

        // Obtener todas las preguntas activas de la encuesta ordenadas por 'orden'
        const preguntas = await this.prisma.preguntas.findMany({
            where: { encuestaId: pregunta.encuestaId, activo: true },
            orderBy: { orden: 'asc' }
        });

        // Encontrar el índice de la pregunta actual
        const indiceActual = preguntas.findIndex(p => p.id === id);

        if (direccion === 'arriba' && indiceActual > 0) {
            // Intercambiar con la pregunta anterior
            const preguntaAnterior = preguntas[indiceActual - 1];
            const ordenActual = pregunta.orden;
            const ordenAnterior = preguntaAnterior.orden;

            await this.prisma.preguntas.update({
                where: { id: pregunta.id },
                data: { orden: ordenAnterior }
            });

            await this.prisma.preguntas.update({
                where: { id: preguntaAnterior.id },
                data: { orden: ordenActual }
            });

        } else if (direccion === 'abajo' && indiceActual < preguntas.length - 1) {
            // Intercambiar con la pregunta siguiente
            const preguntaSiguiente = preguntas[indiceActual + 1];
            const ordenActual = pregunta.orden;
            const ordenSiguiente = preguntaSiguiente.orden;

            await this.prisma.preguntas.update({
                where: { id: pregunta.id },
                data: { orden: ordenSiguiente }
            });

            await this.prisma.preguntas.update({
                where: { id: preguntaSiguiente.id },
                data: { orden: ordenActual }
            });
        }

        return { success: true, message: 'Pregunta reordenada correctamente' };
    }

    // Reordenar respuesta
    async reordenarRespuesta(id: number, direccion: 'arriba' | 'abajo'): Promise<any> {
        const respuesta = await this.prisma.respuestas.findFirst({ where: { id, activo: true } });
        if (!respuesta) throw new NotFoundException('La respuesta no existe');

        // Obtener todas las respuestas activas de la pregunta ordenadas por 'orden'
        const respuestas = await this.prisma.respuestas.findMany({
            where: { preguntaId: respuesta.preguntaId, activo: true },
            orderBy: { orden: 'asc' }
        });

        // Encontrar el índice de la respuesta actual
        const indiceActual = respuestas.findIndex(r => r.id === id);

        if (direccion === 'arriba' && indiceActual > 0) {
            // Intercambiar con la respuesta anterior
            const respuestaAnterior = respuestas[indiceActual - 1];
            const ordenActual = respuesta.orden;
            const ordenAnterior = respuestaAnterior.orden;

            await this.prisma.respuestas.update({
                where: { id: respuesta.id },
                data: { orden: ordenAnterior }
            });

            await this.prisma.respuestas.update({
                where: { id: respuestaAnterior.id },
                data: { orden: ordenActual }
            });

        } else if (direccion === 'abajo' && indiceActual < respuestas.length - 1) {
            // Intercambiar con la respuesta siguiente
            const respuestaSiguiente = respuestas[indiceActual + 1];
            const ordenActual = respuesta.orden;
            const ordenSiguiente = respuestaSiguiente.orden;

            await this.prisma.respuestas.update({
                where: { id: respuesta.id },
                data: { orden: ordenSiguiente }
            });

            await this.prisma.respuestas.update({
                where: { id: respuestaSiguiente.id },
                data: { orden: ordenActual }
            });
        }

        return { success: true, message: 'Respuesta reordenada correctamente' };
    }

}
