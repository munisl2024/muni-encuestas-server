import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { JWT_CONFIG } from "src/constants/jwt";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy){
    
    constructor(){
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpliration: false,
            secretOrKey: JWT_CONFIG.secret
        });
    }

    async validate(payload: any){
        return { 
            userId: payload.userId, 
            usuario: payload.usuario,
            dni: payload.dni,
            email: payload.email,
            apellido: payload.apellido,
            nombre: payload.nombre,
            permisos: payload.permisos,
            role: payload.role
        }
    }

}