import * as fs from 'fs';
import * as https from 'https';
import * as path from 'path';

const TARGET_DIR = path.join(process.cwd(), 'apps/customer-web/public/images/landing');

const IMAGES = [
  {
    filename: 'hero-dashboard.webp',
    prompt: 'futuristic cloud server dashboard interface dark mode blue glowing data visualization',
    width: 1920,
    height: 1080,
  },
  {
    filename: 'feature-nvme.webp',
    prompt: 'close up of nvme ssd drive with neon blue lighting high tech computer storage',
    width: 800,
    height: 600,
  },
  {
    filename: 'feature-map.webp',
    prompt: 'digital map of indonesia with glowing network nodes connectivity technology',
    width: 800,
    height: 600,
  },
  {
    filename: 'feature-speed.webp',
    prompt: '3d illustration of a rocket taking off with smoke trails fast speed concept',
    width: 800,
    height: 600,
  },
  {
    filename: 'feature-payment.webp',
    prompt: 'mobile phone screen showing qr code payment digital wallet icons minimal 3d',
    width: 800,
    height: 600,
  },
  {
    filename: 'why-us-developer.webp',
    prompt: 'professional software developer coding in a dark room with multiple monitors setup',
    width: 1200,
    height: 800,
  },
  {
    filename: 'pricing-bg.webp',
    prompt: 'subtle abstract technology background dark blue circuit pattern minimal',
    width: 1920,
    height: 1080,
  },
];

async function downloadImage(url: string, filepath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filepath);
    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download image: ${response.statusCode}`));
        return;
      }
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(filepath, () => {});
      reject(err);
    });
  });
}

async function main() {
  if (!fs.existsSync(TARGET_DIR)) {
    fs.mkdirSync(TARGET_DIR, { recursive: true });
    console.log(`Created directory: ${TARGET_DIR}`);
  }

  console.log('Starting image download...');

  for (const img of IMAGES) {
    const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(img.prompt)}?width=${img.width}&height=${img.height}&nologo=true`;
    const filepath = path.join(TARGET_DIR, img.filename);
    
    try {
      console.log(`Downloading ${img.filename}...`);
      await downloadImage(url, filepath);
      console.log(`✓ Saved ${img.filename}`);
    } catch (error) {
      console.error(`✗ Failed to download ${img.filename}:`, error);
    }
  }

  console.log('All downloads finished.');
}

main().catch(console.error);
