/**
 * seed.js — Auto-upload all static images to Cloudinary & seed MongoDB
 *
 * Run once:  node seed.js
 *
 * Seeds:
 *  1. Logo      → siteconfigs collection
 *  2. Gallery   → galleries collection (6 images)
 *  3. Hero/Slider image → sliderimages collection (1 image)
 *  4. Event images     → eventimages collection (3 images, max 5 allowed)
 */

const fs       = require('fs');
const path     = require('path');
const axios    = require('axios');
const FormData = require('form-data');
const mongoose = require('mongoose');
require('dotenv').config();

const CLOUDINARY_URL    = 'https://api.cloudinary.com/v1_1/dfojntght/image/upload';
const CLOUDINARY_PRESET = 'ml_default2';
const ASSETS            = path.join(__dirname, '../food-web/public/assets');

// ── Inline schemas (self-contained) ──────────────────────────────────────────
const SiteConfig  = mongoose.model('SiteConfig',  mongoose.Schema({ logoUrl: { type: String, default: '' }, siteName: { type: String, default: 'Kudoz Restro' }, updatedAt: { type: Date, default: Date.now } }));
const Gallery     = mongoose.model('Gallery',     mongoose.Schema({ title: String, img: { type: String, required: true }, size: { type: String, default: 'small' }, order: { type: Number, default: 0 } }));
const SliderImage = mongoose.model('SliderImage', mongoose.Schema({ imgUrl: { type: String, default: '' }, updatedAt: { type: Date, default: Date.now } }));
const EventImage  = mongoose.model('EventImage',  mongoose.Schema({ img: { type: String, required: true }, alt: { type: String, default: 'Event' }, order: { type: Number, default: 0 } }));

// ── Files to seed ─────────────────────────────────────────────────────────────
const LOGO_FILE   = path.join(ASSETS, 'header/kudozlogo1.png');
const SLIDER_FILE = path.join(ASSETS, 'slider/bgfood1.png');

const GALLERY_FILES = [
    { file: path.join(ASSETS, 'slider/bgfood1.png'),       title: 'Our Kitchen',          size: 'large', order: 1 },
    { file: path.join(ASSETS, 'slider/slider2.jpg'),        title: 'Dining Experience',    size: 'small', order: 2 },
    { file: path.join(ASSETS, 'Event/event3.webp'),         title: 'Event Setup',          size: 'small', order: 3 },
    { file: path.join(ASSETS, 'Event/event1.webp'),         title: 'Special Event',        size: 'small', order: 4 },
    { file: path.join(ASSETS, 'slider/slider3.webp'),       title: 'Fine Dining',          size: 'small', order: 5 },
    { file: path.join(ASSETS, 'Event/birthdaytable.jpeg'),  title: 'Birthday Celebration', size: 'large', order: 6 },
];

const EVENT_FILES = [
    { file: path.join(ASSETS, 'Event/event3.webp'),         alt: 'Wedding Event',    order: 1 },
    { file: path.join(ASSETS, 'Event/event1.webp'),         alt: 'Corporate Event',  order: 2 },
    { file: path.join(ASSETS, 'Event/birthdaytable.jpeg'),  alt: 'Birthday Party',   order: 3 },
];

// ── Upload a single file to Cloudinary ───────────────────────────────────────
async function uploadToCloudinary(filePath) {
    const form = new FormData();
    form.append('file',          fs.createReadStream(filePath));
    form.append('upload_preset', CLOUDINARY_PRESET);
    const res = await axios.post(CLOUDINARY_URL, form, { headers: form.getHeaders() });
    return res.data.secure_url;
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function seed() {
    console.log('\n🌱 Starting full seed...\n');
    await mongoose.connect(process.env.mongodbConnectionString, { useNewUrlParser: true });
    console.log('✅ Connected to MongoDB\n');

    // 1. LOGO
    console.log('─── Logo ─────────────────────────────');
    try {
        const logoUrl = await uploadToCloudinary(LOGO_FILE);
        let config = await SiteConfig.findOne();
        if (!config) config = new SiteConfig();
        config.logoUrl = logoUrl; config.siteName = 'Kudoz Restro'; config.updatedAt = Date.now();
        await config.save();
        console.log('✅ Logo saved:', logoUrl);
    } catch (err) { console.error('❌ Logo failed:', err.message); }

    // 2. GALLERY
    console.log('\n─── Gallery ──────────────────────────');
    await Gallery.deleteMany({});
    console.log('🗑️  Old gallery cleared');
    for (const item of GALLERY_FILES) {
        try {
            const url = await uploadToCloudinary(item.file);
            await new Gallery({ title: item.title, img: url, size: item.size, order: item.order }).save();
            console.log(`✅ ${path.basename(item.file)}`);
        } catch (err) { console.error(`❌ ${path.basename(item.file)}: ${err.message}`); }
    }

    // 3. SLIDER / HERO
    console.log('\n─── Hero / Slider Image ──────────────');
    try {
        const url = await uploadToCloudinary(SLIDER_FILE);
        let doc = await SliderImage.findOne();
        if (!doc) doc = new SliderImage();
        doc.imgUrl = url; doc.updatedAt = Date.now();
        await doc.save();
        console.log('✅ Hero image saved:', url);
    } catch (err) { console.error('❌ Hero image failed:', err.message); }

    // 4. EVENT IMAGES
    console.log('\n─── Event Images ─────────────────────');
    await EventImage.deleteMany({});
    console.log('🗑️  Old event images cleared');
    for (const item of EVENT_FILES) {
        try {
            const url = await uploadToCloudinary(item.file);
            await new EventImage({ img: url, alt: item.alt, order: item.order }).save();
            console.log(`✅ ${item.alt}`);
        } catch (err) { console.error(`❌ ${item.alt}: ${err.message}`); }
    }

    console.log('\n🎉 All done! Static images are now in Cloudinary & MongoDB.\n');
    process.exit(0);
}

seed().catch(err => { console.error('❌ Seed error:', err); process.exit(1); });
