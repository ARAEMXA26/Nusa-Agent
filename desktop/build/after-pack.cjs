const { execSync } = require('child_process');
const path = require('path');

module.exports = async function(context) {
  if (context.electronPlatformName === 'darwin') {
    const appPath = path.join(context.appOutDir, `${context.packager.appInfo.productFilename}.app`);
    console.log(`\n>>> [afterPack] Codesigning app bundle at: ${appPath}`);
    try {
      execSync(`codesign --force --deep --sign - "${appPath}"`, { stdio: 'inherit' });
      console.log(`>>> [afterPack] Ad-hoc codesign successfully applied to bundle!`);
    } catch (err) {
      console.error(`>>> [afterPack] Error during codesign:`, err);
      throw err;
    }
  }
};
