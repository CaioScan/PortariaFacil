import pg from 'pg';

export function databaseConfig(env = process.env) {
  if (!env.DATABASE_URL) throw new Error('Configure DATABASE_URL no arquivo privado .env.');
  const url = new URL(env.DATABASE_URL);
  url.searchParams.delete('sslmode');
  const schema = env.DATABASE_SCHEMA || 'portaria_facil';
  if (!/^[a-z_][a-z0-9_]{0,62}$/.test(schema)) throw new Error('DATABASE_SCHEMA inválido.');
  const dataSchema = env.DATA_SCHEMA || 'public';
  if (!/^[a-z_][a-z0-9_]{0,62}$/.test(dataSchema)) throw new Error('DATA_SCHEMA inválido.');
  return { connectionString: url.toString(), schema, dataSchema };
}

export function createDatabase(env = process.env) {
  const { connectionString, schema, dataSchema } = databaseConfig(env);
  const pool = new pg.Pool({
    connectionString, ssl: { rejectUnauthorized: true }, enableChannelBinding: true,
    max: 5, connectionTimeoutMillis: 15000, idleTimeoutMillis: 30000,
  });
  pool.on('error', () => console.error('Conexão com PostgreSQL interrompida.'));
  return { pool, schema, dataSchema };
}

export async function migrate({ pool, schema }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [`${schema}:schema-v1`]);
    await client.query(`CREATE SCHEMA IF NOT EXISTS ${schema}`);
    await client.query(`
      CREATE TABLE IF NOT EXISTS ${schema}.condominiums (
        id uuid PRIMARY KEY, code text UNIQUE NOT NULL, name text NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE TABLE IF NOT EXISTS ${schema}.units (
        id uuid PRIMARY KEY, condominium_id uuid NOT NULL REFERENCES ${schema}.condominiums(id),
        block text NOT NULL DEFAULT '', apartment text NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        UNIQUE(condominium_id, block, apartment), UNIQUE(id, condominium_id)
      );
      CREATE TABLE IF NOT EXISTS ${schema}.operators (
        id uuid PRIMARY KEY, condominium_id uuid NOT NULL REFERENCES ${schema}.condominiums(id),
        name text NOT NULL, email text NOT NULL UNIQUE, phone text NOT NULL DEFAULT '',
        role text NOT NULL CHECK (role IN ('admin','sindico')), password_hash text NOT NULL,
        active boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE TABLE IF NOT EXISTS ${schema}.residents (
        id uuid PRIMARY KEY, condominium_id uuid NOT NULL REFERENCES ${schema}.condominiums(id),
        unit_id uuid NOT NULL, name text NOT NULL, email text NOT NULL DEFAULT '', phone text NOT NULL,
        whatsapp_consent boolean NOT NULL DEFAULT false, active boolean NOT NULL DEFAULT true,
        created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
        FOREIGN KEY(unit_id, condominium_id) REFERENCES ${schema}.units(id, condominium_id),
        UNIQUE(id, condominium_id)
      );
      CREATE TABLE IF NOT EXISTS ${schema}.deliveries (
        id uuid PRIMARY KEY, reference bigint GENERATED ALWAYS AS IDENTITY UNIQUE,
        condominium_id uuid NOT NULL REFERENCES ${schema}.condominiums(id), resident_id uuid NOT NULL,
        resident_name text NOT NULL, unit_label text NOT NULL, carrier text NOT NULL DEFAULT '',
        description text NOT NULL, tracking_code text NOT NULL DEFAULT '',
        status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','delivered')),
        created_by uuid NOT NULL REFERENCES ${schema}.operators(id), created_at timestamptz NOT NULL DEFAULT now(),
        received_by text, delivered_at timestamptz, delivered_by uuid REFERENCES ${schema}.operators(id),
        FOREIGN KEY(resident_id, condominium_id) REFERENCES ${schema}.residents(id, condominium_id),
        CHECK ((status='pending' AND delivered_at IS NULL AND received_by IS NULL AND delivered_by IS NULL)
          OR (status='delivered' AND delivered_at IS NOT NULL AND received_by IS NOT NULL AND delivered_by IS NOT NULL))
      );
      CREATE TABLE IF NOT EXISTS ${schema}.sessions (
        token_hash text PRIMARY KEY, operator_id uuid NOT NULL REFERENCES ${schema}.operators(id) ON DELETE CASCADE,
        csrf_token text NOT NULL, expires_at timestamptz NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS resident_condo_idx ON ${schema}.residents(condominium_id);
      CREATE INDEX IF NOT EXISTS delivery_condo_idx ON ${schema}.deliveries(condominium_id, created_at DESC);
      CREATE INDEX IF NOT EXISTS session_expiry_idx ON ${schema}.sessions(expires_at);
    `);
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
