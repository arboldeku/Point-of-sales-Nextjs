import * as dotenv from 'dotenv'
import bcrypt from 'bcryptjs'
import { createClient } from '@supabase/supabase-js'
import * as readline from 'readline'

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' })

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
})

const question = (prompt: string): Promise<string> => {
  return new Promise((resolve) => {
    rl.question(prompt, (answer: string) => {
      resolve(answer)
    })
  })
}

async function initAuth() {
  console.log('\n🔐 POS Authentication Setup\n')
  console.log('Este script inicializa las contraseñas de los usuarios Admin en Supabase.\n')

  // Get your password
  const adminPassword = await question('Contraseña para admin_user: ')
  if (adminPassword.length < 8) {
    console.error('❌ La contraseña debe tener mínimo 8 caracteres')
    process.exit(1)
  }

  // Get Sergi's password
  const sergiPassword = await question('Contraseña para sergi_user: ')
  if (sergiPassword.length < 8) {
    console.error('❌ La contraseña debe tener mínimo 8 caracteres')
    process.exit(1)
  }

  // Hash passwords
  console.log('\n⏳ Hasheando contraseñas...')
  const adminHash = await bcrypt.hash(adminPassword, 10)
  const sergiHash = await bcrypt.hash(sergiPassword, 10)

  // Check environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Faltan variables de entorno en .env.local:')
    console.error('   - NEXT_PUBLIC_SUPABASE_URL')
    console.error('   - SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
  }

  // Update in Supabase
  const supabase = createClient(supabaseUrl, supabaseKey)

  console.log('\n📤 Actualizando Supabase...')

  const { error: adminError } = await supabase
    .from('users')
    .update({ password_hash: adminHash })
    .eq('username', 'admin_user')

  const { error: sergiError } = await supabase
    .from('users')
    .update({ password_hash: sergiHash })
    .eq('username', 'sergi_user')

  if (adminError || sergiError) {
    console.error('❌ Error actualizando usuarios:', adminError || sergiError)
    process.exit(1)
  }

  console.log('\n✅ ¡Autenticación configurada!')
  console.log('\nAhora puedes iniciar sesión con:')
  console.log('  👤 admin_user (tu contraseña)')
  console.log('  👤 sergi_user (contraseña de Sergi)')
  console.log('\nInicia el servidor: npm run dev')
  console.log('Ve a: http://localhost:3000/login\n')

  rl.close()
}

initAuth().catch(console.error)
