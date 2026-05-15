require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const OpenAI = require('openai');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// OpenAI Setup
const openai = new OpenAI({
    apiKey: (process.env.OPENAI_API_KEY || '').trim(),
});

// Supabase Setup
let supabase = null;
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (supabaseUrl && supabaseUrl.startsWith('http') && supabaseKey && !supabaseKey.includes('placeholder')) {
    try {
        supabase = createClient(supabaseUrl, supabaseKey);
        console.log('Supabase initialized');
    } catch (error) {
        console.warn('Failed to initialize Supabase:', error.message);
    }
} else {
    console.warn('Supabase configuration missing or invalid. Logging disabled.');
}

// Routes
app.post('/api/analyze', async (req, res) => {
    const { text } = req.body;

    // Validation
    if (!text || typeof text !== 'string' || text.trim() === '') {
        return res.status(400).json({ error: '분석할 텍스트를 입력해 주세요.' });
    }

    if (text.length > 1000) {
        return res.status(400).json({ error: '텍스트는 1000자 이내로 입력해 주세요.' });
    }

    try {
        // OpenAI API Call with Structured Output
        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini", // Use a modern model
            messages: [
                {
                    role: "system",
                    content: "너는 한국어 텍스트 감성 분석기다. 사용자 텍스트를 positive, negative, neutral 중 하나로 분류한다. confidence는 0부터 100 사이의 정수로 작성한다. reason은 한국어로 한 문장만 작성한다. 과장하지 말고 텍스트 근거만 사용한다. 반드시 JSON 형식으로 응답하라."
                },
                {
                    role: "user",
                    content: text
                }
            ],
            response_format: { type: "json_object" }
        });

        const result = JSON.parse(completion.choices[0].message.content);

        // Normalize result fields (OpenAI might return slightly different keys if not strictly schema-ed)
        const normalizedResult = {
            sentiment: result.sentiment || 'neutral',
            confidence: parseInt(result.confidence) || 0,
            reason: result.reason || '분석 결과를 생성할 수 없습니다.'
        };

        // Supabase Logging (Background task)
        if (supabase) {
            supabase.from('sentiment_logs').insert([
                {
                    input_text: text,
                    sentiment: normalizedResult.sentiment,
                    confidence: normalizedResult.confidence,
                    reason: normalizedResult.reason
                }
            ]).then(({ error }) => {
                if (error) console.error('Supabase logging error:', error);
            });
        }

        res.json(normalizedResult);

    } catch (error) {
        console.error('API Error:', error);

        if (error.status === 401) {
            return res.status(500).json({ error: 'OpenAI API 키가 유효하지 않습니다. 서버 설정을 확인해 주세요.' });
        }

        res.status(500).json({ error: '분석 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.' });
    }
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
