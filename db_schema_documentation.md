# Database Schema Documentation: MiseMap

This document details the database schema and security policies required for the multi-tenant architecture of the MiseMap application on Supabase.

---

## 1. Schema Diagram Overview

```mermaid
erDiagram
    auth_users ||--o| profiles : "has profile"
    organizations ||--o{ profiles : "has members"
    organizations ||--o{ kv_store : "scopes data"
    organizations ||--o{ org_join_requests : "receives requests"
    organizations ||--o{ org_invitations : "sends invitations"
    
    profiles {
        uuid id PK "references auth.users"
        uuid org_id FK "references organizations"
        text role "owner | member"
        text email "user email address"
        text username "user nickname/display name"
        timestamp updated_at
    }
    
    organizations {
        uuid id PK
        text name "organization name"
        uuid owner_id FK "references auth.users"
        text logo_url "organization brand logo"
        timestamp created_at
    }

    kv_store {
        uuid id PK
        uuid org_id FK "references organizations"
        text key "e.g., mm_rm, mm_int, mm_mi"
        text value "JSON stringified raw materials / intermediates / menu items"
        timestamp updated_at
    }

    org_join_requests {
        uuid id PK
        uuid org_id FK "references organizations"
        uuid user_id FK "references profiles"
        text status "'pending' | 'approved' | 'rejected'"
        timestamp created_at
    }

    org_invitations {
        uuid id PK
        uuid org_id FK "references organizations"
        text email "invited user email"
        text role "target role in org"
        timestamp created_at
    }
```

---

## 2. Table Specifications

### `organizations`
Stores tenant organizations.
*   `id` (`uuid`, Primary Key): Generated via `gen_random_uuid()`.
*   `name` (`text`, NOT NULL): The organization name.
*   `owner_id` (`uuid`, Foreign Key): References `auth.users(id)` (on delete set null).
*   `logo_url` (`text`, Optional): URL path to the organization profile logo.
*   `created_at` (`timestamptz`): Defaults to `now()`.

### `profiles`
Stores user profile information mapping individuals to organizations and roles.
*   `id` (`uuid`, Primary Key): References `auth.users(id)` (on delete cascade).
*   `org_id` (`uuid`, Foreign Key): References `organizations(id)` (on delete set null).
*   `role` (`text`): User role inside the tenant, defaults to `'member'` (`'owner'` or `'member'`).
*   `email` (`text`, Optional): Email address of the user.
*   `username` (`text`, Optional): Display name of the user.
*   `updated_at` (`timestamptz`): Defaults to `now()`.

### `org_join_requests`
Maintains user requests to join specific organizations.
*   `id` (`uuid`, Primary Key): Generated via `gen_random_uuid()`.
*   `org_id` (`uuid`, Foreign Key): References `organizations(id)` (on delete cascade).
*   `user_id` (`uuid`, Foreign Key): References `profiles(id)` (on delete cascade).
*   `status` (`text`): Default `'pending'`.
*   `created_at` (`timestamptz`): Defaults to `now()`.
*   *Constraint*: Unique combination of `user_id` and `org_id` to prevent duplicate requests.

### `org_invitations`
Tracks invites sent by organization owners to potential members.
*   `id` (`uuid`, Primary Key): Generated via `gen_random_uuid()`.
*   `org_id` (`uuid`, Foreign Key): References `organizations(id)` (on delete cascade).
*   `email` (`text`, NOT NULL): Target email invited.
*   `role` (`text`, NOT NULL): Defaults to `'member'`.
*   `created_at` (`timestamptz`): Defaults to `now()`.
*   *Constraint*: Unique combination of `org_id` and `email`.

### `kv_store`
Stores client application data blobs scoped per organization.
*   `id` (`uuid`, Primary Key): Generated via `gen_random_uuid()`.
*   `org_id` (`uuid`, Foreign Key): References `organizations(id)` (on delete cascade).
*   `key` (`text`, NOT NULL): Data keys (e.g. `mm_rm`, `mm_int`, `mm_mi`).
*   `value` (`text`, NOT NULL): JSON serialized array string.
*   `updated_at` (`timestamptz`): Defaults to `now()`.
*   *Constraint*: Unique combination of `org_id` and `key`.

---

## 3. Metadata Inspection Queries

Run these SQL scripts in the **Supabase Dashboard → SQL Editor** to fetch metadata details and verify schema status.

### Query A: Verify Table Existence and Row Counts
```sql
select 
    schemaname, 
    tablename, 
    tableowner, 
    hasindexes
from 
    pg_tables 
where 
    schemaname = 'public';
```

### Query B: Fetch Columns and Data Types
```sql
select 
    table_name, 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
from 
    information_schema.columns 
where 
    table_schema = 'public'
order by 
    table_name, 
    ordinal_position;
```

### Query C: List RLS Policies Enabled on Tables
```sql
select 
    schemaname, 
    tablename, 
    policyname, 
    permissive, 
    roles, 
    cmd, 
    qual, 
    with_check
from 
    pg_policies 
where 
    schemaname = 'public';
```

### Query D: Inspect Foreign Keys & Constraints
```sql
select 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name as foreign_table_name, 
    ccu.column_name as foreign_column_name 
from 
    information_schema.table_constraints as tc 
    join information_schema.key_column_usage as kcu
      on tc.constraint_name = kcu.constraint_name
      and tc.table_schema = kcu.table_schema
    join information_schema.constraint_column_usage as ccu
      on ccu.constraint_name = tc.constraint_name
      and ccu.table_schema = ccu.table_schema
where 
    tc.constraint_type = 'FOREIGN KEY' 
    and tc.table_schema = 'public';
```

---

## 4. Security Definer Helper Functions

To bypass Row Level Security (RLS) recursion issues when checking user organization settings on the `profiles` table itself, the following helper functions are implemented:

```sql
create or replace function get_my_org_id()
returns uuid
language sql
security definer
stable
as $$
  select org_id from public.profiles where id = auth.uid();
$$;

create or replace function get_my_role()
returns text
language sql
security definer
stable
as $$
  select role from public.profiles where id = auth.uid();
$$;
```

---

## 5. API Permission Grants

Explicit permissions are granted to standard Supabase API roles (`authenticated` and `anon`) on the schema and tables to prevent `403 (Forbidden)` or `permission denied` API errors:

```sql
-- Grant usage on public schema
grant usage on schema public to postgres, authenticated, anon, service_role;

-- Grant permissions on tables
grant all privileges on table public.organizations to postgres, authenticated, anon, service_role;
grant all privileges on table public.profiles to postgres, authenticated, anon, service_role;
grant all privileges on table public.org_join_requests to postgres, authenticated, anon, service_role;
grant all privileges on table public.org_invitations to postgres, authenticated, anon, service_role;
grant all privileges on table public.kv_store to postgres, authenticated, anon, service_role;

-- Grant usage on sequences
grant usage, select on all sequences in schema public to postgres, authenticated, anon, service_role;
```

---

## 6. Table Relationship Tweaks (Supabase Join Queries)

To perform nested API selections (e.g. `.select('*, profiles(email)')` inside `org_join_requests`), the `org_join_requests.user_id` column must explicitly target the public `profiles(id)` table instead of `auth.users(id)`. This exposes the foreign key relationship to the PostgREST cache:

```sql
-- Re-map foreign key constraint
alter table public.org_join_requests 
  drop constraint if exists org_join_requests_user_id_fkey;

alter table public.org_join_requests 
  add constraint org_join_requests_user_id_fkey 
  foreign key (user_id) 
  references public.profiles(id) 
  on delete cascade;
```

