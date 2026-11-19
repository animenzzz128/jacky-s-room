import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

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
- Also design a crisp 16x16 "custom_pixel_grid" (an array of exactly 16 strings, each 16 characters long) representing the recognizable pixel-art silhouette of the object/motif centered with at least 1px transparent padding and 1px dark outline! Use ONLY these single-character palette codes:
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

app.post('/api/design-audit', async (req, res) => {
  try {
    const {
      iteration = 1,
      memoriesCount,
      placedZones,
      themeConfig,
      recentFixesApplied = [],
      hasCustomPhoto,
    } = req.body as {
      iteration?: number;
      memoriesCount: number;
      placedZones: Record<string, number>;
      themeConfig: Record<string, unknown>;
      recentFixesApplied?: string[];
      hasCustomPhoto?: boolean;
    };

    const ai = getAiClient();
    const systemInstruction = `You are a Principal UI/UX & Pixel-Art Art Director auditing an interactive 480x270 lo-fi pixel personal showcase website.
Evaluate the current state rigorously from 0.0 to 10.0 across 5 weighted dimensions:
1. pixelGridAndPalette (0-10): 1px grid fidelity, warm plum/amber dusk harmony, zero mixels.
2. spatialBalance (0-10): visual distribution across wall, shelf, sill, corkboard, and desk without crowding; dynamic expansion when photos grow.
3. typographyAndContrast (0-10): WCAG AA legibility (>=4.5:1), crisp bilingual display & body readability.
4. interactiveAffordance (0-10): clear hover feedback, gaze tracking, accessible keyboard/mobile layout, zero clutter in HUD.
5. adaptivePhotoSync (0-10): how well uploaded photos transform into pixel objects and harmonize room layout & lighting.

IMPORTANT SCORING CALIBRATION:
- Evaluate honestly based on the exact state telemetry provided!
- Notice what fixes have already been applied in recentFixesApplied: ${JSON.stringify(recentFixesApplied)}.
- If contrastBoost < 0.8 or hudCompact is false or zones are unevenly clustered (e.g. one zone has >=3 while others have 0) or memoriesCount >= 4 without expandedShelves, penalize appropriately (typically 7.8 to 9.1 on early iterations) and list the exact 3 highest-impact fixes from the allowed fixAction enum.
- As concrete fixes from recentFixesApplied are applied (e.g., rebalance_slots, boost_contrast, refine_lamp_harmony, compact_hud, enable_expanded_shelves, apply_photo_accent), reflect genuine improvement in the corresponding dimensions. When all major structural & visual issues are resolved cleanly, overallScore can reach >= 9.5 and approved=true.`;

    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: `Audit Iteration #${iteration} state:
- Total published memories: ${memoriesCount}
- Zone placement counts: ${JSON.stringify(placedZones)}
- Theme & layout config: ${JSON.stringify(themeConfig)}
- Custom uploaded photo integrated: ${Boolean(hasCustomPhoto)}
- Fixes already applied: ${JSON.stringify(recentFixesApplied)}

Provide overallScore (0.0-10.0), 5 dimension scores, bilingual summary, and the Top 3 highest-impact issues with executable fixAction values.`,
      config: {
        systemInstruction,
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            overallScore: { type: Type.NUMBER },
            dimensions: {
              type: Type.OBJECT,
              properties: {
                pixelGridAndPalette: { type: Type.NUMBER },
                spatialBalance: { type: Type.NUMBER },
                typographyAndContrast: { type: Type.NUMBER },
                interactiveAffordance: { type: Type.NUMBER },
                adaptivePhotoSync: { type: Type.NUMBER },
              },
              required: [
                'pixelGridAndPalette',
                'spatialBalance',
                'typographyAndContrast',
                'interactiveAffordance',
                'adaptivePhotoSync',
              ],
            },
            summary: {
              type: Type.OBJECT,
              properties: {
                zh: { type: Type.STRING },
                en: { type: Type.STRING },
              },
              required: ['zh', 'en'],
            },
            top3Issues: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  severity: { type: Type.STRING, enum: ['high', 'medium', 'low'] },
                  area: {
                    type: Type.STRING,
                    enum: ['layout', 'palette', 'typography', 'affordance', 'adaptation'],
                  },
                  title: {
                    type: Type.OBJECT,
                    properties: { zh: { type: Type.STRING }, en: { type: Type.STRING } },
                    required: ['zh', 'en'],
                  },
                  diagnosis: {
                    type: Type.OBJECT,
                    properties: { zh: { type: Type.STRING }, en: { type: Type.STRING } },
                    required: ['zh', 'en'],
                  },
                  fixAction: {
                    type: Type.STRING,
                    enum: [
                      'rebalance_slots',
                      'boost_contrast',
                      'enable_expanded_shelves',
                      'refine_lamp_harmony',
                      'compact_hud',
                      'apply_photo_accent',
                    ],
                  },
                  fixLabel: {
                    type: Type.OBJECT,
                    properties: { zh: { type: Type.STRING }, en: { type: Type.STRING } },
                    required: ['zh', 'en'],
                  },
                },
                required: ['id', 'severity', 'area', 'title', 'diagnosis', 'fixAction', 'fixLabel'],
              },
            },
            approved: { type: Type.BOOLEAN },
          },
          required: ['overallScore', 'dimensions', 'summary', 'top3Issues', 'approved'],
        },
      },
    });

    const parsed = JSON.parse((response.text ?? '{}').trim());
    return res.json({
      ...parsed,
      iteration,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    console.error('Error in /api/design-audit:', err);
    const message = err instanceof Error ? err.message : 'Design audit failed';
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

  app.use(
    '/',
    express.static(prototypeDir, {
      index: 'index.html',
      setHeaders: (res) => {
        res.setHeader('Cache-Control', 'no-store');
      },
    }),
  );

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(prototypeDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Pixel Room server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
