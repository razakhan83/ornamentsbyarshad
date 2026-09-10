// @ts-nocheck
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

import mongooseConnect from "@/lib/mongooseConnect";
import Coupon from "@/models/Coupon";

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.isAdmin) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }
    if (session?.user?.isDemo) {
      return NextResponse.json({ success: false, message: 'Demo Mode: Actions are disabled. You have read-only access.', error: 'Demo Mode: Actions are disabled. You have read-only access.' }, { status: 403 });
    }

    const body = await req.json();

    // Data validation could be done manually here, but Mongoose will also catch errors based on schema.
    const {
      code,
      description,
      discountType,
      discountValue,
      minOrderAmount,
      usageLimitPerCoupon,
      usageLimitPerUser,
      startDate,
      endDate,
      isActive,
    } = body;

    if (!code || !discountType || !startDate || !endDate) {
      return NextResponse.json(
        { success: false, message: "Missing required fields" },
        { status: 400 }
      );
    }

    await mongooseConnect();

    // The unique constraint on 'code' will be enforced by Mongoose if the index exists,
    // but doing a quick check ensures a clear error message.
    const existingCoupon = await Coupon.findOne({ code: code.toUpperCase() });
    if (existingCoupon) {
      return NextResponse.json(
        { success: false, message: "A coupon with this code already exists" },
        { status: 400 }
      );
    }

    const newCoupon = new Coupon({
      code,
      description,
      discountType,
      discountValue: discountType === "free_shipping" ? 0 : discountValue,
      minOrderAmount,
      usageLimitPerCoupon: usageLimitPerCoupon || null,
      usageLimitPerUser,
      startDate,
      endDate,
      isActive,
    });

    await newCoupon.save();

    return NextResponse.json(
      { success: true, data: newCoupon, message: "Coupon created successfully" },
      { status: 201 }
    );
  } catch (error) {
    // Check for Mongoose validation errors
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((err) => err.message);
      return NextResponse.json({ success: false, message: messages.join(", ") }, { status: 400 });
    }
    
    // Check for Mongoose duplicate key error (code 11000)
    if (error.code === 11000) {
      return NextResponse.json(
        { success: false, message: "A coupon with this code already exists" },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
