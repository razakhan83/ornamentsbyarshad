import { NextResponse } from 'next/server';
import { requireApiAdmin } from '@/lib/requireAdmin';
import mongooseConnect from '@/lib/mongooseConnect';
import Product from '@/models/Product';
import Category from '@/models/Category';
import ExcelJS from 'exceljs';
import { revalidateTag, revalidatePath } from 'next/cache';

const slugify = (text) => {
    return (text || '').toString().toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^\w\-]+/g, '')
        .replace(/\-\-+/g, '-')
        .replace(/^-+/, '')
        .replace(/-+$/, '');
};

export async function POST(req) {
    try {
        const auth = await requireApiAdmin({ mutation: true });
        if (auth.error) return auth.error;

        const formData = await req.formData();
        const file = formData.get('file');

        if (!file) {
            return NextResponse.json({ success: false, message: 'No file provided' }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        const workbook = new ExcelJS.Workbook();
        
        const fileName = file.name.toLowerCase();
        if (fileName.endsWith('.csv')) {
            await workbook.csv.read(buffer);
        } else if (fileName.endsWith('.xlsx')) {
            await workbook.xlsx.load(buffer);
        } else {
            return NextResponse.json({ success: false, message: 'Invalid file format. Please upload a .csv or .xlsx file' }, { status: 400 });
        }

        const worksheet = workbook.worksheets[0];
        if (!worksheet) {
            return NextResponse.json({ success: false, message: 'Empty workbook' }, { status: 400 });
        }

        await mongooseConnect();

        const headersRow = worksheet.getRow(1).values;
        // ExcelJS rows are 1-indexed and often leave index 0 empty.
        // Let's normalize headers to lowercase for flexible matching.
        const headers = Array.isArray(headersRow) 
            ? headersRow.map(h => h ? String(h).toLowerCase().trim() : '')
            : [];
            
        const nameIdx = headers.indexOf('name');
        const priceIdx = headers.indexOf('price');
        const categoryIdx = headers.indexOf('category');
        const imageUrlIdx = headers.indexOf('imageurl');

        if (nameIdx === -1 || priceIdx === -1 || categoryIdx === -1 || imageUrlIdx === -1) {
            return NextResponse.json({ 
                success: false, 
                message: 'Invalid template. Required columns: Name, Price, Category, ImageUrl' 
            }, { status: 400 });
        }

        const productsToInsert = [];
        let rowNum = 2; // Start from row 2 (after headers)

        // Fetch all categories once for mapping
        const allCategories = await Category.find({}).lean();
        const categoryMap = new Map();
        allCategories.forEach(cat => categoryMap.set(cat.name.toLowerCase(), cat._id));

        while (true) {
            const row = worksheet.getRow(rowNum);
            if (!row.hasValues) break;

            const rowValues = row.values;
            const name = String(rowValues[nameIdx] || '').trim();
            const price = Number(rowValues[priceIdx]);
            const categoryStr = String(rowValues[categoryIdx] || '').trim();
            const imageUrl = String(rowValues[imageUrlIdx] || '').trim();

            if (!name || isNaN(price) || !categoryStr) {
                // Skip invalid rows or stop if empty
                if (!name && !categoryStr && !imageUrl) {
                    break;
                }
                return NextResponse.json({ success: false, message: `Invalid data at row ${rowNum}. Name, Price, Category are required.` }, { status: 400 });
            }

            // Parse categories (comma separated)
            const categoryNames = categoryStr.split(',').map(c => c.trim()).filter(Boolean);
            const categoryIds = [];

            for (const catName of categoryNames) {
                const lowerCatName = catName.toLowerCase();
                if (categoryMap.has(lowerCatName)) {
                    categoryIds.push(categoryMap.get(lowerCatName));
                } else {
                    // Create new category
                    const newCategory = await Category.create({ 
                        name: catName,
                        slug: slugify(catName)
                    });
                    categoryMap.set(lowerCatName, newCategory._id);
                    categoryIds.push(newCategory._id);
                }
            }

            // Prepare images array
            const images = imageUrl ? [{ url: imageUrl, blurDataURL: '', publicId: '' }] : [];

            // Auto-generate slug
            let uniqueSlug = slugify(name);
            const baseSlug = uniqueSlug;
            let counter = 1;
            while (await Product.exists({ slug: uniqueSlug })) {
                uniqueSlug = `${baseSlug}-${counter}`;
                counter++;
            }

            productsToInsert.push({
                Name: name,
                Price: price,
                Category: categoryIds,
                Images: images,
                slug: uniqueSlug,
                showOnStore: false, // Default to hidden for bulk uploads
                StockStatus: 'In Stock',
                stockQuantity: 0,
                discountPercentage: 0,
                isDiscounted: false,
                isNewArrival: false,
                isBestSelling: false,
                Description: '',
                shortDescription: '',
            });

            rowNum++;
        }

        if (productsToInsert.length === 0) {
            return NextResponse.json({ success: false, message: 'No valid products found in the file' }, { status: 400 });
        }

        await Product.insertMany(productsToInsert);

        revalidateTag('products');
        revalidateTag('admin-dashboard');
        revalidateTag('categories');
        revalidateTag('home-sections');
        revalidatePath('/admin/products');

        return NextResponse.json({ 
            success: true, 
            message: `Successfully imported ${productsToInsert.length} products!`,
            count: productsToInsert.length
        });

    } catch (error) {
        console.error('[API] Bulk Import Error:', error);
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}
