// app/api/generate/route.ts
import { NextRequest, NextResponse } from 'next/server';                                       // :contentReference[oaicite:0]{index=0}
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });                             // :contentReference[oaicite:1]{index=1}

export async function GET(request: NextRequest) {
  const prompt = request.nextUrl.searchParams.get('prompt');                                    // :contentReference[oaicite:2]{index=2}
  if (!prompt) {
    return NextResponse.json({ error: 'prompt query param required' }, { status: 400 });        // :contentReference[oaicite:3]{index=3}
  }

  try {
    // Generate a 1024×1024 PNG with transparent background.
    // GPT-Image-1 defaults to returning base64 JSON under data[0].b64_json.        :contentReference[oaicite:4]{index=4}
    const response = await openai.images.generate({
      model:       'gpt-image-1',
      prompt,
      size:        '1024x1024',
      background:  'transparent',
      // omit responseFormat here—Node client v4 automatically returns b64_json for gpt-image-1 :contentReference[oaicite:5]{index=5}
    });

    // Narrow and extract the Base64 string
    const b64 = response.data?.[0]?.b64_json;
    if (!b64) {
      return NextResponse.json(
        { error: 'No image returned by OpenAI' },
        { status: 502 }
      );
    }

    return NextResponse.json({ b64 });                                                         // :contentReference[oaicite:6]{index=6}
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });                         // :contentReference[oaicite:7]{index=7}
  }
}
