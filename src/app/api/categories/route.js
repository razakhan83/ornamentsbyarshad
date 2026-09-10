// @ts-nocheck
import { revalidatePath, revalidateTag } from 'next/cache';
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

import mongooseConnect from "@/lib/mongooseConnect";
import { optimizeCloudinaryUrl } from "@/lib/cloudinaryImage";
import {
  generateBlurDataURLFromDataUrl,
  generateBlurDataURLFromRemoteUrl,
} from "@/lib/imagePlaceholders";
import Category from "@/models/Category";
import mongoose from "mongoose";
import Product from "@/models/Product";

async function getCategoryProductCountMap() {
  const counts = await Product.aggregate([
    { $unwind: "$Category" },
    {
      $group: {
        _id: "$Category",
        productCount: { $sum: 1 },
      },
    },
  ]);

  return new Map(counts.map((entry) => [String(entry._id), Number(entry.productCount || 0)]));
}

function slugifyCategory(name = "") {
  return String(name)
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-");
}

// GET all categories — sorted by sortOrder then name
export async function GET() {
  try {
    await mongooseConnect();

    const categories = await Category.find({
      slug: { $nin: ['special-offers', 'new-arrivals', 'featured', 'best-sellers'] },
    }).sort({ sortOrder: 1, name: 1 }).lean();
    const productCountMap = await getCategoryProductCountMap();
    return NextResponse.json({
      success: true,
      count: categories.length,
      data: categories.map((category) => ({
        ...category,
        _id: category._id.toString(),
        image: optimizeCloudinaryUrl(category.image || ''),
        bgColor: category.bgColor || '',
        secondaryImage: optimizeCloudinaryUrl(category.secondaryImage || ''),
        tertiaryImage: optimizeCloudinaryUrl(category.tertiaryImage || ''),
        productCount: productCountMap.get(String(category._id)) || 0,
        showOnHome: category.showOnHome !== false,
        storefrontProductLimit: Math.min(24, Math.max(1, Number(category.storefrontProductLimit || 8))),
        featuredProductIds: Array.isArray(category.featuredProductIds)
          ? category.featuredProductIds.map((id) => (id?._id ? id._id.toString() : id.toString())).filter(Boolean)
          : [],
        showcaseSelectionMode: category.showcaseSelectionMode || 'pinned_first',
      })),
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}

// POST new category
export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.isAdmin) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    await mongooseConnect();
    const body = await req.json();

    if (!body.name) {
      return NextResponse.json(
        { success: false, error: "Category name is required" },
        { status: 400 },
      );
    }

    // Auto-assign sortOrder to end of list
    const count = await Category.countDocuments();
    const image = String(body.image || "").trim();
    const imagePublicId = String(body.imagePublicId || "").trim();
    let blurDataURL = String(body.blurDataURL || "").trim();

    const secondaryImage = String(body.secondaryImage || "").trim();
    const secondaryImagePublicId = String(body.secondaryImagePublicId || "").trim();
    let secondaryBlurDataURL = String(body.secondaryBlurDataURL || "").trim();

    const tertiaryImage = String(body.tertiaryImage || "").trim();
    const tertiaryImagePublicId = String(body.tertiaryImagePublicId || "").trim();
    let tertiaryBlurDataURL = String(body.tertiaryBlurDataURL || "").trim();

    if (image && !blurDataURL && body.imageDataUrl) {
      blurDataURL = await generateBlurDataURLFromDataUrl(body.imageDataUrl);
    }

    if (image && !blurDataURL) {
      blurDataURL = await generateBlurDataURLFromRemoteUrl(image);
    }

    if (secondaryImage && !secondaryBlurDataURL && body.secondaryImageDataUrl) {
      secondaryBlurDataURL = await generateBlurDataURLFromDataUrl(body.secondaryImageDataUrl);
    }

    if (secondaryImage && !secondaryBlurDataURL) {
      secondaryBlurDataURL = await generateBlurDataURLFromRemoteUrl(secondaryImage);
    }

    if (tertiaryImage && !tertiaryBlurDataURL && body.tertiaryImageDataUrl) {
      tertiaryBlurDataURL = await generateBlurDataURLFromDataUrl(body.tertiaryImageDataUrl);
    }

    if (tertiaryImage && !tertiaryBlurDataURL) {
      tertiaryBlurDataURL = await generateBlurDataURLFromRemoteUrl(tertiaryImage);
    }

    const category = await Category.create({
      name: body.name.trim(),
      slug: slugifyCategory(body.name),
      image,
      imagePublicId,
      blurDataURL,
      secondaryImage,
      secondaryImagePublicId,
      secondaryBlurDataURL,
      tertiaryImage,
      tertiaryImagePublicId,
      tertiaryBlurDataURL,
      bgColor: String(body.bgColor || "").trim(),
      sortOrder: body.sortOrder ?? count,
      isEnabled: body.isEnabled !== false,
      showOnHome: body.showOnHome !== false,
    });
    revalidateTag('categories', 'max');
    revalidateTag('home-sections');
    revalidatePath('/');
    return NextResponse.json(
      {
        success: true,
        data: {
          ...category.toObject(),
          _id: category._id.toString(),
          image: optimizeCloudinaryUrl(category.image || ""),
          blurDataURL: category.blurDataURL || "",
          secondaryImage: optimizeCloudinaryUrl(category.secondaryImage || ""),
          secondaryBlurDataURL: category.secondaryBlurDataURL || "",
          tertiaryImage: optimizeCloudinaryUrl(category.tertiaryImage || ""),
          tertiaryBlurDataURL: category.tertiaryBlurDataURL || "",
          bgColor: category.bgColor || "",
          productCount: 0,
          showOnHome: category.showOnHome !== false,
        },
      },
      { status: 201 },
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

// PUT — bulk update sort order for categories
// Body: { categories: [{ _id, sortOrder }, ...] }
export async function PUT(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.isAdmin) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    await mongooseConnect();
    const body = await req.json();

    if (!Array.isArray(body.categories)) {
      return NextResponse.json(
        { success: false, error: "Expected { categories: [...] }" },
        { status: 400 },
      );
    }

    const operations = body.categories.map((cat) => ({
      updateOne: {
        filter: { _id: new mongoose.Types.ObjectId(cat._id) },
        update: { $set: { 
          sortOrder: Number(cat.sortOrder) || 0,
          ...(cat.isEnabled !== undefined && { isEnabled: cat.isEnabled === true || cat.isEnabled === 'true' }),
          ...(cat.showOnHome !== undefined && { showOnHome: cat.showOnHome === true || cat.showOnHome === 'true' }),
        } },
      },
    }));

    const result = await Category.bulkWrite(operations);
    console.log('[API] Categories bulkWrite result:', result.modifiedCount, 'modified');

    // Return the freshly-sorted list so the frontend can use it directly
    const updated = await Category.find({}).sort({ sortOrder: 1, name: 1 }).lean();
    const productCountMap = await getCategoryProductCountMap();
    revalidateTag('categories', 'max');
    revalidateTag('home-sections');
    revalidatePath('/');
    return NextResponse.json({
      success: true,
      message: "Sort order updated",
      data: updated.map((category) => ({
        ...category,
        _id: category._id.toString(),
        image: optimizeCloudinaryUrl(category.image || ""),
        productCount: productCountMap.get(String(category._id)) || 0,
        showOnHome: category.showOnHome !== false,
      })),
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}

// DELETE a category by _id (sent as query param)
export async function DELETE(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.isAdmin) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    await mongooseConnect();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Category ID is required" },
        { status: 400 },
      );
    }

    const categoryToDelete = await Category.findById(id);
    if (!categoryToDelete) {
      return NextResponse.json(
        { success: false, error: "Category not found" },
        { status: 404 },
      );
    }

    const deleted = await Category.findByIdAndDelete(id);

    revalidateTag('categories', 'max');
    revalidateTag('home-sections');
    revalidatePath('/');
    return NextResponse.json({ success: true, message: "Category deleted" });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}
