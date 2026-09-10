import { NextResponse } from "next/server";

import {
  generateBlurDataURLFromDataUrl,
  generateBlurDataURLFromRemoteUrl,
} from "@/lib/imagePlaceholders";

export async function POST(req) {
  try {
    const { dataUrl, imageUrl } = await req.json();

    if (!dataUrl && !imageUrl) {
      return NextResponse.json(
        { success: false, error: "Image data URL or image URL is required" },
        { status: 400 },
      );
    }

    const blurDataURL =
      typeof imageUrl === "string" && imageUrl
        ? await generateBlurDataURLFromRemoteUrl(imageUrl)
        : await generateBlurDataURLFromDataUrl(dataUrl);

    return NextResponse.json({ success: true, blurDataURL });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to generate placeholder" },
      { status: 500 },
    );
  }
}
