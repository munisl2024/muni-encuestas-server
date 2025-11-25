import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Barrios } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import * as xml2js from 'xml2js';

@Injectable()
export class BarriosService {

    constructor(private prisma: PrismaService) {}

    // Barrio por ID
    async getId(id: number): Promise<Barrios> {
      const barrio = await this.prisma.barrios.findFirst({
        where: { id },
        include: {
          creatorUser: true,
        },
      });
  
      if (!barrio) throw new NotFoundException('El barrio no existe');
      return barrio;
    }
  
    // Barrio por ID con coordenadas
    async getIdConCoordenadas(id: number): Promise<any> {
      const barrio = await this.prisma.barrios.findFirst({
        where: { id },
        include: {
          creatorUser: true,
          CoordenadasToBarrio: {
            orderBy: {
              orden: 'asc',
            },
          },
        },
      });
  
      if (!barrio) throw new NotFoundException('El barrio no existe');
      return barrio;
    }
  
    // Listar barrios
    async getAll({
      columna = 'descripcion',
      direccion = 'desc',
      activo = '',
      parametro = '',
      pagina = 1,
      itemsPorPagina = 10000,
    }: any): Promise<any> {
      // Ordenando datos
      const orderBy = {};
      orderBy[columna] = direccion;
  
      let where: any = {};
  
      if (activo) {
        where = {
          ...where,
          activo: activo === 'true' ? true : false,
        };
      }
  
      // Buscador
      if (parametro) {
        where = {
          ...where,
          descripcion: {
            contains: parametro,
          },
        };
      }
  
      // Total de barrios
      const totalItems = await this.prisma.barrios.count({ where });
  
      // Listado de barrios
      const barrios = await this.prisma.barrios.findMany({
        take: Number(itemsPorPagina),
        include: {
          CoordenadasToBarrio: {
            orderBy: {
              orden: 'asc',
            },
          },
          creatorUser: true,
        },
        skip: (pagina - 1) * itemsPorPagina,
        where,
        orderBy,
      });
  
      return {
        barrios,
        totalItems,
      };
    }
  
    // Listar barrios con coordenadas para mapa
    async getAllConCoordenadas(): Promise<any> {
      const barrios = await this.prisma.barrios.findMany({
        where: { activo: true },
        include: {
          CoordenadasToBarrio: {
            orderBy: {
              orden: 'asc',
            },
          },
        },
        orderBy: {
          descripcion: 'asc',
        },
      });
  
      return barrios;
    }
  
    // Crear barrio
    async insert(createData: {
      descripcion: string;
      activo?: boolean;
      coordenadas: any[];
      creatorUserId: number;
    }): Promise<Barrios> {
      let { descripcion, creatorUserId, coordenadas } = createData;
  
      // Uppercase la descripcion
      descripcion = descripcion?.toUpperCase();
  
      // Deben haber al menos 3 coordenadas
      if (coordenadas.length < 3) {
        throw new BadRequestException('Debe haber al menos 3 coordenadas');
      }
  
      // Creacion del barrio
      const barrioDB = await this.prisma.barrios.create({
        data: {
          descripcion,
          activo: true,
          creatorUserId,
        },
        include: {
          creatorUser: true,
        },
      });
  
      // Crear las coordenadas
      await this.prisma.coordenadasToBarrio.createMany({
        data: coordenadas?.map((coordenada, index) => ({
          orden: index + 1,
          lat: coordenada.lat,
          lng: coordenada.lng,
          barrioId: barrioDB.id,
        })),
      });
  
      return barrioDB;
    }
  
    // Actualizar barrio
    async update(
      id: number,
      updateData: { descripcion?: string; activo?: boolean },
    ): Promise<Barrios> {
      // Uppercase la descripcion
      updateData.descripcion = updateData.descripcion?.toUpperCase();
  
      await this.getId(id);
      return await this.prisma.barrios.update({
        where: { id },
        data: updateData,
        include: {
          creatorUser: true,
        },
      });
    }
  
