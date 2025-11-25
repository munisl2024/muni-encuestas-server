import { Injectable, NotFoundException } from '@nestjs/common';
import * as bcryptjs from 'bcryptjs';
import { PrismaService } from 'src/prisma/prisma.service';
import { Prisma, Usuarios } from '@prisma/client';
import XLSX from 'xlsx';

@Injectable()
export class UsuariosService {

    constructor(private prisma: PrismaService) { }

    // Usuario por ID
    async getUsuario(id: number): Promise<Usuarios> {
        const usuarioDB = await this.prisma.usuarios.findFirst({ where: { id } });
        if (!usuarioDB) throw new NotFoundException('El usuario no existe');
        return usuarioDB;
    }

    // Usuario por nombre de usuario
    async getUsuarioPorNombre(nombreUsuario: string): Promise<Usuarios | null> {
        return await this.prisma.usuarios.findFirst({
            where: { usuario: nombreUsuario, activo: true },
        });
    }

    // Usuario por DNI
    async getUsuarioPorDNI(dni: string): Promise<Usuarios | null> {
        return await this.prisma.usuarios.findFirst({
            where: { dni, activo: true },
        });
    }

    // Usuario por email
    async getUsuarioPorEmail(email: string): Promise<Usuarios | null> {
        email = email.toLocaleLowerCase();
        return await this.prisma.usuarios.findFirst({
            where: { email, activo: true },
        });
    }

    // Listar usuario
    async listarUsuarios({ columna = 'id', direccion = 'asc' }: any): Promise<Usuarios[]> {

        let orderBy = {};
        orderBy[columna] = direccion == 1 ? 'asc' : 'desc';

        return await this.prisma.usuarios.findMany({
            orderBy
        });

    }

    // Crear usuario
    async crearUsuario(usuariosDTO: Prisma.UsuariosCreateInput): Promise<Usuarios> {

        // Uppercase y Lowercase
        usuariosDTO.apellido = usuariosDTO.apellido.toLocaleUpperCase();
        usuariosDTO.nombre = usuariosDTO.nombre.toLocaleUpperCase();
        usuariosDTO.email = usuariosDTO.email.toLocaleLowerCase();

        const { usuario, dni, email } = usuariosDTO;

        // Verificacion: Nombre de usuario repetido
        let usuarioDB = await this.prisma.usuarios.findFirst({ where: { usuario } })
        if (usuarioDB) throw new NotFoundException('El nombre de usuario ya se encuentra registrado');

        // Verificacion: Numero de DNI repetido
        usuarioDB = await this.getUsuarioPorDNI(dni);
        if (usuarioDB) throw new NotFoundException('El DNI ya se encuentra registrado');

        // Verificacion: Correo electronico repetido
        usuarioDB = await this.getUsuarioPorEmail(email);
        if (usuarioDB) throw new NotFoundException('El email ya se encuentra registrado');

        // Se adicionan los permisos al usuarios
        // await Promise.all(
        //   permisos.map(async ({ alcance, permiso, creatorUser, updatorUser }) => {
        //     const dataPermiso = {
        //       usuario: nuevoUsuarioDB.id,
        //       alcance,
        //       permiso,
        //       creatorUser,
        //       updatorUser,
        //     };
        //     await this.permisosRepository.save(dataPermiso);
        //   })
        // );

        return await this.prisma.usuarios.create({
            data: usuariosDTO
        });

    }

