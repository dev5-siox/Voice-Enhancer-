import { spawn, ChildProcess } from 'child_process';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';

const execAsync = promisify(exec);

let electronProcess: ChildProcess | null = null;

async function waitForServer(url: string, maxAttempts = 30): Promise<boolean> {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const response = await fetch(url);
      if (response.ok || response.status === 200) {
        return true;
      }
    } catch {
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
    process.stdout.write('.');
  }
  return false;
}

async function compileElectron(): Promise<void> {
  console.log('📦 Compiling Electron TypeScript...');
  
  if (!fs.existsSync('electron/dist')) {
    fs.mkdirSync('electron/dist', { recursive: true });
  }
  
  await execAsync('npx tsc -p electron/tsconfig.json');
  // Preload must be CommonJS even when app uses ESM ("type": "module").
  await execAsync('npx esbuild electron/preload/preload.ts --bundle --platform=node --format=cjs --outfile=electron/dist/preload/preload.cjs --external:electron');
  console.log('✓ Electron compiled\n');
}

async function startElectron(): Promise<void> {
  console.log('🚀 Starting Electron...');
  
  electronProcess = spawn('npx', ['electron', 'electron/dist/main/main.js'], {
    stdio: 'inherit',
    shell: true,
    env: {
      ...process.env,
      NODE_ENV: 'development',
    },
  });

  electronProcess.on('close', (code) => {
    console.log(`\nElectron exited with code ${code}`);
    process.exit(code ?? 0);
  });

  electronProcess.on('error', (error) => {
    console.error('Electron error:', error);
  });
}

async function main() {
  console.log('🎙️ VoicePro Electron Development Mode\n');
  console.log('Note: Make sure the web server is running (npm run dev)\n');

  try {
    await compileElectron();
    
    console.log('⏳ Waiting for web server on http://localhost:5000');
    const serverReady = await waitForServer('http://localhost:5000');
    
    if (!serverReady) {
      console.error('\n❌ Web server not responding. Please start it with: npm run dev');
      process.exit(1);
    }
    
    console.log(' Ready!\n');
    await startElectron();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

process.on('SIGINT', () => {
  if (electronProcess) {
    electronProcess.kill();
  }
  process.exit(0);
});

main();
