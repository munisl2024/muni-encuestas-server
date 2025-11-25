import { Body, Controller, Delete, Get, HttpStatus, Param, Patch, Post, Query, Res, UseGuards } from '@nestjs/common';
import { RespuestasService } from './respuestas.service';
import { Prisma } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('respuestas')
export class RespuestasController {
  
  constructor(private readonly respuestasService: RespuestasService){}

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async getId(@Res() res, @Param('id') id: number): Promise<any> {

    const respuesta = await this.respuestasService.getId(id);
    
    return res.status(HttpStatus.OK).json({
      success: true,
      message: 'Respuesta obtenida correctamente',
      respuesta      
    })

  }

  @UseGuards(JwtAuthGuard)
  @Get()
  async getAll(@Res() res, @Query() query): Promise<any> {
    
    const { respuestas, totalItems } = await this.respuestasService.getAll(query);

    return res.status(HttpStatus.OK).json({
      success: true,
      message: 'Respuestas obtenidas correctamente',
      respuestas,
      totalItems   
    })

  }

  @UseGuards(JwtAuthGuard)
  @Post()
  async insert(@Res() res, @Body() createData: Prisma.RespuestasCreateInput): Promise<any> {

    const respuesta = await this.respuestasService.insert(createData);

    return res.status(HttpStatus.CREATED).json({
      success: true,
      message: 'Respuesta creada correctamente',
      respuesta
    })
  
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  async update(@Res() res, @Param('id') id: number, @Body() dataUpdate: Prisma.RespuestasUpdateInput){

    const respuesta = await this.respuestasService.update(id, dataUpdate);

    return res.status(HttpStatus.OK).json({
      success: true,
      message: 'Respuesta actualizada correctamente',
      respuesta
    })

  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async delete(@Res() res, @Param('id') id: number){
    
    const respuesta = await this.respuestasService.delete(id);

    return res.status(HttpStatus.OK).json({
      success: true,
      message: 'Respuesta eliminada correctamente',
      respuesta
    })
  
  }

}
