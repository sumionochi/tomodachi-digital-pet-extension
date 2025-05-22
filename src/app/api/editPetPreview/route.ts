// src/app/api/editPetPreview/route.ts
import { NextRequest, NextResponse } from "next/server";
import OpenAI, { toFile } from "openai";
import { Readable } from "stream";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export async function POST(req: NextRequest) {
  try {
    const {
      images: b64Array,
      prompt,
      size,
      quality,
      background,
    } = await req.json();

    if (!Array.isArray(b64Array) || b64Array.length === 0) {
      return NextResponse.json(
        { error: "No images provided" },
        { status: 400 }
      );
    }

    // Helper to strip off any data-url prefix:
    const cleanBase64 = (b64: string) =>
      b64.replace(/^data:image\/\w+;base64,/, "");

    // Turn each Base64 string into a File-like object
    const imageFiles = await Promise.all(
      b64Array.map(async (rawB64: string, i: number) => {
        const b64 = cleanBase64(rawB64);
        const buffer = Buffer.from(b64, "base64");
        const stream = Readable.from([buffer]);
        return toFile(stream, `input_${i}.png`, { type: "image/png" });
      })
    );

    // Build a single prompt string (add background hint if needed)
    const fullPrompt =
      prompt +
      (background === "transparent"
        ? " (please keep the background transparent)"
        : "");

    // Call OpenAI’s GPT-Image-1 edit endpoint with multiple source images
    const response = await openai.images.edit({
      model: "gpt-image-1",
      image: imageFiles,
      prompt: fullPrompt,
      n: 1,
      size, // e.g. "1024x1024"
      quality, // "low" | "medium" | "high" | "auto"
    });

    const editedB64 = response.data?.[0]?.b64_json;
    if (!editedB64) {
      return NextResponse.json(
        { error: "No image returned by edit endpoint" },
        { status: 502 }
      );
    }

    // Return as a data‐URL so your frontend can just <img src=…>
    return NextResponse.json({
      url: `data:image/png;base64,${editedB64}`,
    });
  } catch (err: any) {
    console.error("❌ editPetPreview failed", err);
    return NextResponse.json(
      { error: err.message || "Unknown error in editPetPreview" },
      { status: 500 }
    );
  }
}
