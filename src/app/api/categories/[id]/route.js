import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

import mongooseConnect from '@/lib/mongooseConnect';
import Category from '@/models/Category';
import Product from '@/models/Product';
import { optimizeCloudinaryUrl } from '@/lib/cloudinaryImage';
import {
  generateBlurDataURLFromDataUrl,
  generateBlurDataURLFromRemoteUrl,
} from '@/lib/imagePlaceholders';
import { revalidateTag } from 'next/cache';

function slugifyCategory(name = "") {
  return String(name)
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-");
}

export async function PATCH(req, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.isAdmin) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    await mongooseConnect();
    const { id } = await params;

    if (!id) {
        return NextResponse.json({ success: false, error: "Category ID is required" }, { status: 400 });
    }

    const body = await req.json();

    const existingCategory = await Category.findById(id);
    if (!existingCategory) {
      return NextResponse.json(
        { success: false, error: "Category not found" },
        { status: 404 },
      );
    }

    const image = body.image !== undefined ? String(body.image).trim() : existingCategory.image;
    const imagePublicId = body.imagePublicId !== undefined ? String(body.imagePublicId).trim() : existingCategory.imagePublicId;
    let blurDataURL = body.blurDataURL !== undefined ? String(body.blurDataURL).trim() : existingCategory.blurDataURL;

    const secondaryImage = body.secondaryImage !== undefined ? String(body.secondaryImage).trim() : existingCategory.secondaryImage;
    const secondaryImagePublicId = body.secondaryImagePublicId !== undefined ? String(body.secondaryImagePublicId).trim() : existingCategory.secondaryImagePublicId;
    let secondaryBlurDataURL = body.secondaryBlurDataURL !== undefined ? String(body.secondaryBlurDataURL).trim() : existingCategory.secondaryBlurDataURL;

    const tertiaryImage = body.tertiaryImage !== undefined ? String(body.tertiaryImage).trim() : existingCategory.tertiaryImage;
    const tertiaryImagePublicId = body.tertiaryImagePublicId !== undefined ? String(body.tertiaryImagePublicId).trim() : existingCategory.tertiaryImagePublicId;
    let tertiaryBlurDataURL = body.tertiaryBlurDataURL !== undefined ? String(body.tertiaryBlurDataURL).trim() : existingCategory.tertiaryBlurDataURL;

    // Only regenerate blur URL if the image actually changed and no blur URL was explicitly provided
    if (body.image !== undefined && !body.blurDataURL) {
      if (body.imageDataUrl) {
         blurDataURL = await generateBlurDataURLFromDataUrl(body.imageDataUrl);
      } else if (image) {
         blurDataURL = await generateBlurDataURLFromRemoteUrl(image);
      } else {
         blurDataURL = "";
      }
    }

    if (body.secondaryImage !== undefined && !body.secondaryBlurDataURL) {
      if (body.secondaryImageDataUrl) {
         secondaryBlurDataURL = await generateBlurDataURLFromDataUrl(body.secondaryImageDataUrl);
      } else if (secondaryImage) {
         secondaryBlurDataURL = await generateBlurDataURLFromRemoteUrl(secondaryImage);
      } else {
         secondaryBlurDataURL = "";
      }
    }

    if (body.tertiaryImage !== undefined && !body.tertiaryBlurDataURL) {
      if (body.tertiaryImageDataUrl) {
         tertiaryBlurDataURL = await generateBlurDataURLFromDataUrl(body.tertiaryImageDataUrl);
      } else if (tertiaryImage) {
         tertiaryBlurDataURL = await generateBlurDataURLFromRemoteUrl(tertiaryImage);
      } else {
         tertiaryBlurDataURL = "";
      }
    }

    const nextName = body.name !== undefined ? String(body.name || '').trim() : existingCategory.name;

    if (!nextName) {
      return NextResponse.json(
        { success: false, error: "Category name is required" },
        { status: 400 },
      );
    }

    existingCategory.name = nextName;
    existingCategory.slug = slugifyCategory(nextName);
    existingCategory.image = image;
    existingCategory.imagePublicId = imagePublicId;
    existingCategory.blurDataURL = blurDataURL;
    existingCategory.secondaryImage = secondaryImage;
    existingCategory.secondaryImagePublicId = secondaryImagePublicId;
    existingCategory.secondaryBlurDataURL = secondaryBlurDataURL;
    existingCategory.tertiaryImage = tertiaryImage;
    existingCategory.tertiaryImagePublicId = tertiaryImagePublicId;
    existingCategory.tertiaryBlurDataURL = tertiaryBlurDataURL;
    if (body.bgColor !== undefined) {
      existingCategory.bgColor = String(body.bgColor).trim();
    }
    if (body.isEnabled !== undefined) {
      existingCategory.isEnabled = body.isEnabled === true || body.isEnabled === 'true';
    }
    if (body.showOnHome !== undefined) {
      existingCategory.showOnHome = body.showOnHome === true || body.showOnHome === 'true';
    }
    if (body.storefrontProductLimit !== undefined) {
      const parsedLimit = Number(body.storefrontProductLimit);
      existingCategory.storefrontProductLimit = Number.isFinite(parsedLimit)
        ? Math.min(24, Math.max(1, parsedLimit))
        : 8;
    }
    if (body.featuredProductIds !== undefined) {
      existingCategory.featuredProductIds = Array.isArray(body.featuredProductIds)
        ? body.featuredProductIds.filter(Boolean)
        : [];
    }
    if (body.showcaseSelectionMode !== undefined) {
      existingCategory.showcaseSelectionMode = ['pinned_first', 'curated_only', 'latest'].includes(body.showcaseSelectionMode)
        ? body.showcaseSelectionMode
        : 'pinned_first';
    }

    await existingCategory.save();
    revalidateTag('categories');
    revalidateTag('home-page');
    revalidateTag('products');

    const productCount = await Product.countDocuments({ Category: existingCategory._id });

    return NextResponse.json(
      {
        success: true,
        data: {
          ...existingCategory.toObject(),
          _id: existingCategory._id.toString(),
          image: optimizeCloudinaryUrl(existingCategory.image || ""),
          blurDataURL: existingCategory.blurDataURL || "",
          secondaryImage: optimizeCloudinaryUrl(existingCategory.secondaryImage || ""),
          secondaryBlurDataURL: existingCategory.secondaryBlurDataURL || "",
          tertiaryImage: optimizeCloudinaryUrl(existingCategory.tertiaryImage || ""),
          tertiaryBlurDataURL: existingCategory.tertiaryBlurDataURL || "",
          bgColor: existingCategory.bgColor || "",
          productCount,
          showOnHome: existingCategory.showOnHome !== false,
          storefrontProductLimit: Math.min(24, Math.max(1, Number(existingCategory.storefrontProductLimit || 8))),
          featuredProductIds: Array.isArray(existingCategory.featuredProductIds)
            ? existingCategory.featuredProductIds.map((id) => (id?._id ? id._id.toString() : id.toString())).filter(Boolean)
            : [],
          showcaseSelectionMode: existingCategory.showcaseSelectionMode || 'pinned_first',
        },
      },
      { status: 200 },
    );

  } catch (error) {
    if (error.code === 11000) {
      return NextResponse.json(
        { success: false, error: "Category already exists" },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}
