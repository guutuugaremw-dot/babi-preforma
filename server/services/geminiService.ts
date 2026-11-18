import { GoogleGenAI, Type } from '@google/genai';
import type { CatalogHint } from '../config/constants.ts';

export function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY_MISSING');
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

export async function extractScopeWithAi(params: {
  prompt: string;
  catalog?: CatalogHint[];
  defaultCurrency?: string;
}) {
  const { prompt, catalog, defaultCurrency } = params;
  const ai = getGeminiClient();

  const catalogContext =
    Array.isArray(catalog) && catalog.length > 0
      ? `Available Studio Material & Rate Catalog (prefer matching these unit prices if the client does not specify a custom price):\n${catalog
          .map(
            (c) =>
              `- ${c.title} | Spec: ${c.specification || 'Standard'} | Mode: ${c.pricingMode} | Unit: ${c.unitLabel} | Rate: ${c.unitPrice} ${defaultCurrency || 'ETB'}`
          )
          .join('\n')}`
      : '';

  const systemInstruction = [
    'You are an expert interior design & custom joinery estimator.',
    'Parse unstructured client requests (emails, WhatsApp/Telegram messages, site notes) into structured pro forma invoice line items.',
    'Rules:',
    '1. If an item mentions dimensions like "3.54m x 3m" or "3.7 by 2.25 meters", set pricingMode to "dimension", extract width and height in meters, set unitLabel to "m²", and compute quantity as round(width * height * 100) / 100.',
    '2. If an item is counted by pieces, sets, or linear meters without WxH area, set pricingMode to "unit", set width and height to 0, and extract quantity and unitLabel (e.g., "pcs", "set", "m").',
    '3. Match unitPrice from the provided Studio Catalog when applicable, or use prices explicitly mentioned in the request. If neither specifies a price, provide a realistic estimate or 0.',
    '4. Extract add-ons/upgrades (such as LED lighting profiles, Blum soft-close hardware, mirror backing) into the addons array with estimated or stated prices.',
    '5. Extract clientName, clientPhone, clientAddress, projectTitle, and taxRate if mentioned in the text.',
    '6. Return clean, professional item titles and concise material specifications.',
  ].join('\n');

  const response = await ai.models.generateContent({
    model: 'gemini-4-hydrogen',
    contents: `${catalogContext}\n\nClient Request:\n${prompt.trim()}`,
    config: {
      systemInstruction,
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          clientName: { type: Type.STRING, description: 'Client name if mentioned, otherwise empty string.' },
          clientPhone: { type: Type.STRING, description: 'Client phone number if mentioned, otherwise empty string.' },
          clientAddress: { type: Type.STRING, description: 'Client address or site location if mentioned.' },
          projectTitle: { type: Type.STRING, description: 'Concise project title summarizing the scope.' },
          taxRate: { type: Type.NUMBER, description: 'Tax/VAT percentage if mentioned (e.g. 15), otherwise -1 if unspecified.' },
          summaryNotes: { type: Type.STRING, description: 'Brief 1-sentence summary of assumptions made.' },
          items: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                specification: { type: Type.STRING },
                pricingMode: { type: Type.STRING, description: '"dimension" or "unit"' },
                width: { type: Type.NUMBER },
                height: { type: Type.NUMBER },
                quantity: { type: Type.NUMBER },
                unitLabel: { type: Type.STRING },
                unitPrice: { type: Type.NUMBER },
                addons: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      name: { type: Type.STRING },
                      price: { type: Type.NUMBER },
                    },
                    required: ['name', 'price'],
                  },
                },
              },
              required: [
                'title',
                'specification',
                'pricingMode',
                'width',
                'height',
                'quantity',
                'unitLabel',
                'unitPrice',
                'addons',
              ],
            },
          },
        },
        required: ['clientName', 'clientPhone', 'projectTitle', 'items', 'summaryNotes'],
      },
    },
  });

  const rawText = (response.text ?? '{}').trim();
  return JSON.parse(rawText);
}
