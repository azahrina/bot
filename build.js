const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const JavaScriptObfuscator = require('javascript-obfuscator');

function obfuscateExtensionFile(srcPath, destPath) {
    console.log(`🔒 Obfuscating Extension: ${path.basename(srcPath)}...`);
    const code = fs.readFileSync(srcPath, 'utf8');
    const result = JavaScriptObfuscator.obfuscate(code, {
        compact: true,
        simplify: true,
        stringArray: false, // Keep CSP happy and avoid Chrome Store rejection
        selfDefending: false,
        disableConsoleOutput: false,
        reservedNames: [
            'chrome', 'window', 'document', 'fetch', 'setInterval', 'clearInterval', 
            'setTimeout', 'clearTimeout', 'console', 'JSON', 'Map', 'Set', 
            'Promise', 'Math', 'Uint8Array', 'Buffer', 'shadow', 'shadowRoot'
        ]
    });
    fs.writeFileSync(destPath, result.getObfuscatedCode(), 'utf8');
}

console.log("=========================================");
console.log("🛡️  Starting Premium Obfuscated Build... 🛡️");
console.log("=========================================");

const serverDir = __dirname;
const originalServerPath = path.join(serverDir, 'server.js');
const obfuscatedServerPath = path.join(serverDir, 'server.obfuscated.js');
const packageJsonPath = path.join(serverDir, 'package.json');

try {
    // 1. Read original server.js
    console.log("📖 Reading server.js...");
    const originalCode = fs.readFileSync(originalServerPath, 'utf8');

    // 2. Perform Obfuscation
    console.log("⚡ Obfuscating JavaScript source code (Safe & High-Performance Profile)...");
    const obfuscationResult = JavaScriptObfuscator.obfuscate(originalCode, {
        compact: true,
        simplify: true,
        stringArray: false, // Keep routing strings plain to prevent PKG wrapping bugs
        selfDefending: false,
        disableConsoleOutput: false,
        reservedNames: [
            'require', 'module', 'exports', '__dirname', 'SvcHandler', 'print', 'reportTask', 'categorizeError', 
            'addLog', 'logsByUser', 'sseByUser', 'extSessions', 'getExtClient', 
            'runningTasks', 'activeRAMTasks', 'customerName', 'memBuffer',
            'initProcess', 'syncSysData', 'processStream', 'customRequire', 
            'moduleObj', 'exportsObj', 'express', 'cors', 'axios', 'socket.io', 
            'jimp', 'pureimage', 'fluent-ffmpeg', 'instagram-private-api', 
            'node-machine-id', 'opentype.js', 'multer', 'child_process', 'crypto', 
            'fs', 'path', 'http', 'AUTH_SERVER', 'ENCRYPTION_KEY', 'HWID', 
            'DATA_DIR', 'PORT', 'app', 'server', 'io', 'upload', 'storage',
            '_originalLog', '_originalError'
        ]
    });
    const obfuscatedCode = obfuscationResult.getObfuscatedCode();

    // 3. Write server.obfuscated.js
    console.log("✍️ Writing obfuscated script to server.obfuscated.js...");
    fs.writeFileSync(obfuscatedServerPath, obfuscatedCode, 'utf8');

    // 4. Temporarily patch package.json to target server.obfuscated.js
    console.log("🔧 Patching package.json entrypoint...");
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    const originalBin = packageJson.bin;
    packageJson.bin = "server.obfuscated.js";
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 4), 'utf8');

    try {
        // 5. Run PKG compiler
        console.log("🚀 Compiling obfuscated biner with Vercel PKG...");
        
        // Stop any running instances first
        try {
            execSync('Stop-Process -Name toolsig -Force -ErrorAction SilentlyContinue', { shell: 'powershell.exe' });
        } catch (e) {}

        const outPath = path.join(serverDir, '..', 'New folder', 'toolsig.exe');
        execSync(`npx pkg -t node18-win-x64 "${packageJsonPath}" -o "${outPath}"`, { stdio: 'inherit' });
        console.log(`\n✅ Successfully compiled premium biner: ${outPath}`);

        // 5.5. Copy and Obfuscate Chrome Extension for release
        console.log("\n🔒 Securing and copying Chrome Extension for release...");
        const releaseIgDir = path.join(serverDir, '..', 'New folder', 'ig');
        try {
            execSync(`Remove-Item -Path "${releaseIgDir}" -Recurse -Force -ErrorAction SilentlyContinue`, { shell: 'powershell.exe' });
            execSync(`Copy-Item -Path "${path.join(serverDir, '..', 'ig')}" -Destination "${releaseIgDir}" -Recurse -Force`, { shell: 'powershell.exe' });
            
            // Obfuscate the release files in-place
            obfuscateExtensionFile(path.join(releaseIgDir, 'content', 'panel.js'), path.join(releaseIgDir, 'content', 'panel.js'));
            obfuscateExtensionFile(path.join(releaseIgDir, 'background.js'), path.join(releaseIgDir, 'background.js'));
            obfuscateExtensionFile(path.join(releaseIgDir, 'popup', 'index.js'), path.join(releaseIgDir, 'popup', 'index.js'));
            obfuscateExtensionFile(path.join(releaseIgDir, 'content.js'), path.join(releaseIgDir, 'content.js'));
            console.log("✅ Chrome Extension release build is now 100% obfuscated & secure!");
        } catch (e) {
            console.log(`⚠️ Gagal memproteksi extension release: ${e.message}`);
        }
    } finally {
        // 6. Restore package.json to original state
        console.log("🔄 Restoring package.json back to server.js entrypoint...");
        packageJson.bin = originalBin;
        fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 4), 'utf8');

        // 7. Cleanup server.obfuscated.js
        console.log("🧹 Cleaning up temporary obfuscated files...");
        if (fs.existsSync(obfuscatedServerPath)) {
            fs.unlinkSync(obfuscatedServerPath);
        }
    }

    console.log("\n=========================================");
    console.log("🎉  OBFUSCATED BUILD COMPLETE SUCCESSFULLY! 🎉");
    console.log("=========================================\n");

} catch (error) {
    console.error("\n❌ Build failed with error:", error.message);
    process.exit(1);
}
