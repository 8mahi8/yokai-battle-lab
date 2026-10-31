-- Phase25 Supabase game transport, isolated from existing 3d-soccer data.
-- Auth anonymous users have role "authenticated", NOT "anon".
-- No service_role, public writes or user profile information in the browser.
create table if not exists public.yw_rooms_v1 (
  code text primary key check (code ~ '^[0-9]{6}$'),
  session text not null check (session ~ '^[a-f0-9]{32}$'),
  host_uid uuid not null default auth.uid(),
  guest_uid uuid,
  phase text not null default 'lobby' check (phase in ('lobby','playing','finished')),
  created_at timestamptz not null default now(),
  constraint yw_room_distinct_members check (guest_uid is null or guest_uid <> host_uid)
);
create table if not exists public.yw_states_v1 (
  room_code text primary key references public.yw_rooms_v1(code),
  session text not null check (session ~ '^[a-f0-9]{32}$'),
  revision bigint not null check (revision between 0 and 100000),
  state_json text not null check (octet_length(state_json) <= 131072),
  author_uid uuid not null default auth.uid(),
  written_at timestamptz not null default now()
);
create table if not exists public.yw_inputs_v1 (
  room_code text not null references public.yw_rooms_v1(code),
  session text not null check (session ~ '^[a-f0-9]{32}$'),
  client_seq bigint not null check (client_seq between 1 and 100000),
  intent jsonb not null check (
    jsonb_typeof(intent) = 'object' and
    intent ? 'type' and
    octet_length(intent::text) <= 2048
  ),
  sender_uid uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  primary key(room_code, client_seq)
);
create table if not exists public.yw_presence_v1 (
  room_code text not null references public.yw_rooms_v1(code),
  seat text not null check (seat in ('host','guest')),
  owner_uid uuid not null default auth.uid(),
  last_seen timestamptz not null default now(),
  primary key(room_code,seat)
);
create index if not exists yw_inputs_room_seq_idx on public.yw_inputs_v1(room_code,client_seq);
create index if not exists yw_rooms_created_idx on public.yw_rooms_v1(created_at);

alter table public.yw_rooms_v1 enable row level security;
alter table public.yw_states_v1 enable row level security;
alter table public.yw_inputs_v1 enable row level security;
alter table public.yw_presence_v1 enable row level security;

revoke all on table public.yw_rooms_v1,public.yw_states_v1,
  public.yw_inputs_v1,public.yw_presence_v1 from anon,authenticated;
grant select,insert,update on table public.yw_rooms_v1 to authenticated;
grant select,insert,update on table public.yw_states_v1 to authenticated;
grant select,insert on table public.yw_inputs_v1 to authenticated;
grant select,insert,update on table public.yw_presence_v1 to authenticated;

create policy yw_rooms_select on public.yw_rooms_v1
 for select to authenticated using (
   phase = 'lobby' or host_uid = (select auth.uid()) or guest_uid = (select auth.uid())
 );
create policy yw_rooms_create on public.yw_rooms_v1
 for insert to authenticated with check (
   host_uid=(select auth.uid()) and guest_uid is null and phase='lobby'
 );
create policy yw_rooms_host_update on public.yw_rooms_v1
 for update to authenticated using (host_uid=(select auth.uid()))
 with check (host_uid=(select auth.uid()));
create policy yw_states_members_read on public.yw_states_v1
 for select to authenticated using (exists (
   select 1 from public.yw_rooms_v1 r where r.code=room_code and
     ((select auth.uid())=r.host_uid or (select auth.uid())=r.guest_uid)
 ));
create policy yw_states_host_create on public.yw_states_v1
 for insert to authenticated with check (
   author_uid=(select auth.uid()) and exists (
     select 1 from public.yw_rooms_v1 r where r.code=room_code and
       r.host_uid=(select auth.uid()) and r.phase='playing' and r.session=session
   )
 );
create policy yw_states_host_update on public.yw_states_v1
 for update to authenticated using (
   author_uid=(select auth.uid()) and exists (
     select 1 from public.yw_rooms_v1 r where r.code=room_code and
       r.host_uid=(select auth.uid())
   )
 ) with check (
   author_uid=(select auth.uid()) and exists (
     select 1 from public.yw_rooms_v1 r where r.code=room_code and
       r.host_uid=(select auth.uid()) and r.phase='playing' and r.session=session
   )
 );
