import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '12mb' }));

function getAiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured in environment.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

const ARCHETYPES = [
  'snow_globe',
  'postcard',
  'shell_bottle',
  'ramen_bowl',
  'vinyl_ticket',
  'polaroid_frame',
  'plushie',
  'medal',
  'grad_cap',
  'lanyard',
  'cake',
  'game_cart',
] as const;

app.post('/api/analyze-photo', async (req, res) => {
  try {
    const { imageBase64, mimeType, title, story, place } = req.body as {
      imageBase64?: string;
      mimeType?: string;
      title?: string;
      story?: string;
      place?: string;
    };

    if (!imageBase64 || !mimeType) {
      return res.status(400).json({ error: 'Missing imageBase64 or mimeType' });
    }

    const ai = getAiClient();
    const promptText = `Analyze this user-uploaded photo for a 2D lo-fi dusk pixel-art personal showcase room (480x270 logical pixels).
User hints: title="${title || ''}", place="${place || ''}", story="${story || ''}".

Select the single best fitting pixel-art object archetype from this strict list:
${ARCHETYPES.join(', ')}

Rules:
- Map the photo's 3 dominant colors as hex strings (#RRGGBB).
- Choose recommended_zone from: "wall", "shelf", "sill", "cork", "desk".
- Provide bilingual Chinese (zh) and English (en) title, brief poetic story (2 sentences max if user didn't provide one, or polished version of user's story), and accessible alt_text.
- Also compute "style_adaptation" so the room subtly harmonizes with this photo's colors while staying inside a warm lo-fi dusk study aesthetic (plum/amber/sunset tones, never harsh neon cyan/green).
- Also design a crisp 12-wide x 14-tall "custom_pixel_grid" (an array of exactly 14 strings, each exactly 12 characters long) representing the recognizable pixel-art silhouette of a small collectible object based on the archetype and motif (it will sit on a shelf in the room). Fill most of the grid, keep the object's bottom on the last row, and draw a 1px dark outline around the silhouette. Use ONLY these single-character palette codes:
  '.' = transparent
  'O' = #1C1215 (1px dark outline)
  'P' = primary photo color
  'S' = secondary photo color
  'A' = accent photo color
  'W' = #F8F0E6 (bright highlight)
  'G' = #FBCDA6 (warm peach/glass)
  'M' = #582F44 (wood/plum base)
  'D' = #3D202E (deep shadow)
- Set has_people=true if recognizable human faces appear in the photo.`;

    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType,
              data: imageBase64,
            },
          },
          { text: promptText },
        ],
      },
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            category: { type: Type.STRING },
            archetype: { type: Type.STRING, enum: [...ARCHETYPES] },
            motif: { type: Type.STRING },
            key_colors: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            custom_pixel_grid: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            suggested_title: {
              type: Type.OBJECT,
              properties: {
                zh: { type: Type.STRING },
                en: { type: Type.STRING },
              },
              required: ['zh', 'en'],
            },
            suggested_story: {
              type: Type.OBJECT,
              properties: {
                zh: { type: Type.STRING },
                en: { type: Type.STRING },
              },
              required: ['zh', 'en'],
            },
            alt_text: {
              type: Type.OBJECT,
              properties: {
                zh: { type: Type.STRING },
                en: { type: Type.STRING },
              },
              required: ['zh', 'en'],
            },
            has_people: { type: Type.BOOLEAN },
            recommended_zone: {
              type: Type.STRING,
              enum: ['wall', 'shelf', 'sill', 'cork', 'desk'],
            },
            style_adaptation: {
              type: Type.OBJECT,
              properties: {
                moodName: { type: Type.STRING },
                skyTopColor: { type: Type.STRING },
                skyHorizonColor: { type: Type.STRING },
                accentColor: { type: Type.STRING },
                wallTint: { type: Type.STRING },
                lampIntensity: { type: Type.NUMBER },
                recommendedZone: {
                  type: Type.STRING,
                  enum: ['wall', 'shelf', 'sill', 'cork', 'desk'],
                },
                description: {
                  type: Type.OBJECT,
                  properties: {
                    zh: { type: Type.STRING },
                    en: { type: Type.STRING },
                  },
                  required: ['zh', 'en'],
                },
              },
              required: [
                'moodName',
                'skyTopColor',
                'skyHorizonColor',
                'accentColor',
                'wallTint',
                'lampIntensity',
                'recommendedZone',
                'description',
              ],
            },
          },
          required: [
            'category',
            'archetype',
            'motif',
            'key_colors',
            'custom_pixel_grid',
            'suggested_title',
            'suggested_story',
            'alt_text',
            'has_people',
            'recommended_zone',
            'style_adaptation',
          ],
        },
      },
    });

    const parsed = JSON.parse((response.text ?? '{}').trim());
    return res.json(parsed);
  } catch (err: unknown) {
    console.error('Error in /api/analyze-photo:', err);
    const message = err instanceof Error ? err.message : 'Photo analysis failed';
    return res.status(500).json({ error: message });
  }
});

app.post('/api/translate', async (req, res) => {
  try {
    const { text, targetLang } = req.body as { text?: string; targetLang?: 'zh' | 'en' };
    if (!text || !targetLang) {
      return res.status(400).json({ error: 'Missing text or targetLang' });
    }
    const ai = getAiClient();
    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: `Translate the following short personal memory story naturally into ${targetLang === 'zh' ? 'Simplified Chinese' : 'English'}. Preserve warmth and brevity. Return only the translated text.\n\n${text}`,
      config: { thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } },
    });
    return res.json({ translated: (response.text ?? '').trim() });
  } catch (err: unknown) {
    console.error('Error in /api/translate:', err);
    const message = err instanceof Error ? err.message : 'Translation failed';
    return res.status(500).json({ error: message });
  }
});

async function startServer() {
  const prototypeDir = path.resolve(__dirname, 'prototype');

  // 网站本体：纯静态的 prototype/（不缓存，改完刷新就能看到）
  app.use(
    express.static(prototypeDir, {
      index: 'index.html',
      setHeaders: (res) => {
        res.setHeader('Cache-Control', 'no-store');
      },
    }),
  );

  // 其他 GET 路径都回到首页（深链接用的是 ?item=，这里只是兜底）
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    res.sendFile(path.join(prototypeDir, 'index.html'));
  });

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Pixel Room server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
