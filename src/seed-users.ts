import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environmental variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const databaseUrl = process.env.DATABASE_URL;

if (!supabaseUrl || !supabaseServiceRoleKey || !databaseUrl) {
  console.error('ERROR: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and DATABASE_URL must be defined in .env');
  process.exit(1);
}

const pool = new Pool({ connectionString: databaseUrl });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function getOrCreateSupabaseUser(email: string, password: string) {
  console.log(`Buscando o creando usuario en Supabase Auth: ${email}...`);
  
  // 1. Check if user already exists
  const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
  if (listError) {
    throw new Error(`Error listing users: ${listError.message}`);
  }

  const existingUser = users.find(u => u.email === email);
  if (existingUser) {
    console.log(`Usuario existente encontrado con ID: ${existingUser.id}`);
    return existingUser.id;
  }

  // 2. Create the user if they do not exist
  const { data: { user }, error: createError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true
  });

  if (createError || !user) {
    throw new Error(`Error creating user: ${createError?.message || 'Unknown error'}`);
  }

  console.log(`Nuevo usuario creado en Supabase Auth con ID: ${user.id}`);
  return user.id;
}

async function main() {
  try {
    console.log('--- Iniciando Sembrado de Usuarios en Supabase Auth y Base de Datos local ---');

    // MIGRATION: Add usuario_id column to vendedores if missing in database
    try {
      console.log('Verificando/Agregando columna "usuario_id" en la tabla "vendedores"...');
      await prisma.$executeRawUnsafe(`
        ALTER TABLE public.vendedores 
        ADD COLUMN IF NOT EXISTS usuario_id uuid UNIQUE REFERENCES public.usuarios(id) ON DELETE SET NULL;
      `);
      console.log('Columna "usuario_id" verificada y vinculada en PostgreSQL.');
    } catch (err: any) {
      console.log('Aviso o error en migración SQL:', err.message);
    }

    // --- 1. Admin User ---
    const adminEmail = 'admin@concepcion.com';
    const adminUid = await getOrCreateSupabaseUser(adminEmail, 'Admin123!');

    console.log('Registrando Administrador en la tabla local "usuarios"...');
    await prisma.usuario.upsert({
      where: { id: adminUid },
      update: {
        usuario: 'admin',
        nombre: 'Administrador Concepción',
        rol: 'admin',
        activo: true
      },
      create: {
        id: adminUid,
        usuario: 'admin',
        contrasena_hash: 'auth_by_supabase',
        nombre: 'Administrador Concepción',
        rol: 'admin',
        activo: true
      }
    });
    console.log(`Administrador registrado con éxito.`);

    // --- 2. Vendor 1: Carlos Mendez ---
    const v1Email = 'vendedor1@concepcion.com';
    const v1Uid = await getOrCreateSupabaseUser(v1Email, 'Vendedor123!');

    console.log('Registrando Vendedor 1 en la tabla local "usuarios"...');
    await prisma.usuario.upsert({
      where: { id: v1Uid },
      update: {
        usuario: 'vendedor1',
        nombre: 'Carlos Mendez',
        rol: 'vendedor',
        activo: true
      },
      create: {
        id: v1Uid,
        usuario: 'vendedor1',
        contrasena_hash: 'auth_by_supabase',
        nombre: 'Carlos Mendez',
        rol: 'vendedor',
        activo: true
      }
    });

    console.log('Vinculando con la tabla "vendedores"...');
    const v1Db = await prisma.vendedor.findFirst({
      where: { nombre: { contains: 'Carlos' } }
    });

    if (v1Db) {
      await prisma.vendedor.update({
        where: { id: v1Db.id },
        data: { usuario_id: v1Uid }
      });
      console.log(`Vendedor Carlos Mendez (ID: ${v1Db.id}) vinculado con éxito.`);
    } else {
      const newV1 = await prisma.vendedor.create({
        data: {
          nombre: 'Carlos Mendez',
          telefono: '+591 71111111',
          avatar: 'CM',
          usuario_id: v1Uid,
          activo: true
        }
      });
      console.log(`Vendedor Carlos Mendez creado de cero (ID: ${newV1.id}) y vinculado.`);
    }

    // --- 3. Vendor 2: Juan Perez ---
    const v2Email = 'vendedor2@concepcion.com';
    const v2Uid = await getOrCreateSupabaseUser(v2Email, 'Vendedor123!');

    console.log('Registrando Vendedor 2 en la tabla local "usuarios"...');
    await prisma.usuario.upsert({
      where: { id: v2Uid },
      update: {
        usuario: 'vendedor2',
        nombre: 'Juan Perez',
        rol: 'vendedor',
        activo: true
      },
      create: {
        id: v2Uid,
        usuario: 'vendedor2',
        contrasena_hash: 'auth_by_supabase',
        nombre: 'Juan Perez',
        rol: 'vendedor',
        activo: true
      }
    });

    const v2Db = await prisma.vendedor.findFirst({
      where: { nombre: { contains: 'Juan' } }
    });

    if (v2Db) {
      await prisma.vendedor.update({
        where: { id: v2Db.id },
        data: { usuario_id: v2Uid }
      });
      console.log(`Vendedor Juan Perez (ID: ${v2Db.id}) vinculado con éxito.`);
    } else {
      const newV2 = await prisma.vendedor.create({
        data: {
          nombre: 'Juan Perez',
          telefono: '+591 72222222',
          avatar: 'JP',
          usuario_id: v2Uid,
          activo: true
        }
      });
      console.log(`Vendedor Juan Perez creado de cero (ID: ${newV2.id}) y vinculado.`);
    }

    // --- 4. Warehouse User: Encargado Almacén ---
    const almacenEmail = 'almacen@concepcion.com';
    const almacenUid = await getOrCreateSupabaseUser(almacenEmail, 'Almacen123!');

    console.log('Registrando Encargado de Almacén en la tabla local "usuarios"...');
    await prisma.usuario.upsert({
      where: { id: almacenUid },
      update: {
        usuario: 'almacen',
        nombre: 'Encargado Almacén y Producción',
        rol: 'almacen',
        activo: true
      },
      create: {
        id: almacenUid,
        usuario: 'almacen',
        contrasena_hash: 'auth_by_supabase',
        nombre: 'Encargado Almacén y Producción',
        rol: 'almacen',
        activo: true
      }
    });
    console.log(`Encargado de Almacén registrado con éxito.`);

    console.log('--- Proceso de Sembrado Completado Correctamente ---');
  } catch (error) {
    console.error('Error durante el sembrado de usuarios:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
