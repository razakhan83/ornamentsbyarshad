"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ChevronLeft, Save } from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel, FieldDescription, FieldContent, FieldTitle, FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Separator } from "@/components/ui/separator";

export default function CreateCouponPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  const [formData, setFormData] = useState({
    code: "",
    description: "",
    discountType: "percentage",
    discountValue: "",
    minOrderAmount: "0",
    usageLimitPerCoupon: "",
    usageLimitPerUser: "1",
    startDate: "",
    endDate: "",
    isActive: true,
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "code" ? value.toUpperCase() : value,
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const handleSelectChange = (value) => {
    setFormData((prev) => ({
      ...prev,
      discountType: value,
      // Reset discount value if free shipping is selected
      discountValue: value === "free_shipping" ? "0" : prev.discountValue,
    }));
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.code.trim()) newErrors.code = "Coupon code is required";
    if (formData.discountType !== "free_shipping" && !formData.discountValue) {
      newErrors.discountValue = "Discount value is required";
    }
    if (!formData.startDate) newErrors.startDate = "Start date is required";
    if (!formData.endDate) newErrors.endDate = "End date is required";
    
    if (formData.startDate && formData.endDate) {
      if (new Date(formData.startDate) >= new Date(formData.endDate)) {
        newErrors.endDate = "End date must be after start date";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error("Please fix the validation errors");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/admin/coupons", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          discountValue: Number(formData.discountValue) || 0,
          minOrderAmount: Number(formData.minOrderAmount) || 0,
          usageLimitPerCoupon: formData.usageLimitPerCoupon ? Number(formData.usageLimitPerCoupon) : null,
          usageLimitPerUser: Number(formData.usageLimitPerUser) || 1,
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        toast.success("Coupon created successfully!");
        router.push("/admin/marketing/coupons");
        router.refresh();
      } else {
        toast.error(result.message || "Failed to create coupon");
        if (result.message?.includes("already exists")) {
          setErrors((prev) => ({ ...prev, code: result.message }));
        }
      }
    } catch (error) {
      console.error("Error creating coupon:", error);
      toast.error("An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-5xl mx-auto p-4 md:p-6 pb-24">
      <div className="flex items-center gap-4">
        <Button 
          variant="outline" 
          size="icon" 
          className="size-9 rounded-full"
          nativeButton={false}
          render={<Link href="/admin/marketing/coupons" />}
        >
          <ChevronLeft className="size-4" />
          <span className="sr-only">Back</span>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">Create Coupon Code</h1>
          <p className="text-muted-foreground text-sm">Configure a new discount code for your store.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col lg:flex-row gap-6 items-start">
        <div className="flex flex-col gap-6 w-full lg:w-2/3">
          <Card>
            <CardHeader>
              <CardTitle>General Information</CardTitle>
              <CardDescription>Basic details about the coupon code.</CardDescription>
            </CardHeader>
            <CardContent>
              <FieldGroup>
                <Field data-invalid={!!errors.code}>
                  <FieldLabel htmlFor="code">Coupon Code <span className="text-destructive">*</span></FieldLabel>
                  <Input 
                    id="code" 
                    name="code" 
                    placeholder="e.g., SUMMER2024" 
                    value={formData.code} 
                    onChange={handleChange}
                    aria-invalid={!!errors.code}
                    className="uppercase font-mono tracking-wider"
                  />
                  <FieldDescription>Customers will enter this code at checkout.</FieldDescription>
                  {errors.code && <FieldError>{errors.code}</FieldError>}
                </Field>

                <Field>
                  <FieldLabel htmlFor="description">Internal Description</FieldLabel>
                  <Textarea 
                    id="description" 
                    name="description" 
                    placeholder="Brief note about what this coupon is for..." 
                    value={formData.description} 
                    onChange={handleChange}
                    className="min-h-[100px]"
                  />
                  <FieldDescription>Only visible to store staff.</FieldDescription>
                </Field>
              </FieldGroup>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Discount Configuration</CardTitle>
              <CardDescription>Set how much this coupon deducts from the order.</CardDescription>
            </CardHeader>
            <CardContent>
              <FieldGroup>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <Field>
                    <FieldLabel>Discount Type</FieldLabel>
                    <Select value={formData.discountType} onValueChange={handleSelectChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectItem value="percentage">Percentage (%)</SelectItem>
                          <SelectItem value="fixed_amount">Fixed Amount</SelectItem>
                          <SelectItem value="free_shipping">Free Shipping</SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </Field>

                  <Field data-disabled={formData.discountType === "free_shipping"} data-invalid={!!errors.discountValue}>
                    <FieldLabel htmlFor="discountValue">
                      Discount Value <span className="text-destructive">*</span>
                    </FieldLabel>
                    <div className="relative">
                      {formData.discountType === "fixed_amount" && (
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">
                          Rs.
                        </span>
                      )}
                      <Input 
                        id="discountValue" 
                        name="discountValue" 
                        type="number"
                        min="0"
                        step={formData.discountType === "percentage" ? "1" : "0.01"}
                        placeholder={formData.discountType === "percentage" ? "10" : "500"} 
                        value={formData.discountValue} 
                        onChange={handleChange}
                        disabled={formData.discountType === "free_shipping"}
                        aria-invalid={!!errors.discountValue}
                        className={cn(
                          formData.discountType === "fixed_amount" ? "pl-9" : "",
                          formData.discountType === "percentage" ? "pr-9" : ""
                        )}
                      />
                      {formData.discountType === "percentage" && (
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">
                          %
                        </span>
                      )}
                    </div>
                    {errors.discountValue && <FieldError>{errors.discountValue}</FieldError>}
                  </Field>
                </div>

                <Separator className="my-2" />

                <Field>
                  <FieldLabel htmlFor="minOrderAmount">Minimum Order Amount</FieldLabel>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">
                      Rs.
                    </span>
                    <Input 
                      id="minOrderAmount" 
                      name="minOrderAmount" 
                      type="number"
                      min="0"
                      placeholder="0" 
                      value={formData.minOrderAmount} 
                      onChange={handleChange}
                      className="pl-9"
                    />
                  </div>
                  <FieldDescription>Applies only if order subtotal exceeds this amount.</FieldDescription>
                </Field>
              </FieldGroup>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-6 w-full lg:w-1/3">
          <Card>
            <CardHeader>
              <CardTitle>Status & Timing</CardTitle>
            </CardHeader>
            <CardContent>
              <FieldGroup>
                <Field orientation="horizontal" className="justify-between bg-muted/30 p-4 rounded-xl border border-border/50">
                  <FieldContent>
                    <FieldTitle>Active Status</FieldTitle>
                    <FieldDescription>Turn this coupon on or off.</FieldDescription>
                  </FieldContent>
                  <Switch 
                    checked={formData.isActive} 
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))} 
                  />
                </Field>

                <div className="flex flex-col gap-5 mt-2">
                  <Field data-invalid={!!errors.startDate}>
                    <FieldLabel htmlFor="startDate">Start Date <span className="text-destructive">*</span></FieldLabel>
                    <Input 
                      id="startDate" 
                      name="startDate" 
                      type="datetime-local" 
                      value={formData.startDate} 
                      onChange={handleChange}
                      aria-invalid={!!errors.startDate}
                    />
                    {errors.startDate && <FieldError>{errors.startDate}</FieldError>}
                  </Field>

                  <Field data-invalid={!!errors.endDate}>
                    <FieldLabel htmlFor="endDate">End Date <span className="text-destructive">*</span></FieldLabel>
                    <Input 
                      id="endDate" 
                      name="endDate" 
                      type="datetime-local" 
                      value={formData.endDate} 
                      onChange={handleChange}
                      aria-invalid={!!errors.endDate}
                    />
                    {errors.endDate && <FieldError>{errors.endDate}</FieldError>}
                  </Field>
                </div>
              </FieldGroup>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Usage Limits</CardTitle>
            </CardHeader>
            <CardContent>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="usageLimitPerCoupon">Total Usage Limit</FieldLabel>
                  <Input 
                    id="usageLimitPerCoupon" 
                    name="usageLimitPerCoupon" 
                    type="number"
                    min="1"
                    placeholder="Unlimited" 
                    value={formData.usageLimitPerCoupon} 
                    onChange={handleChange}
                  />
                  <FieldDescription>How many times this coupon can be used across all customers.</FieldDescription>
                </Field>

                <Field>
                  <FieldLabel htmlFor="usageLimitPerUser">Usage Per User</FieldLabel>
                  <Input 
                    id="usageLimitPerUser" 
                    name="usageLimitPerUser" 
                    type="number"
                    min="1"
                    placeholder="1" 
                    value={formData.usageLimitPerUser} 
                    onChange={handleChange}
                  />
                  <FieldDescription>How many times a single customer can use it.</FieldDescription>
                </Field>
              </FieldGroup>
            </CardContent>
            <CardFooter className="bg-muted/20 border-t flex-col items-stretch p-4 pt-4 mt-2 gap-3">
              <Button 
                type="submit" 
                size="lg" 
                className="w-full relative shadow-sm"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <Spinner className="size-4" /> Saving...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Save className="size-4" /> Create Coupon
                  </span>
                )}
              </Button>
            </CardFooter>
          </Card>
        </div>
      </form>
    </div>
  );
}
