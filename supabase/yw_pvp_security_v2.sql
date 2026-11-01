-- Phase25 security hardening: anonymous guest claim uses RLS and
-- a SECURITY INVOKER trigger, no public SECURITY DEFINER callable RPC.
drop function if exists public.yw_join_room_v1(text);
drop policy if exists yw_rooms_guest_claim on public.yw_rooms_v1;
create policy yw_rooms_guest_claim on public.yw_rooms_v1
 for update to authenticated using (
  phase='lobby' and guest_uid is null and host_uid <> (select auth.uid())
 ) with check (
  phase='lobby' and guest_uid = (select auth.uid()) and
  host_uid <> (select auth.uid())
 );
create or replace function public.yw_room_update_fence_v1()
 returns trigger language plpgsql security invoker set search_path='' as $$
declare me uuid := auth.uid();
begin
 if tg_op = 'UPDATE' then
  if new.code<>old.code or new.host_uid<>old.host_uid or
   new.session<>old.session or new.created_at<>old.created_at then
   raise exception 'immutable_room_identity';
  end if;
  if old.phase <> 'lobby' and new.phase <> old.phase then
   raise exception 'room_phase_closed';
  end if;
  if old.phase='lobby' and new.phase not in ('lobby','playing') then
   raise exception 'room_phase_invalid';
  end if;
  if old.guest_uid is not null and new.guest_uid is distinct from old.guest_uid then
   raise exception 'guest_seat_immutable';
  end if;
  if old.guest_uid is null and new.guest_uid is not null
    and new.guest_uid=old.host_uid then
   raise exception 'host_cannot_join_as_guest';
  end if;
  if me is distinct from old.host_uid then
   if old.phase<>'lobby' or old.guest_uid is not null or
    new.guest_uid is distinct from me or new.phase<>old.phase then
     raise exception 'only_empty_guest_seat_may_be_claimed';
   end if;
  else
   if new.guest_uid is distinct from old.guest_uid then
    raise exception 'host_cannot_assign_guest';
   end if;
   if new.phase='playing' and old.phase='lobby' and old.guest_uid is null then
    raise exception 'guest_required_before_start';
   end if;
  end if;
 end if;
 return new;
end; $$;
drop trigger if exists yw_room_update_fence_v1 on public.yw_rooms_v1;
create trigger yw_room_update_fence_v1 before update on public.yw_rooms_v1
 for each row execute function public.yw_room_update_fence_v1();
-- A signed-in user may not forge an author on state or input updates.
-- Existing tables remain private to authenticated IDs via RLS.
