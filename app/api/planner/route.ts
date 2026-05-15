import { NextRequest, NextResponse } from 'next/server';

export type PlannerInput = {
  habits: { name: string; dimension: string; type: string; streak: number; completionRate: number }[];
  goals: { title: string; dimension: string; pct?: number; unit?: string; current_value?: number; target_point?: number; deadline?: string }[];
  dimensionScores: { body: number; mind: number; soul: number };
  checkinSummary?: { avgSleep?: number; avgMood?: number; avgStress?: number };
};

export type PlannerRecommendation = {
  title: string;
  description: string;
  dimension: 'body' | 'mind' | 'soul';
  priority: 'high' | 'medium' | 'low';
  action?: string;
};

export type PlannerOutput = {
  weeklyFocus: string;
  recommendations: PlannerRecommendation[];
  aiPowered: boolean;
};

// ─── Rule-based fallback ───────────────────────────────────────────────────────

function ruleBasedPlan(input: PlannerInput): PlannerOutput {
  const { dimensionScores, habits, goals } = input;
  const recommendations: PlannerRecommendation[] = [];

  const scores = [
    { dim: 'body' as const, score: dimensionScores.body },
    { dim: 'mind' as const, score: dimensionScores.mind },
    { dim: 'soul' as const, score: dimensionScores.soul },
  ].sort((a, b) => a.score - b.score);

  const weakest = scores[0];
  const dimLabel = { body: 'Body', mind: 'Mind', soul: 'Soul' };

  // Weakest dimension recommendation
  recommendations.push({
    title: `Strengthen your ${dimLabel[weakest.dim]} dimension`,
    description: `Your ${dimLabel[weakest.dim]} score (${weakest.score}/100) is the lowest. Focus on ${weakest.dim} habits this week to restore balance.`,
    dimension: weakest.dim,
    priority: 'high',
    action: `Complete all ${dimLabel[weakest.dim]} habits for 5 consecutive days`,
  });

  // Streak-at-risk habits
  const atRisk = habits.filter(h => h.streak > 0 && h.completionRate < 50);
  if (atRisk.length > 0) {
    recommendations.push({
      title: 'Protect your active streaks',
      description: `${atRisk.length} habit${atRisk.length > 1 ? 's have' : ' has'} an active streak but low completion rate: ${atRisk.map(h => h.name).slice(0, 3).join(', ')}.`,
      dimension: atRisk[0].dimension as 'body' | 'mind' | 'soul',
      priority: 'high',
      action: 'Check in daily to keep these streaks alive',
    });
  }

  // Goals approaching deadline
  const urgentGoals = goals.filter(g => {
    if (!g.deadline) return false;
    const daysLeft = Math.round((new Date(g.deadline + 'T00:00:00').getTime() - Date.now()) / 86_400_000);
    return daysLeft >= 0 && daysLeft <= 14 && (g.pct ?? 0) < 80;
  });
  if (urgentGoals.length > 0) {
    const g = urgentGoals[0];
    recommendations.push({
      title: `Goal deadline approaching: ${g.title}`,
      description: `"${g.title}" is due in 2 weeks and is at ${g.pct ?? 0}% progress. Accelerate your effort now.`,
      dimension: g.dimension as 'body' | 'mind' | 'soul',
      priority: 'high',
      action: g.target_point && g.current_value != null
        ? `Close the gap: ${Math.abs(g.target_point - g.current_value)} ${g.unit ?? 'units'} remaining`
        : 'Push hard this week',
    });
  }

  // Low stress / sleep nudge
  if (input.checkinSummary?.avgStress != null && input.checkinSummary.avgStress > 7) {
    recommendations.push({
      title: 'High stress detected',
      description: `Your average stress level is ${input.checkinSummary.avgStress.toFixed(1)}/10. Consider adding recovery habits.`,
      dimension: 'soul',
      priority: 'medium',
      action: 'Add a daily meditation or journaling habit',
    });
  }

  if (input.checkinSummary?.avgSleep != null && input.checkinSummary.avgSleep < 7) {
    recommendations.push({
      title: 'Sleep below optimal',
      description: `You're averaging ${input.checkinSummary.avgSleep.toFixed(1)} hrs of sleep. Aim for 7–9 hrs for optimal performance.`,
      dimension: 'body',
      priority: 'medium',
      action: 'Set a consistent bedtime and track sleep in your daily check-in',
    });
  }

  // General habit-building tip if score is very low
  if (habits.length < 3) {
    recommendations.push({
      title: 'Build your habit stack',
      description: 'You have fewer than 3 habits. Start small — add one habit per dimension for a balanced routine.',
      dimension: weakest.dim,
      priority: 'low',
      action: 'Add a Body, Mind, and Soul habit this week',
    });
  }

  const weeklyFocus = `This week: prioritize ${dimLabel[weakest.dim]} (score ${weakest.score}/100) and protect your active streaks.`;

  return { weeklyFocus, recommendations: recommendations.slice(0, 5), aiPowered: false };
}

// ─── Rate limiter ──────────────────────────────────────────────────────────────

const rateLimitMap = new Map<string, number[]>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const timestamps = (rateLimitMap.get(ip) ?? []).filter(t => now - t < 60_000);
  if (timestamps.length >= 10) return true;
  timestamps.push(now);
  rateLimitMap.set(ip, timestamps);
  return false;
}

// ─── Route handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown';
  if (isRateLimited(ip)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  try {
    const input = await req.json() as PlannerInput;

    if (process.env.OPENAI_API_KEY) {
      const prompt = `You are a personal development coach. Based on the user's data, provide a personalized weekly plan.

User data:
- Habits: ${JSON.stringify(input.habits)}
- Goals: ${JSON.stringify(input.goals)}
- Dimension scores (Body/Mind/Soul): ${JSON.stringify(input.dimensionScores)}
- Recent check-in averages: ${JSON.stringify(input.checkinSummary ?? {})}

Respond with JSON matching this schema:
{
  "weeklyFocus": "1-sentence weekly focus statement",
  "recommendations": [
    {
      "title": "short title",
      "description": "2-3 sentence explanation",
      "dimension": "body|mind|soul",
      "priority": "high|medium|low",
      "action": "specific actionable step"
    }
  ]
}

Provide 3-5 recommendations. Be specific, motivating, and practical. Focus on what will have the highest impact this week.`;

      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
        body: JSON.stringify({
          model: 'gpt-4o',
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: 'You are a personal development coach. Respond only with valid JSON.' },
            { role: 'user', content: prompt },
          ],
          max_tokens: 1200,
        }),
      });

      const json = await res.json();
      const parsed = JSON.parse(json.choices[0].message.content);
      return NextResponse.json({ ...parsed, aiPowered: true } as PlannerOutput);
    }

    return NextResponse.json(ruleBasedPlan(input));
  } catch (err) {
    console.error('[planner]', err);
    return NextResponse.json({ error: 'Failed to generate plan' }, { status: 500 });
  }
}
