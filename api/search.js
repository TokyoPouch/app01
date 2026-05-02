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
    const { query, keywords } = await req.json();
    const inputText = keywords || query;

    if (!inputText) {
      return new Response(JSON.stringify({ error: 'Query is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'Vercelの環境変数が読み込めていません' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const prompt = `
あなたは推論エンジンです。
ユーザーが入力したヒントから最も可能性の高い単語を推測してください。

【ヒント】
${inputText}

【出力形式】
JSONのみで返す：
{
  "results": [
    {
      "name": "候補名",
      "description": "短い説明",
      "reason": "理由",
      "confidence": 0.95
    }
  ]
}
`;

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    const geminiResponse = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });

    if (!geminiResponse.ok) {
      const errText = await geminiResponse.text();
      return new Response(JSON.stringify({ error: 'Gemini API call failed', details: errText }), {
        status: geminiResponse.status,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const geminiData = await geminiResponse.json();
    let resultText = geminiData.candidates[0].content.parts[0].text;

    const jsonMatch = resultText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("JSON抽出失敗");
    }

    let parsedData;
    try {
      parsedData = JSON.parse(jsonMatch[0]);
    } catch {
      return new Response(JSON.stringify({ error: 'JSON parse error', raw: resultText }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (parsedData.results) {
      parsedData.results = parsedData.results.filter(r => r.confidence >= 0.5);
    }

    return new Response(JSON.stringify(parsedData), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: 'Internal Server Error', details: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
