
'use strict';
const { OpenAI } = require('openai');
const apiKey = process.env.MINIMAX_API_KEY;
const baseURL = process.env.MINIMAX_BASE_URL || 'https://api.minimax.chat/v1';
const model = process.env.MODEL || 'MiniMax-Text-01';
if (!apiKey) { console.error('MINIMAX_API_KEY not set'); process.exit(1); }
const client = new OpenAI({ apiKey, baseURL });
let prompt = '';
process.stdin.on('data', d => prompt += d);
process.stdin.on('end', async () => {
  try {
    const stream = await client.chat.completions.create({ model, messages: [{ role: 'user', content: prompt }], stream: true });
    let done = false;
    for await (const event of stream) {
      if (event.choices?.[0]?.delta?.content) {
        const text = event.choices[0].delta.content;
        process.stdout.write(JSON.stringify({ type: 'text', message: text }));
        process.stdout.write('
');
        done = true;
      }
    }
    if (!done) process.stdout.write(JSON.stringify({ type: 'text', message: '(no response)' }) + '
');
    process.stdout.write('<promise>COMPLETE
');
  } catch (err) {
    console.error('Error: ' + err.message);
    process.exit(1);
  }
});
