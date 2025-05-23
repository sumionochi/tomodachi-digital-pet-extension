// src/app/api/upload/route.ts
import { NextRequest, NextResponse } from "next/server";

// now numeric
const PUBLISHER = process.env.NEXT_PUBLIC_WALRUS_PUBLISHER_URL!; // e.g. https://publisher.testnet.walrus.space
const EPOCHS = process.env.NEXT_PUBLIC_WALRUS_EPOCHS; // e.g. "53"

export async function POST(req: NextRequest) {
  const { b64 } = await req.json();
  if (!b64) {
    return NextResponse.json({ error: "Missing b64 payload" }, { status: 400 });
  }

  const data = Buffer.from(b64, "base64");
  // only append "?epochs=" if EPOCHS is numeric
  const qs = EPOCHS ? `?epochs=${encodeURIComponent(EPOCHS)}` : "";
  const url = `${PUBLISHER}/v1/blobs${qs}`;

  const res = await fetch(url, {
    method: "PUT",
    headers: { "Content-Type": "application/octet-stream" },
    body: data,
  });

  // read text once
  const text = await res.text();

  // try JSON.parse
  let body: any;
  try {
    body = JSON.parse(text);
  } catch {
    return NextResponse.json(
      { error: `Walrus upload non-JSON response: ${text}` },
      { status: 502 }
    );
  }

  if (!res.ok) {
    return NextResponse.json(
      { error: `Walrus upload failed: ${JSON.stringify(body)}` },
      { status: 502 }
    );
  }

  // pull out either newlyCreated…blobObject.blobId or alreadyCertified.blobId
  const blobId =
    body.newlyCreated?.blobObject?.blobId || body.alreadyCertified?.blobId;

  if (!blobId) {
    return NextResponse.json(
      { error: "No blobId returned by Walrus" },
      { status: 502 }
    );
  }

  return NextResponse.json({ blobId });
}
