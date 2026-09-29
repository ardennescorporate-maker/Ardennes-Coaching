-- Track reviews server-side so review XP can't be claimed for cards that weren't reviewed.
alter table public.cards add column last_reviewed_at timestamptz;
revoke update on public.cards from authenticated;
grant update (q, a) on public.cards to authenticated;
