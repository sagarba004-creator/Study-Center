# StudyNest — Study Center Management App

A full-stack seat & student management webapp for study centers with two blocks, role-based access, and real-time color-coded seat maps.

## Features
- Visual seat map for Block 1 and Block 2
- Color-coded seats: Vacant / Occupied / Due Soon (2 days) / Overdue
- Click any seat to see full student details
- Two access levels: Admin (full analytics) / Staff (student info only)
- Admin analytics: Month-wise, week-wise, block-wise, account-wise
- Student CRUD: Add, edit, vacate seats
- Auto due-date calculation from joining date + duration

## Tech Stack
- Next.js 14 (App Router), TypeScript, Tailwind CSS
- Supabase (Auth + PostgreSQL + RLS)
- Vercel deployment

## Quick Setup

### 1. Supabase
1. Create project at supabase.com
2. Run `supabase-schema.sql` in SQL Editor
3. Copy Project URL and anon key

### 2. Users
In Supabase SQL Editor after inviting users:
```sql
-- Make admin
UPDATE auth.users
SET raw_user_meta_data = jsonb_set(raw_user_meta_data, '{role}', '"admin"')
WHERE email = 'admin@example.com';

-- Make staff
UPDATE auth.users
SET raw_user_meta_data = jsonb_set(raw_user_meta_data, '{role}', '"user"')
WHERE email = 'staff@example.com';
```

### 3. Local Dev
```bash
npm install
cp .env.local.example .env.local
# Fill in Supabase credentials
npm run dev
```

### 4. Deploy to Vercel
```bash
npm i -g vercel
vercel
# Add env vars in Vercel dashboard
```

## Seat Colors
- Green = Vacant
- Rose/Pink = Occupied
- Amber = Due soon (within 2 days)
- Bright Red = Overdue

## Access Control
| Feature | Admin | Staff |
|---------|-------|-------|
| View seat map | Yes | Yes |
| Student name/exam/dates | Yes | Yes |
| Address/payment details | Yes | No |
| Add/edit/vacate | Yes | No |
| Analytics | Yes | No |
