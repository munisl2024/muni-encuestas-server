import { Body, Controller, Delete, Get, HttpStatus, Param, Patch, Post, Query, Res, UseGuards } from '@nestjs/common';
import { PreguntasRespondidasService } from './preguntas-respondidas.service';
import { Prisma } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('preguntas-respondidas')
export class PreguntasRespondidasController {

  constructor(private readonly preguntasRespondidasService: PreguntasRespondidasService){}

  @UseGuards(JwtAuthGuard)
  @Get('encuestadores/:encuestaId')
  async getEncuestadores(
    @Res() res,
    @Param('encuestaId') encuestaId: number
  ): Promise<any> {

    const encuestadores = await this.preguntasRespondidasService.obtenerEncuestadores(Number(encuestaId));

    return res.status(HttpStatus.OK).json({
      success: true,
      message: 'Encuestadores obtenidos correctamente',
      encuestadores
    })

  }

  @UseGuards(JwtAuthGuard)
  @Get('agrupadas/:encuestaId')
  async getRespuestasAgrupadas(
    @Res() res,
    @Param('encuestaId') encuestaId: number,
    @Query('pagina') pagina?: number,
    @Query('itemsPorPagina') itemsPorPagina?: number,
    @Query('creatorUserId') creatorUserId?: number,
    @Query('genero') genero?: string,
    @Query('sigem') sigem?: string,
    @Query('fechaInicio') fechaInicio?: string,
    @Query('fechaFin') fechaFin?: string
  ): Promise<any> {

    // Convertir sigem a boolean si está presente
    let sigemBoolean: boolean | undefined = undefined;
    if (sigem === 'true') sigemBoolean = true;
    if (sigem === 'false') sigemBoolean = false;

    const data = await this.preguntasRespondidasService.obtenerRespuestasAgrupadas(
      Number(encuestaId),
      pagina ? Number(pagina) : 1,
      itemsPorPagina ? Number(itemsPorPagina) : 10,
      creatorUserId ? Number(creatorUserId) : undefined,
      genero || undefined,
      sigemBoolean,
      fechaInicio || undefined,
      fechaFin || undefined
    );

    return res.status(HttpStatus.OK).json({
      success: true,
      message: 'Respuestas agrupadas obtenidas correctamente',
      ...data
    })

  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async getId(@Res() res, @Param('id') id: number): Promise<any> {

    const preguntaRespondida = await this.preguntasRespondidasService.getId(id);

    return res.status(HttpStatus.OK).json({
      success: true,
      message: 'Pregunta respondida obtenida correctamente',
      preguntaRespondida
    })

  }

  @UseGuards(JwtAuthGuard)
  @Get()
  async getAll(@Res() res, @Query() query): Promise<any> {
    
    const { preguntasRespondidas, totalItems } = await this.preguntasRespondidasService.getAll(query);

    return res.status(HttpStatus.OK).json({
      success: true,
      message: 'Preguntas respondidas obtenidas correctamente',
      preguntasRespondidas,
      totalItems   
    })

  }

  @UseGuards(JwtAuthGuard)
  @Post()
  async insert(@Res() res, @Body() createData: Prisma.PreguntasRespondidasCreateInput): Promise<any> {

    const preguntaRespondida = await this.preguntasRespondidasService.insert(createData);

    return res.status(HttpStatus.CREATED).json({
      success: true,
      message: 'Pregunta respondida creada correctamente',
      preguntaRespondida
    })
  
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  async update(@Res() res, @Param('id') id: number, @Body() dataUpdate: Prisma.PreguntasRespondidasUpdateInput){

    const preguntaRespondida = await this.preguntasRespondidasService.update(id, dataUpdate);

    return res.status(HttpStatus.OK).json({
      success: true,
      message: 'Pregunta respondida actualizada correctamente',
      preguntaRespondida
    })

  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async delete(@Res() res, @Param('id') id: number){
    
    const preguntaRespondida = await this.preguntasRespondidasService.delete(id);

    return res.status(HttpStatus.OK).json({
      success: true,
      message: 'Pregunta respondida eliminada correctamente',
      preguntaRespondida
    })
  
  }

}
