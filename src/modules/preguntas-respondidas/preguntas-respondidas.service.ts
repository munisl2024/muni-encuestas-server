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

}
