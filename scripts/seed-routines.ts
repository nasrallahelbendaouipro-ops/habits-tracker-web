/**
 * Seed the 9 routines from routines_reference.html into Supabase.
 * Run once: npx tsx scripts/seed-routines.ts
 * Requires NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local
 * You must be logged in — set SUPABASE_USER_ID to your user UUID.
 */

import { createClient } from '@supabase/supabase-js';
import { nanoid } from 'nanoid';

// Run with env vars pre-loaded:
// $env:NEXT_PUBLIC_SUPABASE_URL="..."; $env:NEXT_PUBLIC_SUPABASE_ANON_KEY="..."; $env:SUPABASE_USER_ID="..."; npx tsx scripts/seed-routines.ts

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !key) throw new Error('Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY env vars');

const supabase = createClient(url, key);

const USER_ID = process.env.SUPABASE_USER_ID;
if (!USER_ID) throw new Error('Set SUPABASE_USER_ID env var to your user UUID');

const ROUTINES = [
  // ─── SPORT ──────────────────────────────────────────────────────────────────
  {
    name: 'Footwork',
    category: 'sport',
    icon: '🦶',
    color: '#FF4D00',
    schedule_days: [2, 5], // Tue, Fri
    tasks: [
      { id: nanoid(), section: 'Série 1 — 6 Step + CC', name: '6 Step + CC', type: 'bilateral', reps: 5 },
      { id: nanoid(), name: '3 Step + CC', type: 'bilateral', reps: 5, section: 'Série 2 — 3 Step + CC' },
      { id: nanoid(), name: '2 Step + CC', type: 'bilateral', reps: 5, section: 'Série 3 — 2 Step + CC' },
    ],
  },
  {
    name: 'Power Moves',
    category: 'sport',
    icon: '💥',
    color: '#FFB800',
    schedule_days: [3], // Wed
    tasks: [
      { id: nanoid(), name: 'Windmills', type: 'reps', reps: 10, sets: 5 },
      { id: nanoid(), name: 'Munchills', type: 'reps', reps: 10, sets: 5 },
      { id: nanoid(), name: 'Swipes', type: 'reps', reps: 10, sets: 5 },
      { id: nanoid(), name: 'Turtle', type: 'reps', reps: 10, sets: 5 },
      { id: nanoid(), name: 'Windmill → Head Spin', type: 'reps', reps: 5, sets: 5 },
      { id: nanoid(), name: 'Airchair Spine', type: 'reps', reps: 10, sets: 5 },
      { id: nanoid(), name: '90s', type: 'reps', reps: 10, sets: 5 },
      { id: nanoid(), name: 'Elbow Airflare', type: 'reps', reps: 10, sets: 5 },
    ],
  },
  {
    name: 'Acrobaties',
    category: 'sport',
    icon: '🌀',
    color: '#00D4FF',
    schedule_days: [5], // Fri
    tasks: [
      { id: nanoid(), name: 'Rondade + Backflip + Dead Push Up', type: 'reps', reps: 10, sets: 5 },
      { id: nanoid(), name: 'Rondade + Sideflip', type: 'reps', reps: 10, sets: 5 },
      { id: nanoid(), name: 'Rondade + Backflip', type: 'reps', reps: 10, sets: 5 },
      { id: nanoid(), name: 'Twist Mix', type: 'reps', reps: 10, sets: 5 },
    ],
  },
  {
    name: 'Full Body Workout',
    category: 'sport',
    icon: '💪',
    color: '#00E676',
    schedule_days: [6], // Sat
    tasks: [
      { id: nanoid(), section: 'Cardio', name: 'Running', type: 'time', duration_min: 30 },
      { id: nanoid(), section: 'Équilibre', name: 'Handstand', type: 'time', duration_min: 10, note: '1min on / 1min off' },
      { id: nanoid(), section: 'Force', name: 'Dips', type: 'reps', reps: 10, sets: 5 },
      { id: nanoid(), name: 'Elbow Plank', type: 'time', duration_min: 2 },
      { id: nanoid(), name: 'Chest (pompes)', type: 'reps', reps: 15, sets: 5 },
      { id: nanoid(), name: 'Squats', type: 'reps', reps: 10, sets: 5 },
      { id: nanoid(), section: 'Mobilité', name: 'Wolf Mobility', type: 'reps', reps: 5, note: '15s/side × 5' },
      { id: nanoid(), name: 'Ninja Mobility', type: 'reps', reps: 10, sets: 5, note: '10L / 10R' },
      { id: nanoid(), section: 'Récupération', name: 'Stretching complet', type: 'time', duration_min: 45 },
    ],
  },

  // ─── DATA ───────────────────────────────────────────────────────────────────
  {
    name: 'Power BI / PL-300',
    category: 'data',
    icon: '📊',
    color: '#F2C811',
    schedule_days: [1, 2, 3, 4, 5], // Mon–Fri
    tasks: [
      {
        id: nanoid(),
        section: 'Formation principale — Juin/Juillet',
        name: 'Udemy — Maven Analytics Power BI',
        type: 'resource',
        resources: [
          { label: 'Udemy Maven Analytics', url: 'https://www.udemy.com/course/microsoft-power-bi-up-running-with-power-bi-desktop/' },
          { label: 'Exam PL-300 officiel', url: 'https://learn.microsoft.com/fr-fr/certifications/exams/pl-300/' },
        ],
      },
      {
        id: nanoid(),
        section: 'Simulations + Examens blancs — Août',
        name: 'Simulation PL-300',
        type: 'resource',
        resources: [
          { label: 'Whizlabs PL-300', url: 'https://www.whizlabs.com/microsoft-power-bi-certification/' },
          { label: 'MeasureUp', url: 'https://www.measureup.com/pl-300-microsoft-power-bi-data-analyst.html' },
        ],
      },
      {
        id: nanoid(),
        section: 'DAX avancé',
        name: 'SQLBI — dax.guide',
        type: 'resource',
        resources: [
          { label: 'dax.guide', url: 'https://dax.guide' },
          { label: 'SQLBI Articles', url: 'https://www.sqlbi.com/articles/' },
        ],
      },
    ],
  },
  {
    name: 'SQL',
    category: 'data',
    icon: '🗃️',
    color: '#4A9EFF',
    schedule_days: [1, 2, 3, 4, 5],
    tasks: [
      {
        id: nanoid(),
        section: 'Juin — Fondations',
        name: 'SQLZoo — cours interactif',
        type: 'resource',
        resources: [{ label: 'sqlzoo.net', url: 'https://sqlzoo.net' }],
      },
      {
        id: nanoid(),
        section: 'Juillet — SQL avancé',
        name: 'Mode Analytics — Window Functions + CTEs',
        type: 'resource',
        resources: [
          { label: 'mode.com/sql-tutorial', url: 'https://mode.com/sql-tutorial/' },
          { label: 'Advanced SQL Puzzles', url: 'https://advanced-sql-puzzles.com' },
        ],
      },
      {
        id: nanoid(),
        section: 'Août — Niveau entretien',
        name: 'LeetCode SQL + DataLemur',
        type: 'resource',
        resources: [
          { label: 'LeetCode SQL', url: 'https://leetcode.com/problemset/database/' },
          { label: 'DataLemur', url: 'https://datalemur.com' },
        ],
      },
    ],
  },
  {
    name: 'AWS CLF-C02',
    category: 'data',
    icon: '☁️',
    color: '#FF9900',
    schedule_days: [1, 2, 3, 4, 5],
    tasks: [
      {
        id: nanoid(),
        section: 'Formation officielle',
        name: 'AWS Skill Builder — Cloud Practitioner Essentials',
        type: 'resource',
        resources: [{ label: 'AWS Skill Builder', url: 'https://explore.skillbuilder.aws/learn/course/external/view/elearning/134/aws-cloud-practitioner-essentials' }],
      },
      {
        id: nanoid(),
        section: 'Cours Udemy',
        name: "Stéphane Maarek — AWS CLF-C02",
        type: 'resource',
        resources: [
          { label: 'Udemy Maarek CLF-C02', url: 'https://www.udemy.com/course/aws-certified-cloud-practitioner-new/' },
          { label: 'Practice Exams', url: 'https://www.udemy.com/course/practice-exams-aws-certified-cloud-practitioner/' },
        ],
      },
      {
        id: nanoid(),
        section: 'Examens blancs',
        name: 'Tutorials Dojo — 6 Practice Exams',
        type: 'resource',
        resources: [{ label: 'Tutorials Dojo', url: 'https://tutorialsdojo.com/courses/aws-certified-cloud-practitioner-practice-exams/' }],
      },
    ],
  },
  {
    name: 'Vibe Coding',
    category: 'data',
    icon: '⚡',
    color: '#A78BFA',
    schedule_days: [1, 2, 3, 4, 5, 6, 0],
    tasks: [
      { id: nanoid(), section: 'Phase 1 — Juin/Juillet', name: 'Habits Tracker App (Next.js)', type: 'reps', note: 'AWS Amplify + Lambda' },
      { id: nanoid(), name: 'Dashboard Power BI — Habits Data', type: 'reps', note: 'Juillet — Projet PL-300' },
      { id: nanoid(), section: 'Phase 2 — Août', name: 'Artio Platform — Prototype', type: 'reps', note: 'PostgreSQL + FastAPI' },
    ],
  },
  {
    name: 'GitHub / CI-CD',
    category: 'data',
    icon: '🔄',
    color: '#F97316',
    schedule_days: [1, 2, 3, 4, 5],
    tasks: [
      {
        id: nanoid(),
        section: 'Formations',
        name: 'GitHub Skills — Cours officiel interactif',
        type: 'resource',
        resources: [{ label: 'skills.github.com', url: 'https://skills.github.com' }],
      },
      {
        id: nanoid(),
        name: 'TechWorld with Nana — GitHub Actions Full Course',
        type: 'resource',
        resources: [{ label: 'TechWorld with Nana', url: 'https://www.youtube.com/@TechWorldwithNana' }],
      },
      { id: nanoid(), section: 'Application pratique', name: 'Pipeline CI : lint + tests automatiques', type: 'reps' },
      { id: nanoid(), name: 'CD : deploy automatique AWS Amplify', type: 'reps' },
      { id: nanoid(), name: 'Branch protection + PR workflow', type: 'reps' },
      { id: nanoid(), name: 'README + badges CI/CD sur chaque projet', type: 'reps' },
    ],
  },
];

async function seed() {
  console.log(`Seeding ${ROUTINES.length} routines for user ${USER_ID}…`);
  for (const r of ROUTINES) {
    const { data, error } = await supabase
      .from('routines')
      .insert({ ...r, user_id: USER_ID })
      .select('id, name')
      .single();
    if (error) {
      console.error(`✗ ${r.name}:`, error.message);
    } else {
      console.log(`✓ ${data.name} (${data.id})`);
    }
  }
  console.log('Done.');
}

seed().catch(console.error);
