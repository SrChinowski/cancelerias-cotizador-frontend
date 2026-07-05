-- Extensión necesaria para gen_random_uuid()
create extension if not exists pgcrypto;

-- Enums usados en todo el proyecto (agrupados aquí para tener un solo lugar
-- de referencia; cada uno se usa en su tabla correspondiente más adelante)
create type rol_usuario as enum ('admin', 'ventas', 'construccion');
create type origen_enum as enum ('Nacional', 'Español');
create type acabado_enum as enum ('Natural', 'Negro', 'Blanco', 'Madera', 'Gris', 'Satín', 'Cromo', 'Oro');
create type medida_base_enum as enum ('Largo', 'Alto');
create type unidad_venta_enum as enum ('pieza', 'metro');
create type tipo_cobro_enum as enum ('Unidades', 'MetrosLineales', 'MetrosCuadrados', 'Perfil');
create type factor_tipo_enum as enum ('AluEspanol', 'AluNacional', 'Cristal', 'Templados', 'Persianas');
create type sat_tipo_enum as enum ('RegimenFiscal', 'UsoCFDI');
create type cotizacion_status as enum ('draft', 'sent', 'won', 'lost');
create type mosquitero_enum as enum ('No', 'Corredizo', 'Fijo');
