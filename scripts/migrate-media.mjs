/**
 * Media Migration Script: Cloudinary Asset Mirror & Database Pointer Rewriter
 * 
 * Usage:
 *   Dry-run (crawl documents and list all media assets without uploading or updating DB):
 *     node scripts/migrate-media.mjs --dry-run
 * 
 *   Live execution (upload to new Cloudinary and update references in NEW_MONGODB_URI):
 *     node scripts/migrate-media.mjs
 * 
 * Environment Variables (via .env.migration, .env.local, or process.env):
 *   NEW_MONGODB_URI               : Destination MongoDB connection URI
 *   OLD_CLOUDINARY_CLOUD_NAME     : Old Cloudinary cloud name (e.g. personal cloud name)
 *   NEW_CLOUDINARY_CLOUD_NAME     : Client Cloudinary cloud name
 *   NEW_CLOUDINARY_API_KEY        : Client Cloudinary API key
 *   NEW_CLOUDINARY_API_SECRET     : Client Cloudinary API secret
 */

import { MongoClient } from 'mongodb';
import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';
import path from 'path';
import dns from 'dns';

// Ensure reliable Atlas SRV resolution across local Windows DNS
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch {}

// ── 1. Load Environment Configuration ────────────────────────────────────────
function loadEnv() {
  const envFiles = ['.env.migration', '.env.local', '.env'];
  for (const file of envFiles) {
    const fullPath = path.resolve(process.cwd(), file);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf8');
      content.split('\n').forEach((line) => {
        const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
        if (match) {
          let key = match[1];
          let value = match[2] || '';
          if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
          if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
          if (!process.env[key]) {
            process.env[key] = value.trim();
          }
        }
      });
    }
  }
}

loadEnv();

const NEW_DB_URI = process.env.NEW_MONGODB_URI;
const OLD_CLOUD_NAME = process.env.OLD_CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_CLOUD_NAME;
const NEW_CLOUD_NAME = process.env.NEW_CLOUDINARY_CLOUD_NAME;
const NEW_API_KEY = process.env.NEW_CLOUDINARY_API_KEY || process.env.CLOUDINARY_API_KEY;
const NEW_API_SECRET = process.env.NEW_CLOUDINARY_API_SECRET || process.env.CLOUDINARY_API_SECRET;

const isDryRun = process.argv.includes('--dry-run');
const CACHE_FILE = path.resolve(process.cwd(), 'migration-media-map.json');

// ── 2. Configure Cloudinary for Destination ──────────────────────────────────
if (!isDryRun) {
  if (!NEW_CLOUD_NAME || !NEW_API_KEY || !NEW_API_SECRET) {
    console.error('❌ Error: Missing NEW_CLOUDINARY credentials (cloud_name, api_key, api_secret).');
    process.exit(1);
  }

  cloudinary.config({
    cloud_name: NEW_CLOUD_NAME,
    api_key: NEW_API_KEY,
    api_secret: NEW_API_SECRET,
    secure: true,
  });
}

// ── 3. Persistent Media Mapping Cache (Resume-safe) ──────────────────────────
let urlMap = {};
if (fs.existsSync(CACHE_FILE)) {
  try {
    urlMap = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
  } catch {
    urlMap = {};
  }
}

function saveCache() {
  fs.writeFileSync(CACHE_FILE, JSON.stringify(urlMap, null, 2), 'utf8');
}

// ── 4. Helper: Extract Cloudinary Public ID and Resource Type ─────────────────
function isOldCloudinaryUrl(url) {
  if (!url || typeof url !== 'string') return false;
  if (!url.includes('res.cloudinary.com')) return false;
  if (OLD_CLOUD_NAME && !url.includes(`/${OLD_CLOUD_NAME}/`)) return false;
  return true;
}

