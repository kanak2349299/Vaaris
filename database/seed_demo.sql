-- Demo seed script for Supabase PostgreSQL
INSERT INTO public.users (id, full_name, email, hashed_password, phone)
VALUES ('a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d', 'Aryan Sharma', 'aryan@vaaris.io', '$2b$12$KIXe8H4UvF5yGeqjB8.t5O17hN93zVn02e3y05B', '+919876543210')
ON CONFLICT (email) DO NOTHING;
