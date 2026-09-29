-- Development seed data (local only; never run against production).
insert into public.beta_codes (code, max_uses, active) values
  ('PILOT-2026', 25, true),
  ('HSC-EARLY-7QX4', 1, true),
  ('NEWCASTLE-BETA', 10, false)
on conflict (code) do nothing;
