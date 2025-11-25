import { Body, Controller, Delete, Get, HttpStatus, Param, Patch, Post, Query, Res, UseGuards } from '@nestjs/common';
import { PreguntasService } from './preguntas.service';
import { Prisma } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('preguntas')
export class PreguntasController {

  constructor(private readonly preguntasService: PreguntasService){}

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async getId(@Res() res, @Param('id') id: number): Promise<any> {

    const pregunta = await this.preguntasService.getId(id);
    
    return res.status(HttpStatus.OK).json({
      success: true,
      message: 'Pregunta obtenida correctamente',
      pregunta      
    })

  }

  @UseGuards(JwtAuthGuard)
  @Get()
  async getAll(@Res() res, @Query() query): Promise<any> {
    
    const { preguntas, totalItems } = await this.preguntasService.getAll(query);

    return res.status(HttpStatus.OK).json({
      success: true,
      message: 'Preguntas obtenidas correctamente',
      preguntas,
      totalItems   
    })

  }

  @UseGuards(JwtAuthGuard)
  @Post()
  async insert(@Res() res, @Body() createData: Prisma.PreguntasCreateInput): Promise<any> {

    const pregunta = await this.preguntasService.insert(createData);

    return res.status(HttpStatus.CREATED).json({
      success: true,
      message: 'Pregunta creada correctamente',
      pregunta
    })
  
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  async update(@Res() res, @Param('id') id: number, @Body() dataUpdate: Prisma.PreguntasUpdateInput){

    const pregunta = await this.preguntasService.update(id, dataUpdate);

    return res.status(HttpStatus.OK).json({
      success: true,
      message: 'Pregunta actualizada correctamente',
      pregunta
    })

  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async delete(@Res() res, @Param('id') id: number){

    const pregunta = await this.preguntasService.delete(id);

    return res.status(HttpStatus.OK).json({
      success: true,
      message: 'Pregunta dada de baja correctamente',
      pregunta
    })

  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/activar')
  async activate(@Res() res, @Param('id') id: number){

    const pregunta = await this.preguntasService.activate(id);

    return res.status(HttpStatus.OK).json({
      success: true,
      message: 'Pregunta activada correctamente',
      pregunta
    })

  }

  @UseGuards(JwtAuthGuard)
  @Patch('respuesta/:id/activar')
  async activateRespuesta(@Res() res, @Param('id') id: number){

    const respuesta = await this.preguntasService.activateRespuesta(id);

    return res.status(HttpStatus.OK).json({
      success: true,
      message: 'Respuesta activada correctamente',
      respuesta
    })

  }

  @UseGuards(JwtAuthGuard)
  @Patch('respuesta/:id/desactivar')
  async deactivateRespuesta(@Res() res, @Param('id') id: number){

    const respuesta = await this.preguntasService.deactivateRespuesta(id);

    return res.status(HttpStatus.OK).json({
      success: true,
      message: 'Respuesta desactivada correctamente',
      respuesta
    })

  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/reordenar')
  async reordenarPregunta(@Res() res, @Param('id') id: number, @Body() body: { direccion: 'arriba' | 'abajo' }){

    const result = await this.preguntasService.reordenarPregunta(id, body.direccion);

    return res.status(HttpStatus.OK).json({
      success: true,
      message: result.message
    })

  }

  @UseGuards(JwtAuthGuard)
  @Patch('respuesta/:id/reordenar')
  async reordenarRespuesta(@Res() res, @Param('id') id: number, @Body() body: { direccion: 'arriba' | 'abajo' }){

    const result = await this.preguntasService.reordenarRespuesta(id, body.direccion);

    return res.status(HttpStatus.OK).json({
      success: true,
      message: result.message
    })

  }

}
