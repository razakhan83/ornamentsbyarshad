import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import {
  GoogleGenAI,
  HarmBlockThreshold,
  HarmCategory,
} from "@google/genai";
import { authOptions } from "@/lib/auth";
import { formatSeoKeywords, normalizeSeoKeywords } from "@/lib/seoKeywords";

const SYSTEM_PROMPT =
  "You are an Elite Luxury Jewelry SEO Specialist and Copywriter for 'Ornaments by Arshad'. Create high-conversion, SEO-optimized metadata for luxury jewelry buyers and wedding shoppers in Pakistan. SEO Title must be elegant, include the primary precious metal/gemstone keyword, and reflect fine jewelry craftsmanship. Meta Description must use a sophisticated, evocative tone highlighting authenticity, hallmarking, and timeless beauty with a strong call to action. Keywords must include 10 latent semantic keywords with at least 2 fine jewelry search phrases. Return results ONLY in valid JSON format with this structure: {\"seoTitle\":\"...\",\"seoDescription\":\"...\",\"keywords\":\"keyword1, keyword2, ...\"}.";
const GEMINI_MODEL = "gemini-3-flash-preview";
const RETRY_DELAYS_MS = [1500];
const REQUEST_TIMEOUT_MS = 60000;
const SEO_SAFETY_SETTINGS = [
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
];

function clampText(value, maxLength) {
  return String(value ?? "")
    .trim()
    .slice(0, maxLength);
}

function sanitizeJsonResponse(text) {
  let raw = String(text ?? "").trim();

  if (!raw) {
    throw new Error("Gemini returned an empty response.");
  }

  raw = raw.replace(/^\uFEFF/, "").trim();

  if (raw.startsWith("```json")) {
    raw = raw.replace(/^```json\s*/i, "");
  } else if (raw.startsWith("```")) {
    raw = raw.replace(/^```\s*/i, "");
  }

  raw = raw.replace(/\s*```$/, "").trim();

  const objectStart = raw.indexOf("{");
  const objectEnd = raw.lastIndexOf("}");
  if (objectStart < 0 || objectEnd <= objectStart) {
    throw new Error("Gemini returned text without a complete JSON object.");
  }

  raw = raw.slice(objectStart, objectEnd + 1).trim();

  return raw;
}

function extractJson(text) {
  return JSON.parse(sanitizeJsonResponse(text));
}

function flattenKeywordValue(value) {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value.flatMap((item) => flattenKeywordValue(item));
  }

  if (typeof value === "object") {
    return Object.values(value).flatMap((item) => flattenKeywordValue(item));
  }

  return String(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeSeoPayload(parsed) {
  const packagePayload =
    parsed?.seo_package ??
    parsed?.seoPackage ??
    parsed;

  return {
    seoTitle:
      packagePayload?.seoTitle ??
      packagePayload?.title ??
      packagePayload?.meta_title ??
      packagePayload?.metaTitle ??
      "",
    seoDescription:
      packagePayload?.seoDescription ??
      packagePayload?.metaDescription ??
      packagePayload?.description ??
      packagePayload?.meta_description ??
      "",
    seoKeywords:
      packagePayload?.seoKeywords ??
      packagePayload?.keywords ??
      "",
  };
}

function extractResponseText(response) {
  if (response?.text) {
    return response.text;
  }

  const parts = response?.candidates?.[0]?.content?.parts ?? [];
  const text = parts
    .map((part) => part?.text ?? "")
    .filter(Boolean)
    .join("");

  if (!text) {
    throw new Error("Gemini returned no text candidates.");
  }

  return text;
}

function isGeminiRateLimitError(error) {
  const message = String(error?.message ?? "").toLowerCase();
  return message.includes("429") || message.includes("quota");
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function generateContentWithRetry(model, prompt) {
  let lastError;

  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt += 1) {
    try {
      return await model.models.generateContent({
        model: GEMINI_MODEL,
        systemInstruction: SYSTEM_PROMPT,
        contents: prompt,
        timeout: REQUEST_TIMEOUT_MS,
        config: {
          temperature: 1.0,
          responseMimeType: "application/json",
          safetySettings: SEO_SAFETY_SETTINGS,
        },
      });
    } catch (error) {
      lastError = error;

      if (!isGeminiRateLimitError(error) || attempt === RETRY_DELAYS_MS.length) {
        throw error;
      }

      await sleep(RETRY_DELAYS_MS[attempt]);
    }
  }

  throw lastError;
}

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.isAdmin) {
      return NextResponse.json(
        { success: false, message: "Unauthorized Access" },
        { status: 401 }
      );
    }
    if (session?.user?.isDemo) {
      return NextResponse.json({ success: false, message: 'Demo Mode: Actions are disabled. You have read-only access.', error: 'Demo Mode: Actions are disabled. You have read-only access.' }, { status: 403 });
    }

    const apiKey = String(process.env.GEMINI_API_KEY ?? "").trim();

    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,
          message: "Missing GEMINI_API_KEY on the server.",
        },
        { status: 500 }
      );
    }

    const body = await request.json();
    const title = String(body?.title ?? "").trim();
    const description = String(body?.description ?? "").trim();
    const category = String(body?.category ?? "").trim();

    if (!title || !description) {
      return NextResponse.json(
        {
          success: false,
          message: "Both title and description are required.",
        },
        { status: 400 }
      );
    }

    if (title.length < 10 || description.length < 10) {
      return NextResponse.json(
        {
          success: false,
          message: "Please provide more product details for better SEO",
        },
        { status: 400 }
      );
    }

    const ai = new GoogleGenAI({ apiKey });

    let result;
    try {
      result = await generateContentWithRetry(
        ai,
        `Analyze this product: Title: ${title}, Category: ${category || "General"}, Description: ${description}. Generate the SEO package now.`
      );
    } catch (error) {
      const message = String(error?.message ?? "");

      if (isGeminiRateLimitError(error)) {
        return NextResponse.json(
          {
            success: false,
            message: "Google AI is busy, please wait 60 seconds.",
            error: message,
          },
          { status: 429 }
        );
      }

      throw error;
    }

    let parsed;
    try {
      parsed = extractJson(extractResponseText(result));
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          message: "AI was interrupted. Please try again in 5 seconds.",
          error: String(error?.message ?? error),
        },
        { status: 502 }
      );
    }
    const normalizedPayload = normalizeSeoPayload(parsed);
    const seoTitle = clampText(
      normalizedPayload.seoTitle,
      60
    );
    const seoDescription = clampText(
      normalizedPayload.seoDescription,
      160
    );
    const seoKeywords = formatSeoKeywords(
      flattenKeywordValue(normalizedPayload.seoKeywords)
    );

    if (!seoTitle || !seoDescription || !seoKeywords) {
      return NextResponse.json(
        {
          success: false,
          message: "AI was interrupted. Please try again in 5 seconds.",
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        seoTitle,
        seoDescription,
        seoKeywords,
        keywords: normalizeSeoKeywords(seoKeywords),
      },
    });
  } catch (error) {
    console.error("[admin/generate-seo]", error);

    const message = String(error?.message ?? "");
    if (isGeminiRateLimitError(error)) {
      return NextResponse.json(
        {
          success: false,
          message: "Google AI is busy, please wait 60 seconds.",
          error: message,
        },
        { status: 429 }
      );
    }

    if (message.includes("404") || message.toLowerCase().includes("not found")) {
      return NextResponse.json(
        {
          success: false,
          message:
            "The configured Gemini model is unavailable for this API version or project.",
          error: message,
        },
        { status: 502 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: "Failed to generate SEO content.",
        error: error.message,
      },
      { status: 500 }
    );
  }
}
