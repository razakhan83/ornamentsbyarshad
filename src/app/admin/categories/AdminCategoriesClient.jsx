"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import {
  Check,
  Eye,
  ImageIcon,
  Loader2,
  MoreVertical,
  Package2,
  Pencil,
  Plus,
  Trash2,
  Upload,
  X,
  GripVertical,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { CLOUDINARY_IMAGE_PRESETS, optimizeCloudinaryUrl } from "@/lib/cloudinaryImage";
import { uploadImageDataUrl } from "@/lib/cloudinaryUpload";
import { getBlurPlaceholderProps } from "@/lib/imagePlaceholder";
import { cn } from "@/lib/utils";
import CategoryPillCard from "@/components/home/CategoryPillCard";
import { getCategoryColorByIndex } from "@/lib/categoryColors";
import { StaggerContainer, StaggerItem } from "@/components/animations/StaggerAnimations";
import CategoryShowcaseDialog from "./CategoryShowcaseDialog";



function mapCategory(category, index = 0) {
  return {
    _id: category._id,
    name: category.name,
    slug: category.slug,
    bgColor: category.bgColor || "",
    image: category.image || "",
    imagePublicId: category.imagePublicId || "",
    blurDataURL: category.blurDataURL || "",
    secondaryImage: category.secondaryImage || "",
    secondaryImagePublicId: category.secondaryImagePublicId || "",
    secondaryBlurDataURL: category.secondaryBlurDataURL || "",
    tertiaryImage: category.tertiaryImage || "",
    tertiaryImagePublicId: category.tertiaryImagePublicId || "",
    tertiaryBlurDataURL: category.tertiaryBlurDataURL || "",
    sortOrder: Number(category.sortOrder ?? index) || 0,
    isEnabled: category.isEnabled !== false,
    productCount: Number(category.productCount || 0),
    storefrontProductLimit: Number(category.storefrontProductLimit || 8),
    featuredProductIds: Array.isArray(category.featuredProductIds)
      ? category.featuredProductIds.map((id) => (id?._id ? id._id.toString() : id.toString())).filter(Boolean)
      : [],
    showcaseSelectionMode: category.showcaseSelectionMode || "pinned_first",
  };
}

function CategoryCard({ category, onEdit, onDelete, onToggleEnabled, onManageShowcase }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: category._id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    ...(isDragging ? { zIndex: 50, position: "relative" } : {}),
  };

  const imageCount = [category.image, category.secondaryImage, category.tertiaryImage].filter(Boolean).length;
  const pinnedCount = Array.isArray(category.featuredProductIds) ? category.featuredProductIds.length : 0;
  const productLimit = category.storefrontProductLimit || 8;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "surface-card flex items-center gap-4 rounded-2xl p-4 shadow-[0_18px_40px_rgba(0,0,0,0.07)]",
        isDragging && "opacity-60 border-primary/50 border-2 shadow-xl"
      )}
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab hover:text-foreground text-muted-foreground transition-colors active:cursor-grabbing p-1"
      >
        <GripVertical className="size-5" />
      </div>

      <div 
        className="relative flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-border bg-muted/35"
        style={{ backgroundColor: category.bgColor }}
      >
        {category.image ? (
          <Image
            src={optimizeCloudinaryUrl(category.image, CLOUDINARY_IMAGE_PRESETS.adminThumb)}
            alt={category.name}
            fill
            sizes="64px"
            className="object-cover"
            {...getBlurPlaceholderProps(category.blurDataURL)}
          />
        ) : category.secondaryImage ? (
          <Image
            src={optimizeCloudinaryUrl(category.secondaryImage, CLOUDINARY_IMAGE_PRESETS.adminThumb)}
            alt={category.name}
            fill
            sizes="64px"
            className="object-cover"
            {...getBlurPlaceholderProps(category.secondaryBlurDataURL)}
          />
        ) : category.tertiaryImage ? (
          <Image
            src={optimizeCloudinaryUrl(category.tertiaryImage, CLOUDINARY_IMAGE_PRESETS.adminThumb)}
            alt={category.name}
            fill
            sizes="64px"
            className="object-cover"
            {...getBlurPlaceholderProps(category.tertiaryBlurDataURL)}
          />
        ) : (
          <ImageIcon className="size-5 text-muted-foreground" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-sm font-semibold text-foreground">{category.name}</p>
          <Badge variant="secondary" className="rounded-full">
            {category.productCount} {category.productCount === 1 ? "product" : "products"}
          </Badge>
          {imageCount > 1 && (
            <Badge className="rounded-full bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/20 border-none text-[10px]">
              {imageCount} Images (Flower Bloom)
            </Badge>
          )}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <p className="text-xs text-muted-foreground">{category.slug}</p>
          <span className="text-muted-foreground/40">•</span>
          <button
            type="button"
            onClick={() => onManageShowcase?.(category)}
            className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
          >
            <Sparkles className="size-3" />
            <span>Storefront: {productLimit} items {pinnedCount > 0 ? `(${pinnedCount} pinned)` : ''}</span>
          </button>
        </div>
      </div>

      <div className="hidden text-right md:block">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Products
        </p>
        <p className="mt-1 text-sm font-semibold text-foreground">{category.productCount}</p>
      </div>

      <div className="flex items-center gap-2.5">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onManageShowcase?.(category)}
          className="hidden sm:inline-flex items-center gap-1.5 h-8 text-xs font-semibold rounded-xl border-primary/20 bg-primary/5 text-primary hover:bg-primary/10 hover:border-primary/30 shadow-2xs"
          title="Manage Storefront Products & Limit"
        >
          <Sparkles className="size-3.5" />
          <span>Showcase ({productLimit})</span>
        </Button>

        <div className="flex flex-col items-end gap-1">
          <span className={cn(
            "text-[10px] font-semibold uppercase tracking-[0.16em]",
            category.isEnabled ? "text-foreground" : "text-muted-foreground",
          )}>
            {category.isEnabled ? "Live" : "Hidden"}
          </span>
          <Switch
            checked={category.isEnabled !== false}
            onCheckedChange={() => onToggleEnabled(category._id, category.isEnabled !== false)}
          />
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="shrink-0 rounded-xl"
              aria-label="Category actions"
            >
              <MoreVertical className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={() => onManageShowcase?.(category)}>
                <Sparkles />
                Storefront Showcase ({productLimit})
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEdit?.(category)}>
                <Pencil />
                Edit Category
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                onClick={() => onDelete(category)}
              >
                <Trash2 />
                Delete
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

