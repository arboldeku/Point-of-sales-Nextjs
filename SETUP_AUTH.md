# 🔐 POS Authentication Setup Guide

Este documento explica cómo configurar el sistema de autenticación y permisos en el POS.

---

## 📋 Prerequisites

- Node.js 18+ instalado
- npm o yarn
- Acceso a Supabase proyecto
- Git

---

## 🚀 Setup Quick Start (5 minutos)

### 1. Instalar dependencias

```bash
npm install
# Esto instala: jsonwebtoken, bcryptjs, @supabase/supabase-js, etc.
```

### 2. Configurar variables de entorno

Copia `.env.example` a `.env.local` y llena tus credenciales de Supabase:

```bash
cp .env.example .env.local
```

Abre `.env.local` y reemplaza:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-actual-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...  # Copy from Supabase Settings
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...      # Copy from Supabase Settings
JWT_SECRET=my-secret-key-at-least-32-chars
```

**Dónde encontrar las claves:**
1. Abre tu proyecto en Supabase
2. Ve a **Settings → API → Project API Keys**
3. Copia `anon public` y `service_role secret`

### 3. Inicializar contraseñas de Admin

```bash
npm run init:auth
```

Te pedirá:
1. **Contraseña para admin_user:** Tu contraseña
2. **Contraseña para sergi_user:** Contraseña de Sergi

⚠️ Mínimo 8 caracteres.

```
🔐 POS Authentication Setup

Contraseña para admin_user: ••••••••
Contraseña para sergi_user: ••••••••

⏳ Hasheando contraseñas...
📤 Actualizando Supabase...

✅ ¡Autenticación configurada!

Ahora puedes iniciar sesión con:
  👤 admin_user (tu contraseña)
  👤 sergi_user (contraseña de Sergi)
```

### 4. Iniciar servidor

```bash
npm run dev
```

Abre: **http://localhost:3000/login**

---

## 🔓 First Login

1. Ve a **http://localhost:3000/login**
2. Username: `admin_user` 
3. Password: La que configuraste en el paso 3
4. Click **🔓 Entrar**

✅ Serás redirigido al dashboard

---

## 📊 Usuarios y Roles

### Admin (Admins: tú + Sergi)

✅ Todos los permisos:
- SELL_PRODUCT
- APPLY_DISCOUNT_ON_SALE
- CREATE_PRODUCT
- DELETE_PRODUCT
- CREATE_USER
- DELETE_USER
- VIEW_REPORTS
- MODIFY_REPORTS
- VIEW_TRANSACTIONS
- DELETE_TRANSACTION

### Member (Camareros/Vendedores)

✅ Limitados a:
- SELL_PRODUCT
- VIEW_REPORTS
- MODIFY_REPORTS
- VIEW_TRANSACTIONS

### User (Consulta)

✅ Limitados a:
- VIEW_REPORTS
- VIEW_TRANSACTIONS

---

## 🛂 Integrando con tus rutas

Para proteger endpoints, usa el contexto de autenticación:

### En componentes React:

```typescript
'use client'

import { useAuth } from '@/contexts/AuthContext'

export default function MyComponent() {
  const { user, hasPermission, logout } = useAuth()

  if (!user) return <p>No autenticado</p>

  // Mostrar solo si tiene permiso
  if (hasPermission('DELETE_PRODUCT')) {
    return <button>🗑️ Eliminar</button>
  }

  return null
}
```

### En API endpoints:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { hasPermission, logAudit } from '@/lib/permissions'

export async function DELETE(req: NextRequest) {
  const token = req.headers.get('authorization')?.slice(7)
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const payload = verifyToken(token)
  const allowed = await hasPermission(payload!.role, 'DELETE_PRODUCT')

  if (!allowed) {
    // Log denied attempt
    await logAudit(payload!.userId, 'DELETE_PRODUCT', 'Product', '123', 'DENIED')
    return NextResponse.json(
      { error: 'No tienes permiso', allowed: false },
      { status: 403 }
    )
  }

  // Procede con la acción
  return NextResponse.json({ success: true })
}
```

---

## 🔐 Flujos Importantes

### Login

```
POST /api/auth/login
{
  "username": "admin_user",
  "password": "..."
}

← Response:
{
  "success": true,
  "token": "eyJ...",
  "user": {
    "id": "uuid",
    "username": "admin_user",
    "email": "admin@posticket.local",
    "role": "Admin"
  }
}
```

### Logout

```
POST /api/auth/logout
Headers: Authorization: Bearer <token>

← Response:
{ "success": true }
```

### Get Current User

```
GET /api/auth/me
Headers: Authorization: Bearer <token>

← Response:
{
  "user": { ... },
  "token": "eyJ..."
}
```

---

## 📝 Auditoría

Cada intento de acceso se registra en tabla `audit_log`:

- ✅ Logins exitosos
- ❌ Intentos fallidos
- ⚠️ Accesos denegados por permisos
- 📊 Cambios de datos (venta, producto, etc.)

**Ver auditoría:**

Supabase → SQL Editor → 

```sql
SELECT user_id, action, permission_check, timestamp 
FROM audit_log 
ORDER BY timestamp DESC 
LIMIT 50;
```

---

## 🔄 Cambiar contraseña de usuario

Ejecuta el script nuevamente:

```bash
npm run init:auth
```

O manualmente en Supabase:

```sql
UPDATE users 
SET password_hash = crypt('new_password', gen_salt('bf'))
WHERE username = 'admin_user';
```

---

## ⚠️ Troubleshooting

### "Login failed: Usuario o contraseña incorrectos"

- ✅ ¿Ejecutaste `npm run init:auth`?
- ✅ ¿Las credenciales en `.env.local` son correctas?
- ✅ ¿Conecta a la base de datos correcta en Supabase?

### "Error: Can't find module 'jsonwebtoken'"

```bash
npm install jsonwebtoken bcryptjs --save
```

### Token inválido / expirado

- Tokens expiran en 7 días
- El usuario debe hacer login nuevamente
- Las sesiones se guardan en tabla `sessions`

### "No tienes permiso para esta acción"

- El usuario no tiene el permiso requerido para esa acción
- Un Admin puede crear más usuarios o cambiar roles
- El intento fue registrado en `audit_log`

---

## 📋 Archivo Checklist

Antes de commitear, verifica que tengas:

- [x] `lib/auth.ts` — Funciones de criptografía
- [x] `lib/permissions.ts` — Lógica de permisos
- [x] `lib/supabase-auth.ts` — Cliente Supabase
- [x] `app/api/auth/login/route.ts` — Endpoint login
- [x] `app/api/auth/logout/route.ts` — Endpoint logout
- [x] `app/api/auth/me/route.ts` — Endpoint get user
- [x] `contexts/AuthContext.tsx` — React context
- [x] `app/login/page.tsx` — Pantalla de login
- [x] `scripts/init-auth.ts` — Script de inicialización
- [x] `.env.local` — Variables de entorno (NO commitear)
- [x] `package.json` — Actualizado con dependencias

---

## 🚀 Next Steps

1. ✅ Completar setup anterior
2. Login con `admin_user`
3. Proteger endpoints de API con `requirePermission()`
4. Mostrar/ocultar botones con `hasPermission()`
5. Integrar `user_id` en `scan_events` de Supabase

---

## 📞 Support

Si tienes problemas:

1. Revisa los logs del servidor: `npm run dev`
2. Abre Supabase → Logs → API para ver errores
3. Verifica que las tablas estén creadas: Supabase → SQL Editor → `SELECT * FROM users;`

---

**Creado:** 2026-05-06
**Versión:** 1.0
**Status:** ✅ Listo para usar
