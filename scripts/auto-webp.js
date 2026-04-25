import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const assetsDir = path.join(__dirname, '../src/assets');
const srcDir = path.join(__dirname, '../src');

// Recursively find files
function getAllFiles(dir, extArray, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      getAllFiles(filePath, extArray, fileList);
    } else {
      if (extArray.some(ext => file.toLowerCase().endsWith(ext))) {
        fileList.push(filePath);
      }
    }
  });
  return fileList;
}

const imagesToConvert = getAllFiles(assetsDir, ['.jpg', '.jpeg', '.png']);

if (imagesToConvert.length > 0) {
  console.log(`[Auto-WebP] Found ${imagesToConvert.length} images to optimize...`);
  let convertedCount = 0;

  imagesToConvert.forEach(img => {
    const ext = path.extname(img);
    const webpPath = img.slice(0, -ext.length) + '.webp';
    try {
      // Check if ffmpeg is installed
      execSync(`ffmpeg -y -v error -i "${img}" -c:v libwebp -q:v 80 "${webpPath}"`);
      fs.unlinkSync(img); // remove original
      console.log(`[Auto-WebP] Converted: ${path.basename(img)} -> ${path.basename(webpPath)}`);
      convertedCount++;
    } catch (e) {
      console.error(`[Auto-WebP] Failed to convert ${img}. Make sure ffmpeg is installed.`);
    }
  });

  if (convertedCount > 0) {
    // Automatically update imports in source code
    const codeFiles = getAllFiles(srcDir, ['.jsx', '.js', '.tsx', '.ts', '.css']);
    codeFiles.forEach(file => {
      let content = fs.readFileSync(file, 'utf8');
      let changed = false;
      imagesToConvert.forEach(img => {
        const basename = path.basename(img);
        const ext = path.extname(img);
        const webpBasename = basename.slice(0, -ext.length) + '.webp';
        
        // Escape regex characters just in case, though basenames usually don't have them
        const safeBasename = basename.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(safeBasename, 'g');
        
        if (content.includes(basename)) {
          content = content.replace(regex, webpBasename);
          changed = true;
        }
      });
      if (changed) {
        fs.writeFileSync(file, content, 'utf8');
        console.log(`[Auto-WebP] Updated imports in ${path.relative(srcDir, file)}`);
      }
    });
  }
}
