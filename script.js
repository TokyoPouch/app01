const inputField = document.getElementById('keyword-input');
const searchBtn = document.getElementById('search-btn');
const resultSection = document.getElementById('result-section');
const resultContent = document.getElementById('result-content');
const loading = document.getElementById('loading');

let isLoading = false;

searchBtn.addEventListener('click', performSearch);

inputField.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    performSearch();
  }
});

async function performSearch() {
  if (isLoading) return;

  const keywords = inputField.value.trim();
  if (!keywords) return;

  isLoading = true;

  resultSection.classList.remove('hidden');
  resultContent.classList.add('hidden');
  loading.classList.remove('hidden');

  try {
    const res = await fetch('/api/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ keywords })
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(`${data.error} (${data.status})`);
    }

    displayResults(data.results || []);

  } catch (err) {
    console.error(err);

    let msg = "通信エラーが発生しました";

    if (err.message.includes("429")) {
      msg = "APIの利用制限に達しました。少し待ってから試してください";
    } else if (err.message.includes("API key")) {
      msg = "APIキーが設定されていません";
    } else if (err.message.includes("403")) {
      msg = "APIキーが無効です";
    }

    resultContent.innerHTML = `<div class="error-msg">${msg}</div>`;
  }

  loading.classList.add('hidden');
  resultContent.classList.remove('hidden');

  isLoading = false;
}
