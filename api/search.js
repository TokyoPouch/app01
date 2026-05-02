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
        console.error("Vercelの環境変数が読み込めていません");
        return new Response(JSON.stringify({ error: 'Vercelの環境変数が読み込めていません' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    const prompt = `
あなたは推論エンジンです。
ユーザーが入力したヒント（キーワード）から、最も可能性の高い単語（人名、作品名、商品名、場所、概念、ブランド名など）を推測してください。
あなた自身の知識を活用して、ヒントに最も合致するものを導き出してください。

【推論のルール】
1. 入力キーワードすべてを重視してください。
2. キーワードの一部しか一致していない候補や、ジャンルが明らかに異なる候補は完全に除外してください。
3. 推測への自信が低い場合（一部しか合致しない等）は、無理に答えず結果を空にしてください。
4. 無理に3件出す必要はありません。確度が高いものだけを最大3件、確度が高い順に1位から出力してください。
5. 理由には、なぜこの候補なのか（どのキーワードがどのようにマッチしたか）を短く説明してください。

【ユーザーのヒント】
${keywords}

以下のJSON形式のみで返却してください（Markdownのバッククォート \`\`\`json 等は含めず、純粋なJSON文字列のみを出力してください）。
{
  "results": [
    {
      "name": "候補名",
      "description": "短い説明",
      "reason": "なぜこの候補なのか",
      "confidence": 0.95
    }
  ]
}
`;

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    const geminiResponse = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [
                {
                    parts: [
                        {
                            text: prompt
                        }
                    ]
                }
            ]
        })
    });

    if (!geminiResponse.ok) {
        const errText = await geminiResponse.text();
        console.error(`Gemini API Error [${geminiResponse.status}]:`, errText);
        return new Response(JSON.stringify({ error: 'Gemini API call failed', details: errText }), {
            status: geminiResponse.status,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    const geminiData = await geminiResponse.json();
    let resultText = geminiData.candidates[0].content.parts[0].text;
    
    // 不要なバッククォートがあれば除去する
    resultText = resultText.replace(/```json\n/g, '').replace(/```\n?/g, '').trim();
    
    const parsedData = JSON.parse(resultText);
    
    // スコア(confidence)が低いもの（例: 0.6以下）を除外する「足切り」
    if (parsedData.results) {
        parsedData.results = parsedData.results.filter(r => r.confidence >= 0.6);
    }

    return new Response(JSON.stringify(parsedData), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('API Endpoint Error:', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error', details: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
    });
  }
}
