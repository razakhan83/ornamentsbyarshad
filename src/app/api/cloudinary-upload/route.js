import { v2 as cloudinary } from "cloudinary";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { generateBlurDataURLFromRemoteUrl } from "@/lib/imagePlaceholders";
import { optimizeCloudinaryUrl } from "@/lib/cloudinaryImage";
import { resolveCloudinaryFolder } from "@/lib/cloudinaryFolders";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const maxDuration = 60; // Allow up to 60s for high-res uploads

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    const contentType = req.headers.get("content-type") || "";
    let filePayload = null;
    let folder = "ornaments_products";

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file");
      folder = String(formData.get("folder") || "ornaments_products");
      if (!file) {
        return NextResponse.json(
          { success: false, error: "No file payload provided." },
          { status: 400 }
        );
      }
      if (typeof file === "string") {
        filePayload = file;
      } else {
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const mimeType = file.type || "application/octet-stream";
        filePayload = `data:${mimeType};base64,${buffer.toString("base64")}`;
      }
    } else {
      const body = await req.json();
      filePayload = body?.file;
      folder = String(body?.folder || "ornaments_products");
    }

    const resolved = resolveCloudinaryFolder(folder, session);

    if (resolved.error) {
      return NextResponse.json(
        { success: false, error: resolved.error },
        { status: resolved.status || 400 }
      );
    }

    if (
      !process.env.CLOUDINARY_CLOUD_NAME ||
      !process.env.CLOUDINARY_API_KEY ||
      !process.env.CLOUDINARY_API_SECRET
    ) {
      return NextResponse.json(
        { success: false, error: "Cloudinary upload is not configured." },
        { status: 500 }
      );
    }

    if (!filePayload) {
      return NextResponse.json(
        { success: false, error: "No file/image payload provided." },
        { status: 400 }
      );
    }

    const uploadResult = await cloudinary.uploader.upload(filePayload, {
      folder: resolved.folder,
      resource_type: "auto",
    });

    if (!uploadResult?.secure_url) {
      return NextResponse.json(
        { success: false, error: "Cloudinary did not return a valid secure_url." },
        { status: 500 }
      );
    }

    let blurDataURL = "";
    if (uploadResult.resource_type === "image") {
      try {
        blurDataURL = await generateBlurDataURLFromRemoteUrl(uploadResult.secure_url);
      } catch (blurErr) {
        console.warn("Server blur placeholder generation warning:", blurErr.message);
      }
    }

    const isVideo = uploadResult.resource_type === "video";

    return NextResponse.json({
      success: true,
      url: isVideo ? uploadResult.secure_url : optimizeCloudinaryUrl(uploadResult.secure_url),
      publicId: uploadResult.public_id || "",
      blurDataURL: blurDataURL || "",
    });
  } catch (error) {
    console.error("Server Cloudinary upload error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to upload image",
      },
      { status: 500 }
    );
  }
}
