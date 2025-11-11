// lib/supabase.js
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables. Please check your .env file.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
})


// // | table_name    | column_name     | data_type                   | is_nullable |
// | ------------- | --------------- | --------------------------- | ----------- |
// | notifications | id              | uuid                        | NO          |
// | notifications | tenant_id       | uuid                        | YES         |
// | notifications | type            | character varying           | NO          |
// | notifications | message         | text                        | NO          |
// | notifications | sent_at         | timestamp without time zone | YES         |
// | notifications | status          | character varying           | YES         |
// | tenants       | id              | uuid                        | NO          |
// | tenants       | unit_id         | uuid                        | NO          |
// | tenants       | name            | text                        | NO          |
// | tenants       | email           | text                        | YES         |
// | tenants       | phone           | text                        | YES         |
// | tenants       | created_at      | timestamp with time zone    | YES         |
// | tenants       | commission_rate | numeric                     | YES         |