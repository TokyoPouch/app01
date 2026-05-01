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
        
        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.error || `HTTP Error ${response.status}`);
        }
        const data = await response.json();
        
        loading.classList.add('hidden');
        resultContent.classList.remove('hidden');
        displayResults(data.results || []);
    } catch (error) {
        console.error('API Error:', error);
        loading.classList.add('hidden');
        resultContent.classList.remove('hidden');
        
        let errorReason = "通信エラーが発生しました。<br>ネットワーク環境を確認するか、時間をおいて再度お試しください。";
        
        if (error.message.includes('API key is not configured')) {
            errorReason = "サーバー側にAPIキーが設定されていません。<br>Vercelの環境変数（GEMINI_API_KEY）を確認してください。";
        } else if (error.message.includes('Gemini API call failed')) {
            errorReason = "AIサーバー（Gemini）との通信に失敗しました。<br>APIキーが間違っているか、制限に達している可能性があります。";
        } else if (error.message.includes('Keywords are required')) {
            errorReason = "キーワードが入力されていません。";
        } else if (error.message !== "API Error") {
            // その他の具体的なエラー
            errorReason = `エラーが発生しました: ${error.message}`;
        }
        
        resultContent.innerHTML = `<div class="error-msg">${errorReason}</div>`;
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
