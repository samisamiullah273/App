export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const payload = req.body || {};
    const systemPrompt = 'You are StudySprint Coach, a calm and encouraging student study planner. Create a realistic plan with short focus blocks and a motivational ending.';
    const userPrompt = `Create a concise study plan for ${payload.course || 'your course'}. Deadline: ${payload.deadline || 'soon'}. Goal: ${payload.goal || 'finish the work without burning out'}. Workload: ${payload.workload || 'medium'}. Focus level: ${payload.focus || 'medium'}. Energy: ${payload.energy || 'steady'}.`;

    if (process.env.OPENAI_API_KEY) {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          temperature: 0.7,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ]
        })
      });

      if (!response.ok) {
        throw new Error('OpenAI request failed');
      }

      const data = await response.json();
      const message = data.choices?.[0]?.message?.content || 'A calm plan is ready.';
      res.status(200).json({ summary: message, mode: 'openai' });
      return;
    }

    const fallback = `${systemPrompt}\n\nPlan for ${payload.course || 'your course'}: start with a 10-minute setup, then do one 45-minute focus block, review what you learned, and leave one next action. Keep the mood calm and steady.`;
    res.status(200).json({ summary: fallback, mode: 'fallback' });
  } catch (error) {
    res.status(400).json({ error: 'Unable to create a plan right now.' });
  }
}
