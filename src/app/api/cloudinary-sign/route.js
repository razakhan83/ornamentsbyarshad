import { v2 as cloudinary } from "cloudinary";
import { NextResponse, connection } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { resolveCloudinaryFolder } from "@/lib/cloudinaryFolders";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function GET(req) {
  await connection();
  try {
    const session = await getServerSession(authOptions);
    const { searchParams } = new URL(req.url);
    const resolved = resolveCloudinaryFolder(searchParams.get("folder"), session);

    if (resolved.error) {
      return NextResponse.json({ error: resolved.error }, { status: resolved.status || 400 });
    }

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
      return NextResponse.json(
        { error: "Image upload is not configured." },
        { status: 500 }
      );
    }

    const timestamp = Math.round(new Date().getTime() / 1000);
    const signature = cloudinary.utils.api_sign_request(
      {
        timestamp: timestamp,
        folder: resolved.folder,
      },
      apiSecret,
    );

    return NextResponse.json({
      signature,
      timestamp,
      cloudName,
      apiKey,
      folder: resolved.folder,
    });
  } catch (error) {
    console.error("Cloudinary sign error:", error);
    return NextResponse.json({ error: "Failed to sign upload" }, { status: 500 });
  }
}
