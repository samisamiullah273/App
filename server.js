const http = require('http');
const fs = require('fs');
const path = require('path');

const port = process.env.PORT || 3000;
const rootDir = __dirname;
const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon'
};

const server = http.createServer(async (req, res) => {
  if (req.method === 'POST' && req.url === '/api/plan') {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', async () => {
      try {
        const payload = JSON.parse(body || '{}');
        const aiReply = await buildPlanReply(payload);
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify(aiReply));
      } catch (error) {
        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: 'Invalid request body' }));
      }
    });
    return;
  }

  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ status: 'ok', app: 'StudySprint Coach' }));
    return;
  }

  const urlPath = req.url === '/' ? '/index.html' : req.url;
  const safePath = path.normalize(urlPath).replace(/^\/+/, '');
  const filePath = path.join(rootDir, safePath);

  if (!filePath.startsWith(rootDir)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Forbidden');
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('File not found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = mimeTypes[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
});

async function buildPlanReply(payload) {
  const { course = 'your course', deadline = '', goal = '', workload = 'medium', focus = 'medium', energy = 'steady' } = payload;
  const systemPrompt = 'You are StudySprint Coach, a calm and encouraging student study planner. Create a realistic plan with short focus blocks and a motivational ending.';
  const userPrompt = `Create a concise study plan for ${course}. Deadline: ${deadline || 'soon'}. Goal: ${goal || 'finish the work without burning out'}. Workload: ${workload}. Focus level: ${focus}. Energy: ${energy}.`;

  if (process.env.OPENAI_API_KEY) {
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
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
      return { summary: message, mode: 'openai' };
    } catch (error) {
      // fall back to local generation below
    }
  }

  const fallback = `${systemPrompt}\n\nPlan for ${course}: start with a 10-minute setup, then do one 45-minute focus block, review what you learned, and leave one next action. Keep the mood calm and steady.`;
  return { summary: fallback, mode: 'fallback' };
}

server.listen(port, () => {
  console.log(`StudySprint Coach running at http://localhost:${port}`);
});