export default function AdminCategoriesClient() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newImage, setNewImage] = useState("");
  const [newSecondaryImage, setNewSecondaryImage] = useState("");
  const [newTertiaryImage, setNewTertiaryImage] = useState("");
  const [newBgColor, setNewBgColor] = useState("");
  const [deleteModal, setDeleteModal] = useState({ open: false, category: null });
  const [showcaseModal, setShowcaseModal] = useState({ open: false, category: null });
  const [deleting, setDeleting] = useState(false);
  const [editModal, setEditModal] = useState({ open: false, category: null });
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editImage, setEditImage] = useState("");
  const [editSecondaryImage, setEditSecondaryImage] = useState("");
  const [editTertiaryImage, setEditTertiaryImage] = useState("");
  const [editIsEnabled, setEditIsEnabled] = useState(true);
  const [editBgColor, setEditBgColor] = useState("");

  const orderedCategories = useMemo(
    () => [...categories].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)),
    [categories],
  );

  const liveCategoryCount = useMemo(
    () => categories.filter((category) => category.isEnabled !== false).length,
    [categories],
  );
  const totalProductCount = useMemo(
    () => categories.reduce((total, category) => total + Number(category.productCount || 0), 0),
    [categories],
  );

  const usedColors = useMemo(() => {
    const colors = new Set();
    categories.forEach((cat, index) => {
      const color = cat.bgColor || getCategoryColorByIndex(index).hex;
      if (color && color !== "#ffffff") {
        colors.add(color.toLowerCase());
      }
    });
    return Array.from(colors);
  }, [categories]);

  useEffect(() => {
    fetchCategories();
  }, []);

  async function fetchCategories() {
    try {
      setLoading(true);
      const response = await fetch("/api/categories", { cache: "no-store" });
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to fetch categories");
      }

      setCategories(
        (data.data || [])
          .filter((category) => category.slug !== "special-offers")
          .map((category, index) => mapCategory(category, index)),
      );
    } catch (error) {
      console.error("Failed to fetch categories:", error);
      toast.error("Failed to load categories");
    } finally {
      setLoading(false);
    }
  }

  function handleImageSelect(event, slot = 1) {
    const file = event.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;

    const reader = new FileReader();
    reader.onload = (loadEvent) => {
      const result = /** @type {string} */ (loadEvent.target?.result) || "";
      if (slot === 1) setNewImage(result);
      if (slot === 2) setNewSecondaryImage(result);
      if (slot === 3) setNewTertiaryImage(result);
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  }

  async function handleAddCategory(event) {
    event.preventDefault();
    if (!newName.trim()) return;

    setAdding(true);
    try {
      let uploadedImage = "";
      let uploadedPublicId = "";
      let uploadedBlurDataURL = "";

      let uploadedSecondaryImage = "";
      let uploadedSecondaryPublicId = "";
      let uploadedSecondaryBlurDataURL = "";

      let uploadedTertiaryImage = "";
      let uploadedTertiaryPublicId = "";
      let uploadedTertiaryBlurDataURL = "";

      if (newImage) {
        const upload = await uploadImageDataUrl(newImage, "kifayatly_categories");
        uploadedImage = upload.url;
        uploadedPublicId = upload.publicId;
        uploadedBlurDataURL = upload.blurDataURL;
      }

      if (newSecondaryImage) {
        const upload2 = await uploadImageDataUrl(newSecondaryImage, "kifayatly_categories");
        uploadedSecondaryImage = upload2.url;
        uploadedSecondaryPublicId = upload2.publicId;
        uploadedSecondaryBlurDataURL = upload2.blurDataURL;
      }

      if (newTertiaryImage) {
        const upload3 = await uploadImageDataUrl(newTertiaryImage, "kifayatly_categories");
        uploadedTertiaryImage = upload3.url;
        uploadedTertiaryPublicId = upload3.publicId;
        uploadedTertiaryBlurDataURL = upload3.blurDataURL;
      }

      const response = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName.trim(),
          bgColor: newBgColor,
          image: uploadedImage,
          imagePublicId: uploadedPublicId,
          blurDataURL: uploadedBlurDataURL,
          imageDataUrl: newImage || "",
          secondaryImage: uploadedSecondaryImage,
          secondaryImagePublicId: uploadedSecondaryPublicId,
          secondaryBlurDataURL: uploadedSecondaryBlurDataURL,
          secondaryImageDataUrl: newSecondaryImage || "",
          tertiaryImage: uploadedTertiaryImage,
          tertiaryImagePublicId: uploadedTertiaryPublicId,
          tertiaryBlurDataURL: uploadedTertiaryBlurDataURL,
          tertiaryImageDataUrl: newTertiaryImage || "",
        }),
      });

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || "Failed to create category");
      }

      toast.success(`Category "${newName.trim()}" created`);
      setNewName("");
      setNewBgColor("");
      setNewImage("");
      setNewSecondaryImage("");
      setNewTertiaryImage("");
      setCategories((current) => [
        ...current,
        mapCategory({ ...data.data, productCount: 0 }, current.length),
      ]);
      setAddModalOpen(false);
    } catch (error) {
      toast.error(error.message || "Failed to create category");
    } finally {
      setAdding(false);
    }
  }

  function handleEditImageSelect(event, slot = 1) {
    const file = event.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;

    const reader = new FileReader();
    reader.onload = (loadEvent) => {
      const result = /** @type {string} */ (loadEvent.target?.result) || "";
      if (slot === 1) setEditImage(result);
      if (slot === 2) setEditSecondaryImage(result);
      if (slot === 3) setEditTertiaryImage(result);
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  }

  function openEditModal(category) {
    const originalIndex = categories.findIndex(c => c._id === category._id);
    const fallbackColor = originalIndex !== -1 ? getCategoryColorByIndex(originalIndex).hex : "";
    setEditName(category.name);
    setEditImage(category.image || "");
    setEditSecondaryImage(category.secondaryImage || "");
    setEditTertiaryImage(category.tertiaryImage || "");
    setEditBgColor(category.bgColor || fallbackColor);
    setEditIsEnabled(category.isEnabled !== false);
    setEditModal({ open: true, category });
  }

  async function handleEditCategory(event) {
    event.preventDefault();
    if (!editName.trim() || !editModal.category) return;

    setEditing(true);
    try {
      let uploadedImage = editImage;
      let uploadedPublicId = editModal.category.imagePublicId || "";
      let uploadedBlurDataURL = editModal.category.blurDataURL || "";

      let uploadedSecondaryImage = editSecondaryImage;
      let uploadedSecondaryPublicId = editModal.category.secondaryImagePublicId || "";
      let uploadedSecondaryBlurDataURL = editModal.category.secondaryBlurDataURL || "";

      let uploadedTertiaryImage = editTertiaryImage;
      let uploadedTertiaryPublicId = editModal.category.tertiaryImagePublicId || "";
      let uploadedTertiaryBlurDataURL = editModal.category.tertiaryBlurDataURL || "";

      const isNewImage1 = editImage && editImage !== editModal.category.image && editImage.startsWith("data:");
      const isNewImage2 = editSecondaryImage && editSecondaryImage !== editModal.category.secondaryImage && editSecondaryImage.startsWith("data:");
      const isNewImage3 = editTertiaryImage && editTertiaryImage !== editModal.category.tertiaryImage && editTertiaryImage.startsWith("data:");

      if (isNewImage1) {
        const upload = await uploadImageDataUrl(editImage, "kifayatly_categories");
        uploadedImage = upload.url;
        uploadedPublicId = upload.publicId;
        uploadedBlurDataURL = upload.blurDataURL;
      }

      if (isNewImage2) {
        const upload2 = await uploadImageDataUrl(editSecondaryImage, "kifayatly_categories");
        uploadedSecondaryImage = upload2.url;
        uploadedSecondaryPublicId = upload2.publicId;
        uploadedSecondaryBlurDataURL = upload2.blurDataURL;
      }

      if (isNewImage3) {
        const upload3 = await uploadImageDataUrl(editTertiaryImage, "kifayatly_categories");
        uploadedTertiaryImage = upload3.url;
        uploadedTertiaryPublicId = upload3.publicId;
        uploadedTertiaryBlurDataURL = upload3.blurDataURL;
      }

      const response = await fetch(`/api/categories/${editModal.category._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName.trim(),
          bgColor: editBgColor,
          image: uploadedImage,
          imagePublicId: uploadedImage ? uploadedPublicId : "",
          blurDataURL: uploadedImage ? uploadedBlurDataURL : "",
          secondaryImage: uploadedSecondaryImage,
          secondaryImagePublicId: uploadedSecondaryImage ? uploadedSecondaryPublicId : "",
          secondaryBlurDataURL: uploadedSecondaryImage ? uploadedSecondaryBlurDataURL : "",
          tertiaryImage: uploadedTertiaryImage,
          tertiaryImagePublicId: uploadedTertiaryImage ? uploadedTertiaryPublicId : "",
          tertiaryBlurDataURL: uploadedTertiaryImage ? uploadedTertiaryBlurDataURL : "",
          isEnabled: editIsEnabled,
          ...(isNewImage1 && { imageDataUrl: editImage }),
          ...(isNewImage2 && { secondaryImageDataUrl: editSecondaryImage }),
          ...(isNewImage3 && { tertiaryImageDataUrl: editTertiaryImage }),
        }),
      });

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || "Failed to update category");
      }

      toast.success(`Category "${editName.trim()}" updated`);
      setCategories((current) =>
        current.map((category) => (
          category._id === editModal.category._id
            ? {
                ...category,
                ...mapCategory({ ...data.data, productCount: category.productCount }, category.sortOrder),
              }
            : category
        )),
      );
      setEditModal({ open: false, category: null });
      setEditName("");
      setEditImage("");
      setEditSecondaryImage("");
      setEditTertiaryImage("");
      setEditBgColor("");
      setEditIsEnabled(true);
    } catch (error) {
      toast.error(error.message || "Failed to update category");
    } finally {
      setEditing(false);
    }
  }

  async function handleDelete() {
    if (!deleteModal.category) return;

    setDeleting(true);
    try {
      const response = await fetch(`/api/categories?id=${deleteModal.category._id}`, {
        method: "DELETE",
      });
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to delete category");
      }

      toast.success(`Category "${deleteModal.category.name}" deleted`);
      setCategories((current) =>
        current
          .filter((category) => category._id !== deleteModal.category._id)
          .map((category, index) => ({ ...category, sortOrder: index })),
      );
      setDeleteModal({ open: false, category: null });
    } catch (error) {
      toast.error(error.message || "Failed to delete category");
    } finally {
      setDeleting(false);
    }
  }

  async function toggleCategoryEnabled(categoryId, currentStatus) {
    const originalCategories = [...categories];
    const newStatus = !currentStatus;

    try {
      setCategories((prev) =>
        prev.map((category) => (
          category._id === categoryId ? { ...category, isEnabled: newStatus } : category
        )),
      );

      const response = await fetch(`/api/categories/${categoryId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isEnabled: newStatus }),
      });

      if (!response.ok) {
        throw new Error("Failed to update status");
      }

      toast.success(newStatus ? "Category enabled" : "Category hidden");
    } catch (error) {
      setCategories(originalCategories);
      toast.error("Failed to update category visibility");
    }
  }

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  async function handleDragEnd(event) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = orderedCategories.findIndex((item) => item._id === active.id);
      const newIndex = orderedCategories.findIndex((item) => item._id === over.id);
      const newOrdered = arrayMove(orderedCategories, oldIndex, newIndex);
      
      const newOrderedWithSort = newOrdered.map((item, index) => ({ ...item, sortOrder: index }));

      setCategories((prev) => {
        // Merge the new sort orders back into the main categories state
        return prev.map((cat) => {
          const updatedCat = newOrderedWithSort.find((o) => o._id === cat._id);
          return updatedCat ? updatedCat : cat;
        });
      });

      // Optimistically update DB in background
      const orderedIds = newOrderedWithSort.map((item) => item._id);
      fetch("/api/categories/reorder", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderedIds }),
      }).catch((err) => {
        console.error("Failed to reorder categories", err);
        toast.error("Failed to save new category order");
      });
    }
  }

  return (
    <div className="w-full pb-10 md:pb-0">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Categories</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Add categories, upload up to 3 images (Flower Petal Bloom), clean images, and preview how they appear on home.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 mt-2 sm:mt-0">
          <Badge variant="secondary" className="rounded-full px-3 py-1">
            {liveCategoryCount} live
          </Badge>
          <Badge variant="secondary" className="rounded-full px-3 py-1">
            {totalProductCount} products listed
          </Badge>
          <Button onClick={() => setAddModalOpen(true)} size="sm" className="ml-auto sm:ml-2 rounded-full">
            <Plus className="mr-1.5 size-4" />
            Add Category
          </Button>
        </div>
      </div>

      <AlertDialog open={addModalOpen} onOpenChange={setAddModalOpen}>
        <AlertDialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl md:max-w-4xl lg:max-w-5xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Add New Category</AlertDialogTitle>
            <AlertDialogDescription>
              Create a new category, select colors, and upload up to 3 images for the petal bloom layout.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <form onSubmit={(e) => {
            handleAddCategory(e);
            // The modal will close inside handleAddCategory on success
          }} className="py-2">
            <div className="grid gap-6 lg:grid-cols-[1fr_auto]">
              <div className="flex flex-col gap-4">
                <div>
                  <Label className="mb-2">Category Name</Label>
                  <Input
                    value={newName}
                    onChange={(event) => setNewName(event.target.value)}
                    placeholder="e.g. Kitchen Accessories"
                  />
                </div>
                
                <div className="mt-2">
                  <Label className="mb-2 block">Background Color</Label>
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={newBgColor || "#ffffff"}
                        onChange={(e) => setNewBgColor(e.target.value)}
                        className="h-9 w-14 cursor-pointer rounded bg-transparent p-0 border-0"
                      />
                      <Input
                        value={newBgColor}
                        onChange={(e) => setNewBgColor(e.target.value)}
                        placeholder="#HexColor (optional)"
                        className="w-40 font-mono text-sm"
                      />
                      {newBgColor && (
                        <Button type="button" variant="ghost" size="sm" onClick={() => setNewBgColor("")} className="text-destructive">
                          Clear
                        </Button>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {usedColors.map(color => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => setNewBgColor(color)}
                          className={cn(
                            "flex size-8 items-center justify-center rounded-full transition-all hover:scale-110",
                            newBgColor?.toLowerCase() === color.toLowerCase() 
                              ? "ring-2 ring-emerald-600 ring-offset-2 scale-110 border-transparent shadow-sm" 
                              : "border border-border shadow-sm"
                          )}
                          style={{ backgroundColor: color }}
                          title={`Select ${color}`}
                        >
                          {newBgColor?.toLowerCase() === color.toLowerCase() && (
                            <Check className="size-4 text-emerald-700" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <Label className="mb-2 block text-xs font-semibold text-muted-foreground">Image 1 (Front Center)</Label>
                    <div className="flex flex-wrap items-center gap-2">
                      <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-muted">
                        <Upload className="size-3.5" />
                        Upload 1
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageSelect(e, 1)} />
                      </label>
                      {newImage ? (
                        <div className="relative size-12 shrink-0 overflow-hidden rounded-2xl border border-border group">
                          <Image
                            src={newImage}
                            alt="Image 1 preview"
                            fill
                            sizes="48px"
                            className="object-cover"
                            {...getBlurPlaceholderProps()}
                          />
                          <button
                            type="button"
                            onClick={() => setNewImage("")}
                            className="absolute right-0.5 top-0.5 flex size-4 items-center justify-center rounded-full bg-destructive text-white shadow-md hover:bg-destructive/90"
                            title="Clear Image 1"
                          >
                            <X className="size-2.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex size-12 items-center justify-center rounded-2xl border border-dashed border-border bg-muted/25 text-muted-foreground">
                          <ImageIcon className="size-4" />
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <Label className="mb-2 block text-xs font-semibold text-muted-foreground">Image 2 (Left Petal)</Label>
                    <div className="flex flex-wrap items-center gap-2">
                      <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-muted">
                        <Upload className="size-3.5" />
                        Upload 2
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageSelect(e, 2)} />
                      </label>
                      {newSecondaryImage ? (
                        <div className="relative size-12 shrink-0 overflow-hidden rounded-2xl border border-border group">
                          <Image
                            src={newSecondaryImage}
                            alt="Image 2 preview"
                            fill
                            sizes="48px"
                            className="object-cover"
                            {...getBlurPlaceholderProps()}
                          />
                          <button
                            type="button"
                            onClick={() => setNewSecondaryImage("")}
                            className="absolute right-0.5 top-0.5 flex size-4 items-center justify-center rounded-full bg-destructive text-white shadow-md hover:bg-destructive/90"
                            title="Clear Image 2"
                          >
                            <X className="size-2.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex size-12 items-center justify-center rounded-2xl border border-dashed border-border bg-muted/25 text-muted-foreground">
                          <ImageIcon className="size-4" />
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <Label className="mb-2 block text-xs font-semibold text-muted-foreground">Image 3 (Right Petal)</Label>
                    <div className="flex flex-wrap items-center gap-2">
                      <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-muted">
                        <Upload className="size-3.5" />
                        Upload 3
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageSelect(e, 3)} />
                      </label>
                      {newTertiaryImage ? (
                        <div className="relative size-12 shrink-0 overflow-hidden rounded-2xl border border-border group">
                          <Image
                            src={newTertiaryImage}
                            alt="Image 3 preview"
                            fill
                            sizes="48px"
                            className="object-cover"
                            {...getBlurPlaceholderProps()}
                          />
                          <button
                            type="button"
                            onClick={() => setNewTertiaryImage("")}
                            className="absolute right-0.5 top-0.5 flex size-4 items-center justify-center rounded-full bg-destructive text-white shadow-md hover:bg-destructive/90"
                            title="Clear Image 3"
                          >
                            <X className="size-2.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex size-12 items-center justify-center rounded-2xl border border-dashed border-border bg-muted/25 text-muted-foreground">
                          <ImageIcon className="size-4" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-center justify-center rounded-2xl border border-border/80 bg-muted/20 p-4 min-w-[200px]">
                <div className="mb-4 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                  <Eye className="size-3.5 text-primary" />
                  <span>Home Live Preview</span>
                </div>
                <div className="flex w-full justify-center overflow-hidden">
                  <div className="pointer-events-none w-full max-w-[220px]">
                    <CategoryPillCard
                      category={{
                        name: newName.trim() || "Preview Category",
                        label: newName.trim() || "Preview Category",
                        bgColor: newBgColor,
                        image: newImage,
                        secondaryImage: newSecondaryImage,
                        tertiaryImage: newTertiaryImage,
                      }}
                      index={0}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 flex justify-end gap-3">
              <AlertDialogCancel type="button" onClick={() => setAddModalOpen(false)}>
                Cancel
              </AlertDialogCancel>
              <Button type="submit" disabled={adding || !newName.trim()} className="admin-cta-button w-full md:w-auto">
                {adding ? <Loader2 className="animate-spin" data-icon="inline-start" /> : <Plus data-icon="inline-start" />}
                Add Category
              </Button>
            </div>
          </form>
        </AlertDialogContent>
      </AlertDialog>

      <div className="surface-card mb-6 rounded-2xl border border-border/70 p-4">
        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <Badge variant="secondary" className="rounded-full px-3 py-1">
            <Package2 />
            Product counts
          </Badge>
          <span>Category order is automatic. Use Home Page Settings for storefront section layout.</span>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="surface-card h-24 animate-pulse rounded-2xl" />
          ))}
        </div>
      ) : orderedCategories.length === 0 ? (
        <div className="surface-card rounded-2xl p-12 text-center">
          <p className="font-medium text-muted-foreground">No categories yet. Add your first category above.</p>
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={orderedCategories.map((c) => c._id)} strategy={verticalListSortingStrategy}>
            <StaggerContainer className="flex flex-col gap-3">
              {orderedCategories.map((category) => (
                <StaggerItem key={category._id}>
                  <CategoryCard
                    category={category}
                    onEdit={openEditModal}
                    onDelete={(selectedCategory) => setDeleteModal({ open: true, category: selectedCategory })}
                    onToggleEnabled={toggleCategoryEnabled}
                    onManageShowcase={(selectedCategory) => setShowcaseModal({ open: true, category: selectedCategory })}
                  />
                </StaggerItem>
              ))}
            </StaggerContainer>
          </SortableContext>
        </DndContext>
      )}

      <AlertDialog
        open={deleteModal.open}
        onOpenChange={(open) => setDeleteModal((current) => ({ ...current, open }))}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this category?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove{" "}
              <span className="font-semibold text-foreground">{deleteModal.category?.name}</span>.
              Products assigned to this category will not be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              className={cn(buttonVariants({ variant: "outline" }))}
              onClick={() => setDeleteModal({ open: false, category: null })}
            >
              Cancel
            </AlertDialogCancel>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Deleting..." : "Delete Category"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={editModal.open}
        onOpenChange={(open) => {
          setEditModal((current) => ({ ...current, open }));
          if (!open) {
            setEditName("");
            setEditImage("");
            setEditSecondaryImage("");
            setEditTertiaryImage("");
            setEditBgColor("");
            setEditIsEnabled(true);
          }
        }}
      >
        <AlertDialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl md:max-w-4xl lg:max-w-5xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Edit Category</AlertDialogTitle>
            <AlertDialogDescription>
              Update name, upload up to 3 images (Flower Petal Bloom), clean images, or adjust visibility.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="py-2">
            <div className="grid gap-6 lg:grid-cols-[1fr_auto]">
              <div className="flex flex-col gap-5">
                <div>
                  <Label className="mb-2">Category Name</Label>
                  <Input
                    value={editName}
                    onChange={(event) => setEditName(event.target.value)}
                    placeholder="e.g. Kitchen Accessories"
                  />
                </div>

            <div className="mt-1">
              <Label className="mb-2 block">Background Color</Label>
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={editBgColor || "#ffffff"}
                    onChange={(e) => setEditBgColor(e.target.value)}
                    className="h-9 w-14 cursor-pointer rounded bg-transparent p-0 border-0"
                  />
                  <Input
                    value={editBgColor}
                    onChange={(e) => setEditBgColor(e.target.value)}
                    placeholder="#HexColor (optional)"
                    className="w-40 font-mono text-sm"
                  />
                  {editBgColor && (
                    <Button type="button" variant="ghost" size="sm" onClick={() => setEditBgColor("")} className="text-destructive">
                      Clear
                    </Button>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {usedColors.map(color => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setEditBgColor(color)}
                      className={cn(
                        "flex size-8 items-center justify-center rounded-full transition-all hover:scale-110",
                        editBgColor?.toLowerCase() === color.toLowerCase() 
                          ? "ring-2 ring-emerald-600 ring-offset-2 scale-110 border-transparent shadow-sm" 
                          : "border border-border shadow-sm"
                      )}
                      style={{ backgroundColor: color }}
                      title={`Select ${color}`}
                    >
                      {editBgColor?.toLowerCase() === color.toLowerCase() && (
                        <Check className="size-4 text-emerald-700" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <Label className="text-xs font-semibold text-muted-foreground">Image 1 (Front)</Label>
                  {editImage && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditImage("")}
                      className="h-6 px-1.5 text-[11px] text-destructive hover:bg-destructive/10 hover:text-destructive"
                    >
                      <X className="mr-0.5 size-3" />
                      Clear
                    </Button>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-muted">
                    <Upload className="size-3.5" />
                    Upload 1
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handleEditImageSelect(e, 1)} />
                  </label>
                  {editImage ? (
                    <div className="relative size-12 shrink-0 overflow-hidden rounded-2xl border border-border">
                      <Image
                        src={editImage}
                        alt="Image 1 preview"
                        fill
                        sizes="48px"
                        className="object-cover"
                        {...getBlurPlaceholderProps()}
                      />
                    </div>
                  ) : (
                    <div className="flex size-12 items-center justify-center rounded-2xl border border-dashed border-border bg-muted/25 text-muted-foreground">
                      <ImageIcon className="size-4" />
                    </div>
                  )}
                </div>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <Label className="text-xs font-semibold text-muted-foreground">Image 2 (Left)</Label>
                  {editSecondaryImage && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditSecondaryImage("")}
                      className="h-6 px-1.5 text-[11px] text-destructive hover:bg-destructive/10 hover:text-destructive"
                    >
                      <X className="mr-0.5 size-3" />
                      Clear
                    </Button>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-muted">
                    <Upload className="size-3.5" />
                    Upload 2
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handleEditImageSelect(e, 2)} />
                  </label>
                  {editSecondaryImage ? (
                    <div className="relative size-12 shrink-0 overflow-hidden rounded-2xl border border-border">
                      <Image
                        src={editSecondaryImage}
                        alt="Image 2 preview"
                        fill
                        sizes="48px"
                        className="object-cover"
                        {...getBlurPlaceholderProps()}
                      />
                    </div>
                  ) : (
                    <div className="flex size-12 items-center justify-center rounded-2xl border border-dashed border-border bg-muted/25 text-muted-foreground">
                      <ImageIcon className="size-4" />
                    </div>
                  )}
                </div>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <Label className="text-xs font-semibold text-muted-foreground">Image 3 (Right)</Label>
                  {editTertiaryImage && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditTertiaryImage("")}
                      className="h-6 px-1.5 text-[11px] text-destructive hover:bg-destructive/10 hover:text-destructive"
                    >
                      <X className="mr-0.5 size-3" />
                      Clear
                    </Button>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-muted">
                    <Upload className="size-3.5" />
                    Upload 3
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handleEditImageSelect(e, 3)} />
                  </label>
                  {editTertiaryImage ? (
                    <div className="relative size-12 shrink-0 overflow-hidden rounded-2xl border border-border">
                      <Image
                        src={editTertiaryImage}
                        alt="Image 3 preview"
                        fill
                        sizes="48px"
                        className="object-cover"
                        {...getBlurPlaceholderProps()}
                      />
                    </div>
                  ) : (
                    <div className="flex size-12 items-center justify-center rounded-2xl border border-dashed border-border bg-muted/25 text-muted-foreground">
                      <ImageIcon className="size-4" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          {/* End of first column */}

              <div className="flex flex-col gap-4 min-w-[200px]">
                <div className="flex flex-col items-center justify-center rounded-2xl border border-border/80 bg-muted/20 p-4">
                  <div className="mb-4 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                    <Eye className="size-3.5 text-primary" />
                    <span>Live Home Card Preview</span>
                  </div>
                  <div className="flex w-full justify-center overflow-hidden">
                    <div className="pointer-events-none w-full max-w-[220px]">
                      <CategoryPillCard
                        category={{
                          name: editName.trim() || "Preview Category",
                          label: editName.trim() || "Preview Category",
                          bgColor: editBgColor,
                          image: editImage,
                          secondaryImage: editSecondaryImage,
                          tertiaryImage: editTertiaryImage,
                        }}
                        index={0}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex flex-col justify-center rounded-2xl border border-border p-4 gap-3">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-semibold">Enable Category</Label>
                    <p className="text-xs text-muted-foreground">Make this category visible on the storefront.</p>
                  </div>
                  <Switch checked={editIsEnabled} onCheckedChange={setEditIsEnabled} className="data-[state=checked]:bg-emerald-500" />
                </div>
              </div>
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel
              className={cn(buttonVariants({ variant: "outline" }))}
              onClick={() => setEditModal({ open: false, category: null })}
            >
              Cancel
            </AlertDialogCancel>
            <Button onClick={handleEditCategory} disabled={editing || !editName.trim()} className="admin-cta-button">
              {editing ? <Loader2 className="animate-spin" data-icon="inline-start" /> : null}
              Save Changes
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <CategoryShowcaseDialog
        category={showcaseModal.category}
        isOpen={showcaseModal.open}
        onClose={() => setShowcaseModal({ open: false, category: null })}
        onSaved={(updatedCategory) => {
          setCategories((prev) =>
            prev.map((c) => (c._id === updatedCategory._id ? { ...c, ...updatedCategory } : c))
          );
        }}
      />
    </div>
  );
}
