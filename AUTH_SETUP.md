# Configuración de Autenticación con NextAuth.js

## ✅ Completado
He configurado tu sistema de login con NextAuth.js. Aquí está lo que hice:

### 1. **Instalación de dependencias**
   - ✅ `next-auth`: Framework de autenticación para Next.js
   - ✅ `bcryptjs`: Para hashear contraseñas de forma segura

### 2. **Archivos creados**

| Archivo | Propósito |
|---------|-----------|
| `lib/auth.ts` | Configuración de NextAuth y estrategia de autenticación |
| `lib/prisma.ts` | Instancia de cliente Prisma optimizada |
| `app/api/auth/[...nextauth]/route.ts` | API route para manejar autenticación |
| `middleware.ts` | Middleware para proteger rutas |
| `app/auth/layout.tsx` | Layout para páginas de autenticación |
| `app/auth/login/page.tsx` | Página de login |
| `components/auth/logout-button.tsx` | Botón de logout |

### 3. **Schema actualizado**
   - ✅ Hice `username` único en la tabla `User`

### 4. **Seed actualizado**
   - ✅ Crea un usuario de prueba: `admin` con contraseña `123456`

### 5. **Variables de entorno**
   - ✅ Agregué `NEXTAUTH_SECRET` con una clave segura
   - ✅ Agregué `NEXTAUTH_URL` apuntando a `http://localhost:3000`

### 6. **Navbar actualizado**
   - ✅ Agregué botón de logout

---

## 🚀 Próximos pasos

### 1. Sincronizar la base de datos
```bash
npx prisma migrate dev --name add_username_unique
```
O si prefieres saltarte las migraciones:
```bash
npx prisma db push
```

### 2. Ejecutar el seed
```bash
npx prisma db seed
```
Esto creará el usuario de prueba (admin / 123456)

### 3. Iniciar la aplicación
```bash
npm run dev
```

### 4. Probar el login
- Ve a `http://localhost:3000`
- Te redirigirá automáticamente a `/auth/login`
- Usa las credenciales: `admin` / `123456`

---

## 🔐 Flujo de autenticación

1. **Login**: El usuario entra credenciales en `/auth/login`
2. **Validación**: NextAuth valida contra la BD usando Prisma
3. **JWT**: Se genera un JWT encriptado y se guarda en una cookie
4. **Middleware**: Todas las rutas (excepto `/auth`) están protegidas
5. **Logout**: El botón de logout limpia la sesión

---

## 📝 Para crear más usuarios

Desde el código (en un API route o script):
```typescript
import { hashSync } from 'bcryptjs';
import { prisma } from '@/lib/prisma';

const user = await prisma.user.create({
  data: {
    username: 'newuser',
    name: 'New User',
    email: 'newuser@example.com',
    password: hashSync('password123', 10),
    role: 'WORKER',
  },
});
```

---

## 🛡️ Notas de seguridad

- ✅ Las contraseñas se hashean con bcryptjs (10 rounds)
- ✅ Las sesiones usan JWT (no cookies de sesión simple)
- ✅ El middleware protege todas las rutas excepto `/auth`
- ✅ NEXTAUTH_SECRET debe ser una clave aleatoria (ya la generé)
- ⚠️ En producción, usa `NEXTAUTH_URL` con tu dominio real

---

## 🐛 Si hay problemas

### "Invalid credentials"
- Verifica que el usuario existe en la BD
- Verifica que la contraseña sea correcta

### Middleware no redirige
- Recarga la página
- Verifica que no estés en `/auth/*`

### Error de conexión a BD
- Verifica `DATABASE_URL` en `.env`
- Verifica que la BD esté accesible

---

## 🎯 Próximas mejoras (opcionales)

- [ ] Panel de administración para crear/editar usuarios
- [ ] Recuperación de contraseña por email
- [ ] Two-factor authentication (2FA)
- [ ] Auditoria de logins
- [ ] Cambio de contraseña

