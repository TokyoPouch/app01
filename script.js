const inputField = document.getElementById('keyword-input');
const searchBtn = document.getElementById('search-btn');
const resultSection = document.getElementById('result-section');
const resultContent = document.getElementById('result-content');
const loading = document.getElementById('loading');

// 「LET'S GO!」ボタンを押した時だけ検索を実行する
searchBtn.addEventListener('click', performSearch);

// Enterキーでも検索できるようにする
inputField.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        performSearch();
    }
});

async function performSearch() {
    const rawKeywords = inputField.value.trim();
    if (!rawKeywords) return;

    // 表示制御：最初は結果を非表示にする
    resultSection.classList.remove('hidden');
    resultContent.classList.add('hidden');
    resultContent.innerHTML = '';
    loading.classList.remove('hidden');
    
    // ボタンの連続クリック防止
    searchBtn.disabled = true;
    searchBtn.textContent = 'THINKING...';
    searchBtn.setAttribute('data-text', 'THINKING...');

    try {
        // Vercel Serverless Functionのエンドポイントを叩く
        const endpoint = `/api/search`;
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ keywords: rawKeywords })
        });
        
        if (!response.ok) throw new Error('API Error');
        const data = await response.json();
        
        loading.classList.add('hidden');
        resultContent.classList.remove('hidden');
        displayResults(data.results || []);
    } catch (error) {
        console.error('API Error:', error);
        loading.classList.add('hidden');
        resultContent.classList.remove('hidden');
        
        // Vercel環境以外でローカルから直接ファイルを開いた場合などのエラー時は、
        // UIデザインの確認用にダミーデータを表示する
        displayResults([
            {
                name: "API未接続 (テスト表示)",
                description: "現在はローカルでのテスト状態、またはAPIに接続できませんでした。Vercelにデプロイし、環境変数を設定すると本番の推測結果がここに表示されます。",
                reason: "ローカル確認用のダミーデータです。",
                confidence: 0.99
            }
        ]);
    } finally {
        searchBtn.disabled = false;
        searchBtn.textContent = "LET'S GO!";
        searchBtn.setAttribute('data-text', "LET'S GO!");
    }
}

function displayResults(results) {
    if (!results || results.length === 0) {
        resultContent.innerHTML = '<div class="error-msg">候補が見つかりません。<br>ヒントを増やしてください。</div>';
        return;
    }

    let html = '';
    const topResult = results[0];
    const others = results.slice(1, 3);

    // 1位 (特大カード)
    html += `
        <div class="result-card top-rank delay-1">
            <div class="result-label-wrapper">
                <span class="result-label top-label">これだ！ BINGO!</span>
            </div>
            <div class="result-title">${topResult.name}</div>
            <div class="result-desc">${topResult.description}</div>
            ${topResult.reason ? `<div class="result-reason">理由: ${topResult.reason}</div>` : ''}
        </div>
    `;

    // 2位・3位 (2カラム)
    if (others.length > 0) {
        html += `<div class="result-others-container">`;
        others.forEach((item, index) => {
            const delayClass = `delay-${index + 2}`;
            html += `
                <div class="result-card other-rank ${delayClass}">
                    <span class="result-label other-label">もしかして...</span>
                    <div class="result-title">${item.name}</div>
                    <div class="result-desc">${item.description}</div>
                    ${item.reason ? `<div class="result-reason">理由: ${item.reason}</div>` : ''}
                </div>
            `;
        });
        html += `</div>`;
    }

    resultContent.innerHTML = html;
}
