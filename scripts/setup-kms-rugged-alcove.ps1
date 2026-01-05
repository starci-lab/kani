# ======================================================
# GCP KMS Setup for Kani (rugged-alcove-477616-p5)
# Windows PowerShell
# ======================================================

$ErrorActionPreference = "Stop"

# --------------------------
# Configuration (matches api-keys.json)
# --------------------------

$PROJECT_ID = "rugged-alcove-477616-p5"

# Service Account
$SA_NAME  = "crypto-key-ed-sa"
$SA_EMAIL = "$SA_NAME@$PROJECT_ID.iam.gserviceaccount.com"

# KMS (must match api-keys.json)
$LOCATION  = "global"
$KEYRING   = "kani-key-ring"
$CRYPTOKEY = "kani-crypto-key"

# Output key file
$OUTPUT_DIR = ".\.mount\gcp"
$KEY_FILE   = "$OUTPUT_DIR\crypto-key-ed-sa.json"

Write-Host "==============================================" -ForegroundColor Cyan
Write-Host "GCP KMS Setup for Kani" -ForegroundColor Cyan
Write-Host "Project ID      : $PROJECT_ID"
Write-Host "Service Account : $SA_EMAIL"
Write-Host "Location        : $LOCATION"
Write-Host "KeyRing         : $KEYRING"
Write-Host "CryptoKey       : $CRYPTOKEY"
Write-Host "==============================================" -ForegroundColor Cyan
Write-Host ""

# --------------------------
# 0. Ensure output directory exists
# --------------------------
if (!(Test-Path $OUTPUT_DIR)) {
    New-Item -ItemType Directory -Path $OUTPUT_DIR -Force | Out-Null
}

# --------------------------
# 1. Check Service Account exists
# --------------------------
Write-Host ">>> Checking Service Account..." -ForegroundColor Yellow

$SA_EXISTS = $false
$serviceAccounts = gcloud iam service-accounts list `
    --project=$PROJECT_ID `
    --format="value(email)" 2>$null

if ($serviceAccounts -contains $SA_EMAIL) {
    $SA_EXISTS = $true
    Write-Host "✓ Service Account exists: $SA_EMAIL" -ForegroundColor Green
} else {
    Write-Host "✗ Service Account not found: $SA_EMAIL" -ForegroundColor Red
    Write-Host "  Please create the service account first or check the project ID" -ForegroundColor Red
    exit 1
}

Write-Host ""

# --------------------------
# 2. Get or Create KeyRing
# --------------------------
Write-Host ">>> Checking KMS KeyRing..." -ForegroundColor Yellow

$KEYRING_EXISTS = $false
$keyrings = gcloud kms keyrings list `
    --location=$LOCATION `
    --project=$PROJECT_ID `
    --format="value(name)" 2>$null

foreach ($kr in $keyrings) {
    if ($kr -match "/keyRings/$KEYRING$") {
        $KEYRING_EXISTS = $true
        break
    }
}

if ($KEYRING_EXISTS) {
    Write-Host "✓ KeyRing '$KEYRING' already exists." -ForegroundColor Green
} else {
    Write-Host "Creating KeyRing '$KEYRING'..." -ForegroundColor Yellow

    gcloud kms keyrings create $KEYRING `
        --location=$LOCATION `
        --project=$PROJECT_ID

    Write-Host "✓ KeyRing created." -ForegroundColor Green
}

Write-Host ""

# --------------------------
# 3. Get or Create CryptoKey
# --------------------------
Write-Host ">>> Checking KMS CryptoKey..." -ForegroundColor Yellow

$CRYPTOKEY_EXISTS = $false
$keys = gcloud kms keys list `
    --keyring=$KEYRING `
    --location=$LOCATION `
    --project=$PROJECT_ID `
    --format="value(name)" 2>$null

foreach ($k in $keys) {
    if ($k -match "/cryptoKeys/$CRYPTOKEY$") {
        $CRYPTOKEY_EXISTS = $true
        break
    }
}

if ($CRYPTOKEY_EXISTS) {
    Write-Host "✓ CryptoKey '$CRYPTOKEY' already exists." -ForegroundColor Green
} else {
    Write-Host "Creating CryptoKey '$CRYPTOKEY'..." -ForegroundColor Yellow

    gcloud kms keys create $CRYPTOKEY `
        --location=$LOCATION `
        --keyring=$KEYRING `
        --purpose=encryption `
        --rotation-period=90d `
        --project=$PROJECT_ID

    Write-Host "✓ CryptoKey created." -ForegroundColor Green
}

Write-Host ""

# --------------------------
# 4. Grant KMS Encrypt / Decrypt role
# --------------------------
Write-Host ">>> Granting roles/cloudkms.cryptoKeyEncrypterDecrypter..." -ForegroundColor Yellow

gcloud kms keys add-iam-policy-binding $CRYPTOKEY `
    --location=$LOCATION `
    --keyring=$KEYRING `
    --member="serviceAccount:$SA_EMAIL" `
    --role="roles/cloudkms.cryptoKeyEncrypterDecrypter" `
    --project=$PROJECT_ID

Write-Host "✓ IAM role granted to $SA_EMAIL" -ForegroundColor Green
Write-Host ""

# --------------------------
# 5. Verify setup
# --------------------------
Write-Host ">>> Verifying KMS setup..." -ForegroundColor Yellow

$keyPath = "projects/$PROJECT_ID/locations/$LOCATION/keyRings/$KEYRING/cryptoKeys/$CRYPTOKEY"
Write-Host "Key path:" -ForegroundColor Cyan
Write-Host "  $keyPath" -ForegroundColor White
Write-Host ""

Write-Host "==============================================" -ForegroundColor Green
Write-Host "✓ KMS setup complete!" -ForegroundColor Green
Write-Host "==============================================" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Ensure crypto-key-ed-sa.json exists in .mount/gcp/" -ForegroundColor White
Write-Host "2. Ensure api-keys.json has the correct cryptoKeyName" -ForegroundColor White
Write-Host "3. Run: npm run cli" -ForegroundColor White
Write-Host ""
