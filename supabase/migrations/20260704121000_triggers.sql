-- Ni el botón de "actualizar precios", ni un fix rápido, ni un agente
-- developer con prisa pueden tocar una partida de una cotización ya
-- confirmada (won). Si hace falta corregir algo, el flujo correcto es
-- reabrir la cotización (regresar status a 'sent') a propósito.
create or replace function bloquear_edicion_partida_confirmada()
returns trigger as $$
begin
  if exists (
    select 1 from cotizaciones
    where id = new.cotizacion_id and status = 'won'
  ) then
    raise exception 'No se puede modificar una partida de una cotización confirmada (won)';
  end if;
  return new;
end;
$$ language plpgsql;

create trigger trg_bloquear_edicion_partida
before update on partidas
for each row execute function bloquear_edicion_partida_confirmada();
