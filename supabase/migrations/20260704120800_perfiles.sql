create table perfiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nombre text not null,
  telefono text,
  correo text,
  rol rol_usuario not null default 'ventas',
  created_at timestamptz default now()
);
