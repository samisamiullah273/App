const form = document.getElementById('planner-form');
const summaryBox = document.getElementById('result-summary');
const coachBox = document.getElementById('ai-coach');
const instructionsBox = document.getElementById('instructions-text');
const savedPlansBox = document.getElementById('saved-plans');
const clearButton = document.getElementById('clear-saved');

const systemPrompt = `You are StudySprint Coach, a calm and encouraging student study planner. Your job is to turn a deadline and a student's energy into a practical study plan. Always recommend a realistic sequence, include focus-friendly study blocks, and close with a supportive message.`;

function createPlan(formData) {
  const workload = formData.workload;
  const focus = formData.focus;
  const energy = formData.energy;
  const deadline = new Date(formData.deadline);
  const daysUntilDeadline = Math.max(1, Math.ceil((deadline - new Date()) / (1000 * 60 * 60 * 24)));

  const sessionCount = workload === 'heavy' ? 4 : workload === 'medium' ? 3 : 2;
  const sessionLength = focus === 'high' ? 60 : focus === 'medium' ? 45 : 25;
  const energyAdjustment = energy === 'high' ? 1 : energy === 'steady' ? 0.5 : -0.5;
  const focusBoost = Math.max(1, Math.round(sessionLength / 15 + energyAdjustment));

  const steps = [
    `${formData.course} — define the 3 most important deliverables before you begin.`,
    `Set a ${sessionLength}-minute deep work block and put your phone in another room.`,
    `Spend the first ${Math.max(10, Math.round(sessionLength / 6))} minutes reviewing notes and the last ${Math.max(5, Math.round(sessionLength / 12))} minutes summarizing what you learned.`,
    `Leave a visible next action for the next session so momentum is easy to recover.`
  ];

  const planTitle = `${formData.course} • ${daysUntilDeadline} days to go`;
  const priority = workload === 'heavy' ? 'Start with the most urgent task and protect your energy.' : 'Keep the plan steady and finish one strong block at a time.';

  const coachMessage = `${systemPrompt}\n\nStudent goal: ${formData.goal || 'Finish the assignment with less stress.'}\nFocus level: ${focus}\nEnergy: ${energy}\nSuggested pacing: ${sessionCount} sessions over ${Math.max(1, Math.round(daysUntilDeadline / 2))} days with ${sessionLength}-minute blocks.\nCoach note: ${priority}`;

  const summary = `
    <h3>${planTitle}</h3>
    <p><strong>Best strategy:</strong> ${priority}</p>
    <ul class="study-list">
      ${steps.map((step) => `<li>${step}</li>`).join('')}
    </ul>
    <p><strong>Suggested pace:</strong> ${sessionCount} study blocks, ${focusBoost} priority focus points, and a calm finish line by the deadline.</p>
  `;

  const coach = `
    <p>${formData.course} is manageable if you protect your attention.</p>
    <p>Use your first session to create clarity, then spend later sessions on execution. A ${sessionLength}-minute block is enough to create progress without burning out.</p>
    <p><strong>AI coach tip:</strong> If your energy drops, switch to a lighter task such as reviewing notes or outlining your next step rather than quitting.</p>
  `;

  return {
    id: `plan-${Date.now()}`,
    title: planTitle,
    createdAt: new Date().toLocaleString(),
    summary,
    coach,
    coachMessage
  };
}

function readSavedPlans() {
  try {
    return JSON.parse(localStorage.getItem('studysprint-plans') || '[]');
  } catch (error) {
    return [];
  }
}

function savePlan(plan) {
  const savedPlans = readSavedPlans();
  savedPlans.unshift(plan);
  localStorage.setItem('studysprint-plans', JSON.stringify(savedPlans.slice(0, 6)));
  renderSavedPlans();
}

function renderSavedPlans() {
  const savedPlans = readSavedPlans();
  if (!savedPlans.length) {
    savedPlansBox.innerHTML = '<p>No saved plans yet. Generate one to see it here.</p>';
    return;
  }

  savedPlansBox.innerHTML = savedPlans
    .map((plan) => `
      <div class="saved-plans-card">
        <strong>${plan.title}</strong>
        <div>${plan.createdAt}</div>
      </div>
    `)
    .join('');
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const formData = Object.fromEntries(new FormData(form));
  const localPlan = createPlan(formData);

  summaryBox.innerHTML = '<p>Generating your AI coach response...</p>';
  coachBox.innerHTML = '<p>Checking the coaching prompt...</p>';

  try {
    const response = await fetch('/api/plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });

    const data = await response.json();
    const plan = {
      ...localPlan,
      summary: `<h3>${localPlan.title}</h3><p><strong>AI response:</strong> ${data.summary}</p>${localPlan.summary}`,
      coach: `<p>${data.summary}</p><p><strong>Mode:</strong> ${data.mode}</p>`
    };

    summaryBox.innerHTML = plan.summary;
    coachBox.innerHTML = plan.coach;
    instructionsBox.textContent = systemPrompt;
    savePlan(plan);
  } catch (error) {
    summaryBox.innerHTML = localPlan.summary;
    coachBox.innerHTML = localPlan.coach;
    instructionsBox.textContent = systemPrompt;
    savePlan(localPlan);
  }

  form.reset();
});

clearButton.addEventListener('click', () => {
  localStorage.removeItem('studysprint-plans');
  renderSavedPlans();
});

instructionsBox.textContent = systemPrompt;
renderSavedPlans();