function parseCloudinaryInfo(url) {
  try {
    const isVideo = url.includes('/video/upload/') || /\.(mp4|webm|mov|mkv|avi|m4v)(\?.*)?$/i.test(url);
    const resourceType = isVideo ? 'video' : 'image';
    
    // Extract public_id and potential folder structure
    // Example: https://res.cloudinary.com/<cloud_name>/image/upload/v12345/ornaments_products/sample.webp
    const uploadIdx = url.indexOf('/upload/');
    if (uploadIdx === -1) return { resourceType, publicId: undefined };

    let afterUpload = url.substring(uploadIdx + 8);
    // Strip version prefix if exists (e.g. v1700000000/)
    afterUpload = afterUpload.replace(/^v\d+\//, '');
    // Strip transformation segment if present
    afterUpload = afterUpload.replace(/^(?:[a-z]{1,3}_[^/]+(?:,[a-z]{1,3}_[^/]+)*\/)+/, '');
    // Remove extension
    const publicId = afterUpload.replace(/\.[a-zA-Z0-9]+$/, '');

    return { resourceType, publicId };
  } catch {
    return { resourceType: 'image', publicId: undefined };
  }
}

// ── 5. Cloudinary Upload with Retry & Deduplication ───────────────────────────
async function migrateSingleAsset(sourceUrl, preferredPublicId = null, forcedResourceType = null) {
  if (!sourceUrl || typeof sourceUrl !== 'string') return null;
  if (!isOldCloudinaryUrl(sourceUrl)) return null;

  if (urlMap[sourceUrl]) {
    return urlMap[sourceUrl];
  }

  const { resourceType: inferredType, publicId: extractedPublicId } = parseCloudinaryInfo(sourceUrl);
  const resourceType = forcedResourceType || inferredType;
  const targetPublicId = preferredPublicId || extractedPublicId;

  if (isDryRun) {
    return {
      secure_url: sourceUrl.replace(`/${OLD_CLOUD_NAME}/`, `/${NEW_CLOUD_NAME || 'new-cloud'}/`),
      public_id: targetPublicId || 'preview-id',
      resource_type: resourceType
    };
  }

  // Upload to new Cloudinary using remote URL fetching
  let retries = 3;
  while (retries > 0) {
    try {
      const uploadOptions = {
        resource_type: resourceType,
        overwrite: true,
      };

      if (targetPublicId) {
        uploadOptions.public_id = targetPublicId;
      }

      const result = await cloudinary.uploader.upload(sourceUrl, uploadOptions);

      const mapped = {
        secure_url: result.secure_url,
        public_id: result.public_id,
        resource_type: result.resource_type,
      };

      urlMap[sourceUrl] = mapped;
      saveCache();
      return mapped;
    } catch (err) {
      retries--;
      if (retries === 0) {
        console.error(`\n    ❌ Failed to upload asset: ${sourceUrl} - ${err.message}`);
        return null;
      }
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
  return null;
}

// ── 6. Schema Processors ──────────────────────────────────────────────────────
async function processProducts(db) {
  console.log('\n[1/10] Processing Products...');
  const coll = db.collection('products');
  const products = await coll.find({}).toArray();
  let updatedCount = 0;

  for (const product of products) {
    let modified = false;

    // Gallery images
    if (Array.isArray(product.Images)) {
      for (const img of product.Images) {
        if (img?.url && isOldCloudinaryUrl(img.url)) {
          const result = await migrateSingleAsset(img.url, img.publicId, 'image');
          if (result) {
            img.url = result.secure_url;
            img.publicId = result.public_id;
            modified = true;
          }
        }
      }
    }

    // SEO OG Image
    if (product.seoOgImage && isOldCloudinaryUrl(product.seoOgImage)) {
      const result = await migrateSingleAsset(product.seoOgImage, null, 'image');
      if (result) {
        product.seoOgImage = result.secure_url;
        modified = true;
      }
    }

    if (modified) {
      if (!isDryRun) {
        await coll.updateOne({ _id: product._id }, { $set: { Images: product.Images, seoOgImage: product.seoOgImage } });
      }
      updatedCount++;
    }
  }
  console.log(`  ✓ Products checked: ${products.length} | Updated: ${updatedCount}`);
}

async function processCategories(db) {
  console.log('\n[2/10] Processing Categories...');
  const coll = db.collection('categories');
  const categories = await coll.find({}).toArray();
  let updatedCount = 0;

  for (const cat of categories) {
    let modified = false;
    const updateFields = {};

    for (const [urlField, idField] of [
      ['image', 'imagePublicId'],
      ['secondaryImage', 'secondaryImagePublicId'],
      ['tertiaryImage', 'tertiaryImagePublicId'],
    ]) {
      if (cat[urlField] && isOldCloudinaryUrl(cat[urlField])) {
        const result = await migrateSingleAsset(cat[urlField], cat[idField], 'image');
        if (result) {
          updateFields[urlField] = result.secure_url;
          updateFields[idField] = result.public_id;
          modified = true;
        }
      }
    }

    if (modified) {
      if (!isDryRun) {
        await coll.updateOne({ _id: cat._id }, { $set: updateFields });
      }
      updatedCount++;
    }
  }
  console.log(`  ✓ Categories checked: ${categories.length} | Updated: ${updatedCount}`);
}

async function processHomePage(db) {
  console.log('\n[3/10] Processing HomePage Sections...');
  const coll = db.collection('homepages');
  const pages = await coll.find({}).toArray();
  let updatedCount = 0;

  for (const page of pages) {
    let modified = false;

    if (Array.isArray(page.sections)) {
      for (const section of page.sections) {
        // Hero slides
        if (Array.isArray(section.slides)) {
          for (const slide of section.slides) {
            for (const imgKey of ['desktopImage', 'tabletImage', 'mobileImage']) {
              if (slide[imgKey]?.url && isOldCloudinaryUrl(slide[imgKey].url)) {
                const res = await migrateSingleAsset(slide[imgKey].url, slide[imgKey].publicId, 'image');
                if (res) {
                  slide[imgKey].url = res.secure_url;
                  slide[imgKey].publicId = res.public_id;
                  modified = true;
                }
              }
            }
          }
        }

        // Banners
        for (const bannerListKey of ['desktopImages', 'carouselBanners']) {
          if (Array.isArray(section[bannerListKey])) {
            for (const item of section[bannerListKey]) {
              if (item?.image?.url && isOldCloudinaryUrl(item.image.url)) {
                const res = await migrateSingleAsset(item.image.url, item.image.publicId, 'image');
                if (res) {
                  item.image.url = res.secure_url;
                  item.image.publicId = res.public_id;
                  modified = true;
                }
              }
            }
          }
        }

        // Mobile image banner
        if (section.mobileImage?.image?.url && isOldCloudinaryUrl(section.mobileImage.image.url)) {
          const res = await migrateSingleAsset(section.mobileImage.image.url, section.mobileImage.image.publicId, 'image');
          if (res) {
            section.mobileImage.image.url = res.secure_url;
            section.mobileImage.image.publicId = res.public_id;
            modified = true;
          }
        }

        // Videos
        for (const videoKey of ['pcVideo', 'mobileVideo']) {
          if (section[videoKey]?.url && isOldCloudinaryUrl(section[videoKey].url)) {
            const res = await migrateSingleAsset(section[videoKey].url, section[videoKey].publicId, 'video');
            if (res) {
              section[videoKey].url = res.secure_url;
              section[videoKey].publicId = res.public_id;
              modified = true;
            }
          }
        }
      }
    }

    if (modified) {
      if (!isDryRun) {
        await coll.updateOne({ _id: page._id }, { $set: { sections: page.sections } });
      }
      updatedCount++;
    }
  }
  console.log(`  ✓ HomePage documents checked: ${pages.length} | Updated: ${updatedCount}`);
}

async function processCoverPhotos(db) {
  console.log('\n[4/10] Processing CoverPhotos...');
  const coll = db.collection('coverphotos');
  const covers = await coll.find({}).toArray();
  let updatedCount = 0;

  for (const cover of covers) {
    let modified = false;
    if (Array.isArray(cover.slides)) {
      for (const slide of cover.slides) {
        for (const imgKey of ['desktopImage', 'tabletImage', 'mobileImage']) {
          if (slide[imgKey]?.url && isOldCloudinaryUrl(slide[imgKey].url)) {
            const res = await migrateSingleAsset(slide[imgKey].url, slide[imgKey].publicId, 'image');
            if (res) {
              slide[imgKey].url = res.secure_url;
              slide[imgKey].publicId = res.public_id;
              modified = true;
            }
          }
        }
      }
    }

    if (modified) {
      if (!isDryRun) {
        await coll.updateOne({ _id: cover._id }, { $set: { slides: cover.slides } });
      }
      updatedCount++;
    }
  }
  console.log(`  ✓ CoverPhotos checked: ${covers.length} | Updated: ${updatedCount}`);
}

async function processSettings(db) {
  console.log('\n[5/10] Processing Site Settings...');
  const coll = db.collection('settings');
  const settings = await coll.find({}).toArray();
  let updatedCount = 0;

  for (const setting of settings) {
    const updateFields = {};
    let modified = false;

    for (const key of ['lightLogoUrl', 'darkLogoUrl', 'faviconUrl']) {
      if (setting[key] && isOldCloudinaryUrl(setting[key])) {
        const res = await migrateSingleAsset(setting[key], null, 'image');
        if (res) {
          updateFields[key] = res.secure_url;
          modified = true;
        }
      }
    }

    if (modified) {
      if (!isDryRun) {
        await coll.updateOne({ _id: setting._id }, { $set: updateFields });
      }
      updatedCount++;
    }
  }
  console.log(`  ✓ Settings documents checked: ${settings.length} | Updated: ${updatedCount}`);
}

async function processReviews(db) {
  console.log('\n[6/10] Processing Reviews...');
  const coll = db.collection('reviews');
  const reviews = await coll.find({}).toArray();
  let updatedCount = 0;

  for (const review of reviews) {
    let modified = false;
    if (Array.isArray(review.images)) {
      const newImages = [];
      for (const imgUrl of review.images) {
        if (isOldCloudinaryUrl(imgUrl)) {
          const res = await migrateSingleAsset(imgUrl, null, 'image');
          if (res) {
            newImages.push(res.secure_url);
            modified = true;
          } else {
            newImages.push(imgUrl);
          }
        } else {
          newImages.push(imgUrl);
        }
      }
      review.images = newImages;
    }

    if (modified) {
      if (!isDryRun) {
        await coll.updateOne({ _id: review._id }, { $set: { images: review.images } });
      }
      updatedCount++;
    }
  }
  console.log(`  ✓ Reviews checked: ${reviews.length} | Updated: ${updatedCount}`);
}

async function processOrders(db) {
  console.log('\n[7/10] Processing Orders...');
  const coll = db.collection('orders');
  const orders = await coll.find({ 'items.image': { $regex: 'res.cloudinary.com' } }).toArray();
  let updatedCount = 0;

  for (const order of orders) {
    let modified = false;
    if (Array.isArray(order.items)) {
      for (const item of order.items) {
        if (item.image && isOldCloudinaryUrl(item.image)) {
          const res = await migrateSingleAsset(item.image, null, 'image');
          if (res) {
            item.image = res.secure_url;
            modified = true;
          }
        }
      }
    }

    if (modified) {
      if (!isDryRun) {
        await coll.updateOne({ _id: order._id }, { $set: { items: order.items } });
      }
      updatedCount++;
    }
  }
  console.log(`  ✓ Orders checked: ${orders.length} | Updated: ${updatedCount}`);
}

async function processInvoices(db) {
  console.log('\n[8/10] Processing Invoices...');
  const coll = db.collection('invoices');
  const invoices = await coll.find({ 'items.image': { $regex: 'res.cloudinary.com' } }).toArray();
  let updatedCount = 0;

  for (const invoice of invoices) {
    let modified = false;
    if (Array.isArray(invoice.items)) {
      for (const item of invoice.items) {
        if (item.image && isOldCloudinaryUrl(item.image)) {
          const res = await migrateSingleAsset(item.image, null, 'image');
          if (res) {
            item.image = res.secure_url;
            modified = true;
          }
        }
      }
    }

    if (modified) {
      if (!isDryRun) {
        await coll.updateOne({ _id: invoice._id }, { $set: { items: invoice.items } });
      }
      updatedCount++;
    }
  }
  console.log(`  ✓ Invoices checked: ${invoices.length} | Updated: ${updatedCount}`);
}

async function processAbandonedCarts(db) {
  console.log('\n[9/10] Processing Abandoned Carts...');
  const coll = db.collection('abandonedcarts');
  const carts = await coll.find({ 'items.image': { $regex: 'res.cloudinary.com' } }).toArray();
  let updatedCount = 0;

  for (const cart of carts) {
    let modified = false;
    if (Array.isArray(cart.items)) {
      for (const item of cart.items) {
        if (item.image && isOldCloudinaryUrl(item.image)) {
          const res = await migrateSingleAsset(item.image, null, 'image');
          if (res) {
            item.image = res.secure_url;
            modified = true;
          }
        }
      }
    }

    if (modified) {
      if (!isDryRun) {
        await coll.updateOne({ _id: cart._id }, { $set: { items: cart.items } });
      }
      updatedCount++;
    }
  }
  console.log(`  ✓ Abandoned Carts checked: ${carts.length} | Updated: ${updatedCount}`);
}

async function processUsers(db) {
  console.log('\n[10/10] Processing Users...');
  const coll = db.collection('users');
  const users = await coll.find({ image: { $regex: 'res.cloudinary.com' } }).toArray();
  let updatedCount = 0;

  for (const user of users) {
    if (user.image && isOldCloudinaryUrl(user.image)) {
      const res = await migrateSingleAsset(user.image, null, 'image');
      if (res) {
        if (!isDryRun) {
          await coll.updateOne({ _id: user._id }, { $set: { image: res.secure_url } });
        }
        updatedCount++;
      }
    }
  }
  console.log(`  ✓ Users with Cloudinary avatar checked: ${users.length} | Updated: ${updatedCount}`);
}

// ── 7. Main Runner ────────────────────────────────────────────────────────────
async function runMediaMigration() {
  console.log('\n======================================================');
  console.log('       CLOUDINARY MEDIA ASSET MIGRATION               ');
  console.log('======================================================');
  console.log(`Execution Mode: ${isDryRun ? '🔍 DRY-RUN (Asset Discovery Only)' : '🚀 LIVE MEDIA TRANSFER'}`);
  console.log(`Source Cloud:       "${OLD_CLOUD_NAME || 'Auto-detect all res.cloudinary.com'}"`);
  console.log(`Destination Cloud:  "${NEW_CLOUD_NAME || '(Not set / Dry run)'}"`);

  const oldDbUri = process.env.OLD_MONGODB_URI || process.env.MONGODB_URI;
  const dbTargetUri = isDryRun ? oldDbUri : NEW_DB_URI;

  if (!dbTargetUri) {
    console.error('❌ Error: Target MongoDB URI is missing. (Set NEW_MONGODB_URI or MONGODB_URI)');
    process.exit(1);
  }

  const client = new MongoClient(dbTargetUri);

  try {
    await client.connect();
    const db = client.db();
    console.log(`Target Database:    "${db.databaseName}"`);

    await processProducts(db);
    await processCategories(db);
    await processHomePage(db);
    await processCoverPhotos(db);
    await processSettings(db);
    await processReviews(db);
    await processOrders(db);
    await processInvoices(db);
    await processAbandonedCarts(db);
    await processUsers(db);

    const totalUniqueMigrated = Object.keys(urlMap).length;
    console.log('\n======================================================');
    console.log(`Total Unique Media Assets Managed: ${totalUniqueMigrated}`);
    console.log(`Mapping Record File:               ${CACHE_FILE}`);
    console.log('======================================================\n');

    if (isDryRun) {
      console.log('✅ Dry-Run completed cleanly. No media uploaded, no database records modified.');
    } else {
      console.log('✅ Media migration and database pointer rewrite completed successfully!');
    }
  } catch (err) {
    console.error('\n❌ Media migration encountered an error:', err);
    process.exit(1);
  } finally {
    await client.close();
  }
}

runMediaMigration();
