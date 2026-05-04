export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const { keywords } = await req.json();
    if (!keywords) {
      return new Response(JSON.stringify({ error: 'Keywords are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({
        error: 'API key is not configured'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const prompt = `
あなたは推論エンジンです。
以下のヒントから最も可能性の高い候補を最大3つ推測してください。

ヒント:
${keywords}

JSONだけ返してください:
{
  "results": [
    {
      "name": "候補",
      "description": "説明",
      "reason": "理由",
      "confidence": 0.9
    }
  ]
}
`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`;

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });

    // 👇 ここ重要（エラーをそのまま返す）
    if (!res.ok) {
      const text = await res.text();

      return new Response(JSON.stringify({
        error: 'Gemini API failed',
        status: res.status,
        details: text
      }), {
        status: res.status,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const data = await res.json();
    let text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // JSON抽出
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) {
      throw new Error('AI response parse failed');
    }

    const parsed = JSON.parse(match[0]);

    return new Response(JSON.stringify(parsed), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (err) {
    return new Response(JSON.stringify({
      error: 'Internal Server Error',
      message: err.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
