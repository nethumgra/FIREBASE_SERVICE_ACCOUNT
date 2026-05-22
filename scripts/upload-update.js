const admin = require('firebase-admin');
const archiver = require('archiver');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
require('dotenv').config();

// Service account details must be provided via environment variables in GitHub Actions
// or a local .env file
const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT;
if (!serviceAccountKey) {
  console.error("ERROR: FIREBASE_SERVICE_ACCOUNT environment variable is not set.");
  process.exit(1);
}

// Parse the service account JSON
const serviceAccount = JSON.parse(serviceAccountKey);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: `${serviceAccount.project_id}.firebasestorage.app`
});

const db = admin.firestore();
const bucket = admin.storage().bucket();

const OUT_DIR = path.join(__dirname, '../out');
const ZIP_PATH = path.join(__dirname, '../update.zip');

async function createZip() {
  return new Promise((resolve, reject) => {
    console.log(`Zipping ${OUT_DIR} to ${ZIP_PATH}...`);
    const output = fs.createWriteStream(ZIP_PATH);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', () => resolve(ZIP_PATH));
    archive.on('error', (err) => reject(err));

    archive.pipe(output);
    archive.directory(OUT_DIR, false);
    archive.finalize();
  });
}

async function uploadToStorage(filePath) {
  console.log(`Uploading ${filePath} to Firebase Storage...`);
  const destination = `app-updates/update-${Date.now()}.zip`;
  
  await bucket.upload(filePath, {
    destination: destination,
    metadata: {
      contentType: 'application/zip',
    }
  });

  const file = bucket.file(destination);
  // Make the file publicly accessible
  await file.makePublic();
  
  // Get the public URL
  const publicUrl = `https://storage.googleapis.com/${bucket.name}/${destination}`;
  console.log(`Uploaded successfully! URL: ${publicUrl}`);
  return publicUrl;
}

async function updateFirestore(url, version) {
  console.log(`Updating Firestore document app_config/updates with version ${version}...`);
  await db.collection('app_config').doc('updates').set({
    latestVersion: version,
    updateUrl: url,
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  }, { merge: true });
  console.log("Firestore updated successfully.");
}

async function run() {
  try {
    if (!fs.existsSync(OUT_DIR)) {
      throw new Error("The 'out' directory does not exist. Please run 'npm run build' first.");
    }

    const packageJson = require('../package.json');
    // We append a timestamp to the version so every push is a unique version for Capacitor Updater
    const timestamp = Math.floor(Date.now() / 1000);
    const version = `${packageJson.version}-${timestamp}`;

    await createZip();
    const downloadUrl = await uploadToStorage(ZIP_PATH);
    await updateFirestore(downloadUrl, version);

    // Clean up local zip file
    if (fs.existsSync(ZIP_PATH)) {
      fs.unlinkSync(ZIP_PATH);
    }

    console.log("==========================================");
    console.log("🎉 SUCCESS! OTA Update deployed!");
    console.log(`Version: ${version}`);
    console.log(`URL: ${downloadUrl}`);
    console.log("==========================================");

  } catch (error) {
    console.error("Deployment failed:", error);
    process.exit(1);
  }
}

run();
