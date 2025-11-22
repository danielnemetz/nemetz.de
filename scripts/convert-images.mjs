import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';

const IMAGES_DIR = 'public/images';

async function convertImages() {
    console.log(`Scanning ${IMAGES_DIR} for images...`);
    const files = await fs.readdir(IMAGES_DIR);

    for (const file of files) {
        const ext = path.extname(file).toLowerCase();
        if (['.jpg', '.jpeg', '.png'].includes(ext)) {
            const inputPath = path.join(IMAGES_DIR, file);
            const outputPath = path.join(IMAGES_DIR, path.basename(file, ext) + '.webp');

            console.log(`Converting ${file} to WebP...`);

            await sharp(inputPath)
                .webp({ quality: 80 })
                .toFile(outputPath);

            console.log(`✓ Created ${path.basename(outputPath)}`);
        }
    }
    console.log('Image conversion complete.');
}

convertImages().catch(console.error);
