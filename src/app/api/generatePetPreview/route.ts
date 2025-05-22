// app/api/generate/route.ts

import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export async function POST(request: NextRequest) {
  let { prompt, size, quality, background, n, moderation } =
    await request.json();

  if (background === "transparent") {
    prompt += " with transparent background";
  } 

  if (!prompt) {
    return NextResponse.json({ error: "prompt is required" }, { status: 400 });
  }

  try {
    const response = await openai.images.generate({
      model: "gpt-image-1",
      prompt,
      size,
      quality,
      background,
      n,
      moderation,
    });

    const urls = response.data?.map((img) =>
      // turn base64 into a data URL for easy preview
      `data:image/png;base64,${img.b64_json}`
    );

    return NextResponse.json({ urls });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Generation failed" },
      { status: 500 }
    );
  }
}
