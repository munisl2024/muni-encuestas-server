import { Controller, Get, Post, Req, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './local-auth.guard';
import { JwtAuthGuard } from './jwt-auth.guard';
import { JwtService } from '@nestjs/jwt';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private jwtService: JwtService,
  ) { }

  // Login
  @UseGuards(LocalAuthGuard)
  @Post('login')
  async login(@Req() req) {
    return this.authService.login(req.user);
  }

  // Profile + Renovacion de token
  @UseGuards(JwtAuthGuard)
  @Get('profile')
  async profile(@Req() req) {
    // Generacion de token
    const token = this.jwtService.sign(req.user);
    return {
      usuario: req.user,
      token: 'bearer ' + token
    };
  }
  
}