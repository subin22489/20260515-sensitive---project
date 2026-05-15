document.addEventListener('DOMContentLoaded', () => {
    const textInput = document.getElementById('text-input');
    const analyzeBtn = document.getElementById('analyze-btn');
    const btnText = analyzeBtn.querySelector('.btn-text');
    const btnLoader = document.getElementById('btn-loader');
    
    const resultContainer = document.getElementById('result-container');
    const sentimentBadge = document.getElementById('sentiment-badge');
    const confidenceValue = document.getElementById('confidence-value');
    const reasonText = document.getElementById('reason-text');
    
    const errorContainer = document.getElementById('error-container');
    const errorMessage = document.getElementById('error-message');

    const sentimentMap = {
        'positive': '긍정',
        'negative': '부정',
        'neutral': '중립'
    };

    const showResult = (data) => {
        sentimentBadge.textContent = sentimentMap[data.sentiment] || data.sentiment.toUpperCase();
        sentimentBadge.className = `sentiment-badge ${data.sentiment}`;
        confidenceValue.textContent = `${data.confidence}%`;
        reasonText.textContent = data.reason;
        
        resultContainer.hidden = false;
        errorContainer.hidden = true;
    };

    const showError = (message) => {
        errorMessage.textContent = message;
        errorContainer.hidden = false;
        resultContainer.hidden = true;
    };

    const setLoading = (loading) => {
        analyzeBtn.disabled = loading;
        if (loading) {
            btnText.textContent = '분석 중...';
            btnLoader.hidden = false;
        } else {
            btnText.textContent = '분석 하기';
            btnLoader.hidden = true;
        }
    };

    analyzeBtn.addEventListener('click', async () => {
        const text = textInput.value.trim();
        
        if (!text) {
            showError('분석할 문장을 입력해 주세요.');
            return;
        }

        setLoading(true);
        errorContainer.hidden = true;
        resultContainer.hidden = true;

        try {
            const response = await fetch('/api/analyze', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ text })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || '분석 중 문제가 발생했습니다.');
            }

            showResult(data);
        } catch (error) {
            console.error('Analysis error:', error);
            showError(error.message || '네트워크 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
        } finally {
            setLoading(false);
        }
    });

    // Handle Enter key (Shift+Enter for newline)
    textInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            analyzeBtn.click();
        }
    });
});