    // Actualizar usuario
    async actualizarUsuario(id: any, usuariosUpdateDTO: any): Promise<Usuarios> {

        // Uppercase y Lowercase
        usuariosUpdateDTO.apellido = usuariosUpdateDTO.apellido?.toLocaleUpperCase();
        usuariosUpdateDTO.nombre = usuariosUpdateDTO.nombre?.toLocaleUpperCase();
        usuariosUpdateDTO.email = usuariosUpdateDTO.email?.toLocaleLowerCase();

        const {
            usuario,
            apellido,
            nombre,
            dni,
            email,
            role,
            password,
            activo,
        } = usuariosUpdateDTO;

        const data = {
            usuario,
            apellido,
            nombre,
            dni,
            email,
            role,
            password,
            activo: activo === 'true' ? true : false,
        }

        // Actualizacion de datos de usuario

        return await this.prisma.usuarios.update({
            where: { id },
            data,
        });


        // Actualizacion de permisos
        // await Promise.all(
        //   permisos.map(async ({ alcance, permiso, creatorUser, updatorUser }) => {

        //     const permisoDB = await this.permisosRepository.findOne({ where: [{ usuario: { id }, alcance }] });

        //     if (permisoDB) {  // Si existe y es distinto se actualiza

        //       if(permisoDB.permiso !== permiso){

        //         const dataPermiso = {
        //           permiso,
        //           updatorUser
        //         }

        //         await this.permisosRepository.update({ id: permisoDB.id }, dataPermiso);

        //       }

        //     } else { // Si no existe se crea

        //       const dataPermiso = {
        //         usuario: id,
        //         alcance,
        //         permiso,
        //         creatorUser,
        //         updatorUser
        //       };

        //       await this.permisosRepository.save(dataPermiso);

        //     }

        //   })
        // );

    }

    // Actualizar password perfil
    async actualizarPasswordPerfil(id: number, { password_actual, password_nuevo, password_nuevo_repetir }: any): Promise<string> {

        // Datos de usuario
        const usuarioDB: any = await this.prisma.usuarios.findFirst({ where: { id } });

        // Verificacion - Password actual correcto
        const passwordValido = bcryptjs.compareSync(password_actual, usuarioDB.password);

        if (!usuarioDB || !passwordValido) throw new NotFoundException('La contraseña actual no coincide');

        // Verificacion - Nuevo password
        if (password_nuevo !== password_nuevo_repetir) throw new NotFoundException('Debe repetir correctamente la contraseña');

        // Actualizando contraseña
        const salt = bcryptjs.genSaltSync();
        const password = bcryptjs.hashSync(password_nuevo, salt);

        await this.prisma.usuarios.update({ where: { id }, data: { password } });
        return 'Actualizacion correcta';

    }

    // Exportar usuarios - Excel
    async exportarUsuarios(query: any): Promise<any> {

        const {
            columna = 'descripcion',
            direccion = 'asc',
            activo,
            parametro
        } = query;

        // Ordenando datos
        let orderBy = {};
        orderBy[columna] = direccion;

        // Filtro activo
        let where = {};
        if (activo) where = { activo: activo === 'true' };

        // Filtro por parametro
        if (parametro) {
            where = {
                ...where,
                OR: [
                    { usuario: { contains: parametro } },
                    { dni: { contains: parametro } },
                    { apellido: { contains: parametro } },
                    { nombre: { contains: parametro } },
                ]
            }
        }

        // Listar usuarios
        const usuarios = await this.prisma.usuarios.findMany({
            where,
            orderBy
        });

        // Generar reporte en excel
        const dataExcel: any = [];

        usuarios.forEach((usuario) => {
            dataExcel.push({
                USUARIO: usuario.usuario,
                APELLIDO: usuario.apellido,
                NOMBRE: usuario.nombre,
                DNI: usuario.dni,
                EMAIL: usuario.email,
                ROLE: usuario.role === 'ADMIN_ROLE' ? 'Administrador' : 'Usuario estandar',
                ESTADO: usuario.activo ? 'Activa' : 'Inactiva',
            });
        });

        const ws = XLSX.utils.json_to_sheet(dataExcel);

        // Agregar filtros a las columnas
        ws['!autofilter'] = { ref: 'A1:G1' };

        // Modificar el ancho de las columnas
        ws['!cols'] = [
            { wch: 20 }, // Ancho para la columna USUARIO
            { wch: 20 }, // Ancho para la columna APELLIDO
            { wch: 20 }, // Ancho para la columna NOMBRE
            { wch: 20 }, // Ancho para la columna DNI
            { wch: 20 }, // Ancho para la columna EMAIL
            { wch: 20 }, // Ancho para la columna ROLE
            { wch: 20 }, // Ancho para la columna ESTADO
        ];

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Usuarios');

        // Escribir el archivo en un buffer
        const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });

        return buffer;

    }



}