create policy yw_inputs_members_read on public.yw_inputs_v1
 for select to authenticated using (exists (
   select 1 from public.yw_rooms_v1 r where r.code=room_code and
     ((select auth.uid())=r.host_uid or (select auth.uid())=r.guest_uid)
 ));
create policy yw_inputs_guest_create on public.yw_inputs_v1
 for insert to authenticated with check (
   sender_uid=(select auth.uid()) and exists (
    select 1 from public.yw_rooms_v1 r where r.code=room_code and
      r.guest_uid=(select auth.uid()) and r.phase='playing' and r.session=session
   )
 );
create policy yw_presence_member_read on public.yw_presence_v1
 for select to authenticated using (exists (
   select 1 from public.yw_rooms_v1 r where r.code=room_code and
     ((select auth.uid())=r.host_uid or (select auth.uid())=r.guest_uid)
 ));
create policy yw_presence_insert on public.yw_presence_v1
 for insert to authenticated with check (
   owner_uid=(select auth.uid()) and exists (
    select 1 from public.yw_rooms_v1 r where r.code=room_code and
      ((seat='host' and r.host_uid=(select auth.uid())) or
       (seat='guest' and r.guest_uid=(select auth.uid())))
   )
 );
create policy yw_presence_update on public.yw_presence_v1
 for update to authenticated using (owner_uid=(select auth.uid()))
 with check (owner_uid=(select auth.uid()) and exists (
    select 1 from public.yw_rooms_v1 r where r.code=room_code and
      ((seat='host' and r.host_uid=(select auth.uid())) or
       (seat='guest' and r.guest_uid=(select auth.uid())))
 ));
-- Prevent stale/replayed host writes; use server timestamp for heartbeat.
create or replace function public.yw_state_revision_fence_v1()
 returns trigger language plpgsql set search_path='' as $$
 begin
  if tg_op='UPDATE' and
    (new.room_code<>old.room_code or new.session<>old.session or
     new.author_uid<>old.author_uid or new.revision<=old.revision)
  then raise exception 'stale_or_foreign_snapshot';
  end if;
  new.written_at=now();
  return new;
 end; $$;
create trigger yw_state_revision_fence_v1
 before insert or update on public.yw_states_v1
 for each row execute function public.yw_state_revision_fence_v1();
create or replace function public.yw_presence_server_time_v1()
 returns trigger language plpgsql set search_path='' as $$
 begin
  if tg_op='UPDATE' and
    (new.room_code<>old.room_code or new.seat<>old.seat or new.owner_uid<>old.owner_uid)
  then raise exception 'presence_owner_immutable';
  end if;
  new.last_seen=now();
  return new;
 end; $$;
create trigger yw_presence_server_time_v1
 before insert or update on public.yw_presence_v1
 for each row execute function public.yw_presence_server_time_v1();
-- One purpose-built, atomic guest-claim function. No arbitrary SQL or path,
-- and NEVER grant access to unauthenticated 'anon' clients.
create or replace function public.yw_join_room_v1(p_code text)
returns table(code text, session text, host_uid uuid, guest_uid uuid, phase text)
language plpgsql security definer set search_path='' as $$
declare v_uid uuid := auth.uid();
begin
 if v_uid is null or p_code !~ '^[0-9]{6}$' then
  raise exception 'login_or_code_required';
 end if;
 return query
  update public.yw_rooms_v1 r set guest_uid=v_uid
  where r.code=p_code and r.phase='lobby' and r.host_uid<>v_uid and
    (r.guest_uid is null or r.guest_uid=v_uid)
  returning r.code,r.session,r.host_uid,r.guest_uid,r.phase;
 if not found then raise exception 'room_not_joinable'; end if;
end; $$;
revoke all on function public.yw_join_room_v1(text) from public,anon;
grant execute on function public.yw_join_room_v1(text) to authenticated;
-- Only game tables; NEVER remove the existing publication or other tables.
do $$ begin
 if exists(select 1 from pg_publication where pubname='supabase_realtime') then
  if not exists(select 1 from pg_publication_tables
      where pubname='supabase_realtime' and schemaname='public'
       and tablename='yw_states_v1') then
   alter publication supabase_realtime add table public.yw_states_v1;
  end if;
  if not exists(select 1 from pg_publication_tables
      where pubname='supabase_realtime' and schemaname='public'
       and tablename='yw_inputs_v1') then
   alter publication supabase_realtime add table public.yw_inputs_v1;
  end if;
 end if;
end $$;
