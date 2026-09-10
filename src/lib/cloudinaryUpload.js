import { optimizeCloudinaryUrl } from '@/lib/cloudinaryImage';

async function safeReadJson(response) {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(text || 'Invalid JSON response');
  }
}

async function uploadViaServerApi(dataUrl, folder) {
  const res = await fetch("/api/cloudinary-upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ file: dataUrl, folder }),
  });
  const data = await safeReadJson(res);
  if (!res.ok || !data?.success) {
    throw new Error(data?.error || "Server upload to Cloudinary failed");
  }
  return {
    url: data.url,
    publicId: data.publicId || "",
    blurDataURL: data.blurDataURL || "",
  };
}

export async function uploadImageDataUrl(dataUrl, folder = "kifayatly_products") {
  // First attempt direct browser-to-Cloudinary signed upload
  try {
    const signRes = await fetch(`/api/cloudinary-sign?folder=${encodeURIComponent(folder)}`);
    const signData = await safeReadJson(signRes);

    if (!signRes.ok || !signData?.cloudName || !signData?.apiKey || !signData?.signature) {
      // If signature endpoint returned an error (e.g. missing env vars or unauthorized),
      // throw that error directly so the user knows
      if (signRes.status === 401 || (signData?.error && signData.error.includes("missing"))) {
        throw new Error(signData.error);
      }
      return await uploadViaServerApi(dataUrl, folder);
    }

    const uploadFormData = new FormData();
    uploadFormData.append("file", dataUrl);
    uploadFormData.append("api_key", signData.apiKey);
    uploadFormData.append("timestamp", signData.timestamp);
    uploadFormData.append("signature", signData.signature);
    uploadFormData.append("folder", folder);

    const uploadRes = await fetch(
      `https://api.cloudinary.com/v1_1/${signData.cloudName}/image/upload`,
      {
        method: "POST",
        body: uploadFormData,
      },
    );

    const uploadData = await safeReadJson(uploadRes);
    if (!uploadRes.ok || !uploadData.secure_url) {
      throw new Error(uploadData?.error?.message || "Cloudinary direct upload failed");
    }

    let placeholderRes;
    try {
      placeholderRes = await fetch("/api/images/placeholder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl: uploadData.secure_url }),
      });
    } catch (err) {
      console.warn("Blur placeholder generation error:", err);
    }

    const placeholderData = placeholderRes ? await safeReadJson(placeholderRes) : null;
    const blurDataURL = placeholderData?.blurDataURL || "";

    return {
      url: optimizeCloudinaryUrl(uploadData.secure_url),
      publicId: uploadData.public_id || "",
      blurDataURL,
    };
  } catch (directErr) {
    // If the error was an explicit config or auth error, throw it immediately
    if (directErr.message?.includes("missing") || directErr.message?.includes("Unauthorized")) {
      throw directErr;
    }

    console.warn(
      "[Cloudinary] Direct upload failed, falling back to server-side upload API:",
      directErr.message
    );

    // Fallback through Next.js server API to bypass adblockers and CORS
    return await uploadViaServerApi(dataUrl, folder);
  }
}

export async function uploadVideoFile(file, folder = "kifayatly_videos", ratioType = null) {
  const signRes = await fetch(`/api/cloudinary-sign?folder=${encodeURIComponent(folder)}`);
  const signData = await safeReadJson(signRes);
  if (!signRes.ok) {
    throw new Error(signData?.error || "Failed to get upload signature");
  }

  const uploadFormData = new FormData();
  uploadFormData.append("file", file);
  uploadFormData.append("api_key", signData.apiKey);
  uploadFormData.append("timestamp", signData.timestamp);
  uploadFormData.append("signature", signData.signature);
  uploadFormData.append("folder", folder);

  const uploadRes = await fetch(
    `https://api.cloudinary.com/v1_1/${signData.cloudName}/video/upload`,
    {
      method: "POST",
      body: uploadFormData,
    },
  );
  
  const uploadData = await safeReadJson(uploadRes);
  if (!uploadRes.ok || !uploadData.secure_url) {
    throw new Error(uploadData?.error?.message || "Cloudinary video upload failed");
  }

  let optimizedUrl = uploadData.secure_url;
  
  // Inject Cloudinary optimization and cropping flags
  if (optimizedUrl.includes('/video/upload/')) {
    let flags = 'q_auto,f_webm';
    
    if (ratioType === 'pc') {
      flags += ',ar_21:9,c_fill,g_auto,w_1920';
    } else if (ratioType === 'mobile') {
      flags += ',ar_1:1,c_fill,g_auto,w_800';
    }

    optimizedUrl = optimizedUrl.replace('/video/upload/', `/video/upload/${flags}/`);
  }

  return {
    url: optimizedUrl,
    publicId: uploadData.public_id || "",
  };
}
