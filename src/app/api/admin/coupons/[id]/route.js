import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import mongooseConnect from "@/lib/mongooseConnect";
import Coupon from "@/models/Coupon";
import { authOptions } from "@/lib/auth";

export async function GET(req, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.isAdmin) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    await mongooseConnect();
    const { id } = await params;
    
    const coupon = await Coupon.findById(id);
    if (!coupon) {
      return NextResponse.json({ success: false, message: "Coupon not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, coupon });
  } catch (error) {
    console.error("Error fetching coupon:", error);
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.isAdmin) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }
    if (session?.user?.isDemo) {
      return NextResponse.json({ success: false, message: 'Demo Mode: Actions are disabled. You have read-only access.' }, { status: 403 });
    }

    await mongooseConnect();
    const { id } = await params;
    const data = await req.json();

    // Check for unique code if it was changed
    if (data.code) {
      const existing = await Coupon.findOne({ code: data.code.toUpperCase(), _id: { $ne: id } });
      if (existing) {
        return NextResponse.json({ success: false, message: "Coupon code already exists" }, { status: 400 });
      }
    }

    const updatedCoupon = await Coupon.findByIdAndUpdate(
      id,
      {
        ...data,
        code: data.code ? data.code.toUpperCase() : undefined,
      },
      { new: true, runValidators: true }
    );

    if (!updatedCoupon) {
      return NextResponse.json({ success: false, message: "Coupon not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, coupon: updatedCoupon });
  } catch (error) {
    console.error("Error updating coupon:", error);
    if (error.code === 11000) {
      return NextResponse.json({ success: false, message: "Coupon code already exists" }, { status: 400 });
    }
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.isAdmin) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }
    if (session?.user?.isDemo) {
      return NextResponse.json({ success: false, message: 'Demo Mode: Actions are disabled. You have read-only access.' }, { status: 403 });
    }

    await mongooseConnect();
    const { id } = await params;
    
    const deletedCoupon = await Coupon.findByIdAndDelete(id);
    if (!deletedCoupon) {
      return NextResponse.json({ success: false, message: "Coupon not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Coupon deleted successfully" });
  } catch (error) {
    console.error("Error deleting coupon:", error);
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
  }
}
