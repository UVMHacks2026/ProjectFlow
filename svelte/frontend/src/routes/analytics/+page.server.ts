// src/routes/analytics/+page.server.ts
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { API_URL } from '$lib/config';

const FALLBACK_INSIGHTS = [
  { category: 'Budget Risk', headline: 'Could not load insight', detail: 'Gemini did not respond.', severity: 'low', isAllClear: false },
  { category: 'Scheduling', headline: 'Could not load insight', detail: 'Gemini did not respond.', severity: 'low', isAllClear: false },
  { category: 'Team Performance', headline: 'Could not load insight', detail: 'Gemini did not respond.', severity: 'low', isAllClear: false },
];

export const load: PageServerLoad = async ({ fetch, cookies }) => {
  const sessionid = cookies.get('sessionid');
  const csrftoken = cookies.get('csrftoken');
  const headers = { 'Cookie': `sessionid=${sessionid}; csrftoken=${csrftoken}` };

  const tasksRes = await fetch(`${API_URL}/tasks/get/`, { headers });
  if (!tasksRes.ok) throw redirect(302, '/login');

  const tasksData = await tasksRes.json();
  const tasks = tasksData.tasks ?? [];

  const taskContext = JSON.stringify(tasks.map((t: any) => ({
    name: t.name, status: t.status, budget: t.budget,
    end_date: t.end_date, team: t.team?.name,
    subtasks_total: t.subtasks?.length ?? 0,
    subtasks_complete: t.subtasks?.filter((s: any) => s.status === 'COMPLETE').length ?? 0,
  })));

  const prompt = `You are a project management analyst. Given these tasks: ${taskContext}

Return ONLY a valid JSON array with exactly 3 objects, no markdown, no code fences, no explanation.
Each object must have: category (one of "Budget Risk", "Scheduling", "Team Performance"), headline (string), detail (string), severity (one of "low", "medium", "high"), isAllClear (boolean).`;

  let insights = FALLBACK_INSIGHTS;

  try {
    const geminiRes = await fetch(`${API_URL}/chat/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-CSRFToken': csrftoken ?? '', 'Cookie': `sessionid=${sessionid}; csrftoken=${csrftoken}` },
      body: JSON.stringify({ prompt })
    });

    const text = await geminiRes.text();
    console.log('RAW GEMINI TEXT:', text);

    const geminiData = JSON.parse(text);
    const raw = geminiData.answer ?? geminiData.response ?? geminiData.message ?? Object.values(geminiData)[0];
    console.log('RAW ANSWER:', raw);

    const clean = String(raw).replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);

    if (Array.isArray(parsed) && parsed.length === 3) {
      insights = parsed;
    }
  } catch (e) {
    console.error('Gemini parse error:', e);
  }

  return { insights, taskContext };
};;
