import { Injectable, NotFoundException } from '@nestjs/common';
import { Respuestas, Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class RespuestasService {
    
    constructor(private prisma: PrismaService) { }

    // Respuesta por ID
    async getId(id: number): Promise<Respuestas> {

        const respuesta = await this.prisma.respuestas.findFirst({
            where: { id },
            include: {
                encuesta: true,
                pregunta: {
                    include: {
                        Respuestas: true,
                    }
                }
            }
        })

        if (!respuesta) throw new NotFoundException('La respuesta no existe');
        return respuesta;

    }

    // Listar respuestas
    async getAll({
        columna = 'id',
        direccion = 'desc',
        parametro = '',
        preguntaId = '',
        pagina = 1,
        itemsPorPagina = 1000000
    }: any): Promise<any> {

        // Ordenando datos
        let orderBy = {};
        orderBy[columna] = direccion;

        let where = {};

        // Filtro por pregunta
        if (preguntaId) where = { ...where, preguntaId: Number(preguntaId) };

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

        // Total de respuestas
        const totalItems = await this.prisma.respuestas.count({ where });

        // Listado de respuestas
        const respuestas = await this.prisma.respuestas.findMany({
            take: Number(itemsPorPagina),
            include: {
                encuesta: true,
                pregunta: {
                    include: {
                        Respuestas: true,
                    }
                }
            },
            skip: (pagina - 1) * itemsPorPagina,
            orderBy,
            where
        })

        return {
            respuestas,
            totalItems,
        };

    }

    // Crear respuesta
    async insert(createData: Prisma.RespuestasCreateInput): Promise<Respuestas> {

        // Uppercase
        createData.descripcion = createData.descripcion?.toLocaleUpperCase().trim();

        return await this.prisma.respuestas.create({ 
            data: createData, 
            include: { 
                encuesta: true,
                pregunta: {
                    include: {
                        Respuestas: true,
                    }
                }
            } 
        });

    }

    // Actualizar respuesta
    async update(id: number, updateData: Prisma.RespuestasUpdateInput): Promise<Respuestas> {

        // Uppercase
        updateData.descripcion = updateData.descripcion?.toString().toLocaleUpperCase().trim();

        const respuestaDB = await this.prisma.respuestas.findFirst({ where: { id } });

        // Verificacion: La respuesta no existe
        if (!respuestaDB) throw new NotFoundException('La respuesta no existe');

        return await this.prisma.respuestas.update({
            where: { id },
            data: updateData,
            include: {
                encuesta: true,
                pregunta: {
                    include: {
                        Respuestas: true,
                    }
                }
            }
        })

    }

    // Eliminar respuesta
    async delete(id: number): Promise<Respuestas> {
        return await this.prisma.respuestas.delete({ where: { id } });
    }

}