    // Actualizar estado del barrio
    async updateEstado(id: number, activo: boolean): Promise<Barrios> {
      await this.getId(id);
      return await this.prisma.barrios.update({
        where: { id },
        data: { activo },
        include: {
          creatorUser: true,
        },
      });
    }
  
    // Actualizar coordenadas
    async actualizarCoordenadas(
      idBarrio: number,
      coordenadas: any,
    ): Promise<any> {
      // Deben haber al menos 3 coordenadas
      if (coordenadas.length < 3) {
        throw new BadRequestException('Debe haber al menos 3 coordenadas');
      }
  
      // Eliminar las coordenadas anteriores
      await this.prisma.coordenadasToBarrio.deleteMany({
        where: { barrioId: idBarrio },
      });
  
      // Crear las nuevas coordenadas
      await this.prisma.coordenadasToBarrio.createMany({
        data: coordenadas.map((coordenada, index) => ({
          orden: index + 1,
          lat: coordenada.lat,
          lng: coordenada.lng,
          barrioId: idBarrio,
        })),
      });
  
      return 'Coordenadas actualizadas correctamente';
    }
  
    // Importar KML
    async importarKml(kmlData: string, creatorUserId: number): Promise<any> {
      try {
        const parser = new xml2js.Parser();
        const result = await parser.parseStringPromise(kmlData);
  
        const placemarks = result.kml.Document[0].Placemark;
        const barriosCreados: Array<{ nombre: string; coordenadas: number }> = [];
        const errores: Array<{ nombre: string; error: string }> = [];
  
        for (const placemark of placemarks) {
          try {
            const nombre = placemark.name[0];
            const coordinates =
              placemark.Polygon[0].outerBoundaryIs[0].LinearRing[0].coordinates[0]
                .trim()
                .split('\n');
  
            // Crear el barrio
            const barrio = await this.prisma.barrios.create({
              data: {
                descripcion: nombre.toUpperCase(),
                activo: true,
                creatorUserId,
              },
            });
  
            // Crear las coordenadas
            const coordenadas: Array<{
              orden: number;
              lat: number;
              lng: number;
              barrioId: number;
            }> = [];
            for (let i = 0; i < coordinates.length; i++) {
              const coord = coordinates[i].trim();
              if (coord) {
                const [lng, lat] = coord.split(',').map(Number);
                if (!isNaN(lat) && !isNaN(lng)) {
                  coordenadas.push({
                    orden: i + 1,
                    lat,
                    lng,
                    barrioId: barrio.id,
                  });
                }
              }
            }
  
            if (coordenadas.length > 0) {
              await this.prisma.coordenadasToBarrio.createMany({
                data: coordenadas,
              });
            }
  
            barriosCreados.push({
              nombre,
              coordenadas: coordenadas.length,
            });
          } catch (error) {
            errores.push({
              nombre: placemark.name ? placemark.name[0] : 'Sin nombre',
              error: error.message,
            });
          }
        }
  
        return {
          total: placemarks.length,
          creados: barriosCreados.length,
          barriosCreados,
          errores,
        };
      } catch (error) {
        throw new Error(`Error al procesar el archivo KML: ${error.message}`);
      }
    }
  
    // Eliminar barrio
    async delete(id: number): Promise<Barrios> {
      await this.getId(id);
  
      // Eliminar coordenadas primero
      await this.prisma.coordenadasToBarrio.deleteMany({
        where: { barrioId: id },
      });
  
      // Eliminar el barrio
      return await this.prisma.barrios.delete({
        where: { id },
      });
    }
  
    // Reactivar barrio
    async reactivar(id: number): Promise<Barrios> {
      await this.getId(id);
      return await this.prisma.barrios.update({
        where: { id },
        data: { activo: true },
        include: {
          creatorUser: true,
        },
      });
    }

}
