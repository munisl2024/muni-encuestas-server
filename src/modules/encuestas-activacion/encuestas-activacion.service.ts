import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { EncuestasActivacion, Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { Cron, CronExpression, SchedulerRegistry } from '@nestjs/schedule';

@Injectable()
export class EncuestasActivacionService implements OnModuleInit {

    constructor(
        private prisma: PrismaService,
        private schedulerRegistry: SchedulerRegistry
    ) { }

    // Recargar todos los jobs al iniciar la aplicación
    async onModuleInit() {
        console.log('🔄 Recargando programaciones de encuestas...');
        await this.recargarTodosLosJobs();
        console.log('✅ Programaciones recargadas correctamente');
    }

    // Obtener programación por ID
    async getId(id: number): Promise<EncuestasActivacion> {
        const programacion = await this.prisma.encuestasActivacion.findFirst({
            where: { id },
            include: {
                encuesta: true,
                creatorUser: true
            }
        });

        if (!programacion) throw new NotFoundException('La programación no existe');
        return programacion;
    }

    // Listar programaciones de una encuesta
    async getByEncuesta(encuestaId: number): Promise<EncuestasActivacion[]> {
        return await this.prisma.encuestasActivacion.findMany({
            where: {
                encuestaId,
                activo: true
            },
            include: {
                creatorUser: true
            },
            orderBy: {
                fechaInicio: 'asc'
            }
        });
    }

    // Crear programación
    async insert(createData: Prisma.EncuestasActivacionCreateInput): Promise<EncuestasActivacion> {
        // Validar que la fecha de fin sea posterior a la de inicio
        const fechaInicio = new Date(createData.fechaInicio);
        const fechaFin = new Date(createData.fechaFin);

        if (fechaFin <= fechaInicio) {
            throw new NotFoundException('La fecha de fin debe ser posterior a la fecha de inicio');
        }

        const programacion = await this.prisma.encuestasActivacion.create({
            data: createData,
            include: {
                encuesta: true,
                creatorUser: true
            }
        });

        // Programar jobs dinámicos
        await this.programarJobs(programacion);

        return programacion;
    }

    // Actualizar programación
    async update(id: number, updateData: Prisma.EncuestasActivacionUpdateInput): Promise<EncuestasActivacion> {
        const programacionDB = await this.prisma.encuestasActivacion.findFirst({ where: { id } });

        if (!programacionDB) throw new NotFoundException('La programación no existe');

        // Validar fechas si se están actualizando
        if (updateData.fechaInicio || updateData.fechaFin) {
            const fechaInicio = updateData.fechaInicio
                ? new Date(updateData.fechaInicio as any)
                : new Date(programacionDB.fechaInicio);
            const fechaFin = updateData.fechaFin
                ? new Date(updateData.fechaFin as any)
                : new Date(programacionDB.fechaFin);

            if (fechaFin <= fechaInicio) {
                throw new NotFoundException('La fecha de fin debe ser posterior a la fecha de inicio');
            }
        }

        // Cancelar jobs antiguos
        this.cancelarJobs(id);

        const programacion = await this.prisma.encuestasActivacion.update({
            where: { id },
            data: updateData,
            include: {
                encuesta: true,
                creatorUser: true
            }
        });

        // Programar nuevos jobs
        await this.programarJobs(programacion);

        return programacion;
    }

    // Eliminar programación (soft delete)
    async delete(id: number): Promise<EncuestasActivacion> {
        // Cancelar jobs antes de eliminar
        this.cancelarJobs(id);

        return await this.prisma.encuestasActivacion.update({
            where: { id },
            data: { activo: false }
        });
    }

    // ========== JOBS DINÁMICOS ==========

    // Programar jobs dinámicos para una programación
    async programarJobs(programacion: EncuestasActivacion): Promise<void> {
        const ahora = new Date();
        const fechaInicio = new Date(programacion.fechaInicio);
        const fechaFin = new Date(programacion.fechaFin);

        // Calcular delays en milisegundos
        const delayInicio = fechaInicio.getTime() - ahora.getTime();
        const delayFin = fechaFin.getTime() - ahora.getTime();

        // Solo programar si la fecha es futura
        if (delayInicio > 0) {
            const timeout = setTimeout(async () => {
                await this.activarEncuesta(programacion.encuestaId);
                console.log(`✅ Encuesta ${programacion.encuestaId} activada automáticamente (ID programación: ${programacion.id})`);
            }, delayInicio);

            this.schedulerRegistry.addTimeout(`activar-${programacion.id}`, timeout);
            console.log(`⏰ Job programado: Activar encuesta ${programacion.encuestaId} el ${fechaInicio.toLocaleString()}`);
        } else if (delayInicio <= 0 && delayFin > 0) {
            // Si ya pasó la fecha de inicio pero no la de fin, activar inmediatamente
            await this.activarEncuesta(programacion.encuestaId);
            console.log(`✅ Encuesta ${programacion.encuestaId} activada inmediatamente (ya debería estar activa)`);
        }

        // Solo programar desactivación si la fecha es futura
        if (delayFin > 0) {
            const timeout = setTimeout(async () => {
                await this.desactivarEncuesta(programacion.encuestaId);
                console.log(`❌ Encuesta ${programacion.encuestaId} desactivada automáticamente (ID programación: ${programacion.id})`);
            }, delayFin);

            this.schedulerRegistry.addTimeout(`desactivar-${programacion.id}`, timeout);
            console.log(`⏰ Job programado: Desactivar encuesta ${programacion.encuestaId} el ${fechaFin.toLocaleString()}`);
        } else if (delayFin <= 0) {
            // Si ya pasó la fecha de fin, desactivar inmediatamente
            await this.desactivarEncuesta(programacion.encuestaId);
            console.log(`❌ Encuesta ${programacion.encuestaId} desactivada inmediatamente (ya debería estar inactiva)`);
        }
    }

    // Cancelar jobs dinámicos de una programación
    cancelarJobs(programacionId: number): void {
        try {
            this.schedulerRegistry.deleteTimeout(`activar-${programacionId}`);
            console.log(`🗑️ Job cancelado: activar-${programacionId}`);
        } catch (error) {
            // Job no existe, ignorar
        }

        try {
            this.schedulerRegistry.deleteTimeout(`desactivar-${programacionId}`);
            console.log(`🗑️ Job cancelado: desactivar-${programacionId}`);
        } catch (error) {
            // Job no existe, ignorar
        }
    }

    // Recargar todos los jobs al iniciar la aplicación
    async recargarTodosLosJobs(): Promise<void> {
        const programaciones = await this.prisma.encuestasActivacion.findMany({
            where: { activo: true }
        });

        for (const prog of programaciones) {
            await this.programarJobs(prog);
        }
    }

    // Activar encuesta
    async activarEncuesta(encuestaId: number): Promise<void> {
        await this.prisma.encuestas.update({
            where: { id: encuestaId },
            data: { estado: 'Activa' }
        });
    }

    // Desactivar encuesta
    async desactivarEncuesta(encuestaId: number): Promise<void> {
        await this.prisma.encuestas.update({
            where: { id: encuestaId },
            data: { estado: 'Inactiva' }
        });
    }

    // ========== CRON DE RESPALDO (cada hora) ==========

    @Cron(CronExpression.EVERY_HOUR)
    async verificarYActualizarEstados(): Promise<void> {
        console.log('🔍 Ejecutando verificación de respaldo (cron cada hora)...');
        const ahora = new Date();

        const programaciones = await this.prisma.encuestasActivacion.findMany({
            where: { activo: true },
            include: { encuesta: true }
        });

        for (const prog of programaciones) {
            const dentroDelRango = ahora >= new Date(prog.fechaInicio) && ahora <= new Date(prog.fechaFin);

            if (dentroDelRango && prog.encuesta.estado !== 'Activa') {
                await this.activarEncuesta(prog.encuestaId);
                console.log(`✅ [RESPALDO] Encuesta ${prog.encuestaId} activada`);
            }

            if (!dentroDelRango && prog.encuesta.estado === 'Activa') {
                await this.desactivarEncuesta(prog.encuestaId);
                console.log(`❌ [RESPALDO] Encuesta ${prog.encuestaId} desactivada`);
            }
        }
    }

    // Forzar verificación manual
    async verificarAhora(): Promise<{ message: string }> {
        await this.verificarYActualizarEstados();
        return { message: 'Verificación de estados completada' };
    }

}
