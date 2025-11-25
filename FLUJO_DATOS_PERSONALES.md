# Flujo de Guardado de Datos Personales en PersonaEncuestaRespondida

## ✅ Estado: Completamente Implementado

Este documento describe el flujo completo de cómo los datos personales del encuestado se guardan en la tabla `PersonaEncuestaRespondida`.

---

## 📋 Schema de Base de Datos

**Tabla:** `PersonaEncuestaRespondida`

Campos:
- `id` - INT (Primary Key, Auto Increment)
- `encuestaRespondidaId` - INT (Foreign Key → EncuestasRespondidas)
- `email` - VARCHAR(255) - Default: ''
- `rangoEdad` - VARCHAR(50) - Default: '18-25'
- `sigem` - BOOLEAN - Default: false
- `genero` - VARCHAR(50) - Default: 'Masculino'
- `telefono` - VARCHAR(255) - Default: ''
- `activo` - BOOLEAN - Default: true
- `createdAt` - DATETIME
- `updatedAt` - DATETIME
- `creatorUserId` - INT (Foreign Key → Usuarios)

---

## 🔄 Flujo Completo

### 1️⃣ FRONTEND - Recolección de Datos

**Archivo:** `client/src/app/pages/public/encuesta/encuesta.component.ts`

```typescript
public datosPersonales = {
  email: '',
  sigem: false,
  genero: 'Masculino',
  telefono: '',
  rangoEdad: '18-25'
};
```

**Formulario HTML:** `client/src/app/pages/public/encuesta/encuesta.component.html`
- Campos obligatorios: email y telefono
- Campos opcionales: género, rangoEdad, sigem
- Validación: `datosPersonalesCompletos()` verifica email y telefono

### 2️⃣ FRONTEND - Envío al Backend

**Método:** `enviarRespuestas()` (línea 115)

```typescript
this.encuestasService.responderEncuesta(
  String(this.encuesta.id),
  userId,
  respuestas,
  this.datosPersonales  // ← Datos personales incluidos aquí
).subscribe({...});
```

### 3️⃣ SERVICIO ANGULAR - HTTP Request

**Archivo:** `client/src/app/services/encuestas.service.ts`

```typescript
responderEncuesta(
  encuestaId: string,
  usuarioId: number,
  respuestas: Array<{ preguntaId: number; respuestaId: number }>,
  datosPersonales?: {
    email: string;
    sigem: boolean;
    genero: string;
    telefono: string;
    rangoEdad: string
  }
): Observable<any> {
  return this.http.post(`${urlApi}/${encuestaId}/responder`, {
    usuarioId,
    respuestas,
    datosPersonales  // ← Enviado al backend
  }, {
    headers: this.getToken
  })
}
```

**Endpoint:** `POST /api/encuestas/:id/responder`

### 4️⃣ BACKEND - Controller

**Archivo:** `server/src/modules/encuestas/encuestas.controller.ts`

```typescript
@Post(':id/responder')
async responderEncuesta(
  @Res() res,
  @Param('id') encuestaId: number,
  @Body() body: {
    usuarioId: number;
    respuestas: Array<{ preguntaId: number; respuestaId: number }>;
    datosPersonales?: {
      email: string;
      sigem: boolean;
      genero: string;
      telefono: string;
      rangoEdad: string
    };
  }
): Promise<any> {
  const encuestaRespondida = await this.encuestasService.responderEncuesta(
    Number(encuestaId),
    Number(body.usuarioId),
    body.respuestas,
    body.datosPersonales  // ← Pasado al servicio
  );
  // ...
}
```

### 5️⃣ BACKEND - Service (Guardado en BD)

**Archivo:** `server/src/modules/encuestas/encuestas.service.ts` (líneas 626-640)

