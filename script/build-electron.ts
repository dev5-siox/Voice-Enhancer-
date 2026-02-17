import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

const execAsync = promisify(exec);

async function buildElectron() {
  console.log('🔨 Building VoxFilter Electron App...\n');

  console.log('1. Building frontend with Vite...');
  try {
    await execAsync('npm run build');
    console.log('   ✓ Frontend built successfully\n');
  } catch (error) {
    console.error('   ✗ Frontend build failed:', error);
    process.exit(1);
  }

  console.log('2. Compiling Electron TypeScript...');
  try {
    if (!fs.existsSync('electron/dist')) {
      fs.mkdirSync('electron/dist', { recursive: true });
    }
    
    await execAsync('npx tsc -p electron/tsconfig.json');
    console.log('   ✓ Electron compiled successfully\n');
  } catch (error) {
    console.error('   ✗ Electron compilation failed:', error);
    process.exit(1);
  }

  console.log('3. Packaging with electron-builder...');
  try {
    const { stdout, stderr } = await execAsync('npx electron-builder --config electron-builder.config.cjs');
    console.log(stdout);
    if (stderr) console.error(stderr);
    console.log('   ✓ Packaging complete\n');
  } catch (error) {
    console.error('   ✗ Packaging failed:', error);
    process.exit(1);
  }

  console.log('✅ Build complete! Check the "release" folder for installers.');
}

buildElectron().catch(console.error);