```typescript
async responderEncuesta(
  encuestaId: number,
  usuarioId: number,
  respuestas: Array<{ preguntaId: number; respuestaId: number }>,
  datosPersonales?: {
    email: string;
    sigem: boolean;
    genero: string;
    telefono: string;
    rangoEdad: string
  }
): Promise<any> {

  // ... validaciones ...

  // Transacción para garantizar integridad de datos
  const encuestaRespondida = await this.prisma.$transaction(async (prisma) => {

    // 1. Crear EncuestasRespondidas
    const encuestaResp = await prisma.encuestasRespondidas.create({
      data: {
        encuestaId,
        creatorUserId: usuarioId
      }
    });

    // 2. 🔥 CREAR REGISTRO EN PersonaEncuestaRespondida
    let personaEncuesta = null;
    if (datosPersonales) {
      personaEncuesta = await prisma.personaEncuestaRespondida.create({
        data: {
          encuestaRespondidaId: encuestaResp.id,  // ← Relación con encuesta respondida
          email: datosPersonales.email || '',
          sigem: datosPersonales.sigem || false,
          genero: datosPersonales.genero || 'Masculino',
          telefono: datosPersonales.telefono || '',
          rangoEdad: datosPersonales.rangoEdad || '18-25',  // ← Campo agregado
          creatorUserId: usuarioId
        }
      });
    }

    // 3. Crear PreguntasRespondidas
    const preguntasRespondidas = await Promise.all(...);

    // 4. Retornar todo
    return {
      ...encuestaResp,
      personaEncuesta,  // ← Incluido en respuesta
      preguntasRespondidas
    };
  });

  return encuestaRespondida;
}
```

---

## ✅ Verificaciones Realizadas

1. ✅ Schema de Prisma actualizado con campo `rangoEdad`
2. ✅ Base de datos sincronizada (`npx prisma db push`)
3. ✅ Cliente de Prisma regenerado (`npx prisma generate`)
4. ✅ Frontend recolecta todos los campos requeridos
5. ✅ Validación de campos obligatorios (email, telefono)
6. ✅ Servicio Angular envía datos al backend
7. ✅ Controller recibe datos en endpoint POST
8. ✅ Service guarda datos en transacción de BD
9. ✅ Relaciones de Foreign Keys configuradas correctamente

---

## 🧪 Cómo Probar

1. Iniciar el servidor backend: `npm run start:dev`
2. Iniciar el cliente Angular: `cd client && ng serve`
3. Navegar a una encuesta activa
4. Completar formulario de datos personales:
   - Email (obligatorio)
   - Teléfono (obligatorio)
   - Género (opcional, default: Masculino)
   - Rango de Edad (opcional, default: 18-25)
   - SIGEM (opcional, default: false)
5. Responder todas las preguntas
6. Hacer clic en "Enviar respuestas"
7. Verificar en base de datos que el registro fue creado:
   ```sql
   SELECT * FROM PersonaEncuestaRespondida ORDER BY id DESC LIMIT 1;
   ```

---

## 📊 Estructura de la Transacción

La operación de guardar es **atómica** gracias a `$transaction`:

```
BEGIN TRANSACTION
  ↓
  1. INSERT INTO EncuestasRespondidas
  ↓
  2. INSERT INTO PersonaEncuestaRespondida (con encuestaRespondidaId)
  ↓
  3. INSERT INTO PreguntasRespondidas (múltiples registros)
  ↓
COMMIT
```

Si cualquier paso falla, toda la transacción se revierte (rollback).

---

## 🎯 Campos del Selector de Rango de Edad

- "18-25" → 18-25 años
- "26-35" → 26-35 años
- "36-45" → 36-45 años
- "46-55" → 46-55 años
- "56-65" → 56-65 años
- "65+" → 65+ años

---

## 🔗 Relaciones de Base de Datos

```
Usuarios (1) ----< (N) EncuestasRespondidas
                         ↓ (1)
                         |
                         ↓ (N)
              PersonaEncuestaRespondida (1:1)
```

Cada `EncuestasRespondidas` puede tener 0 o 1 registro en `PersonaEncuestaRespondida`.

---

## 📝 Notas Importantes

1. Los datos personales son **opcionales** - si no se proporcionan, solo se guarda la encuesta respondida
2. Los campos `email` y `telefono` son obligatorios según la lógica del frontend
3. El campo `rangoEdad` es nuevo y está completamente integrado
4. El `creatorUserId` en `PersonaEncuestaRespondida` es el ID del usuario que respondió la encuesta
5. La tabla usa soft deletes (`activo` = true/false)

---

## ✨ Estado Final: IMPLEMENTACIÓN COMPLETA Y FUNCIONAL ✨
