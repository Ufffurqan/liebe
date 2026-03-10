#!/bin/bash

# =================================================================
# KALI LINUX OPENCLAW SETUP SCRIPT
# For Liebe AI Assistant Integration
# =================================================================

# Ensure script is run with sudo if needed
if [[ $EUID -ne 0 ]]; then
   echo "This script must be run as root or with sudo"
   exit 1
fi

echo "🚀 Starting Kali Linux Configuration for Liebe AI..."

# 1. Update System
echo "🔄 Updating package lists..."
apt update -y

# 2. Install Essentials
echo "📦 Installing OpenSSH, Node.js repo tools, and network utilities..."
apt install -y curl git build-essential openssh-server net-tools
systemctl enable ssh
systemctl start ssh

# 3. Install Node.js 22
echo "🟢 Installing Node.js 22..."
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt install -y nodejs

# Verify installations
echo "✅ Node version: $(node -v)"
echo "✅ NPM version: $(npm -v)"

# 4. Install OpenClaw Globally
echo "🐉 Installing OpenClaw..."
npm install -g openclaw-gateway

# 5. Get Kali IP
KALI_IP=$(hostname -I | awk '{print $1}')
echo "📍 Your Kali IP is: $KALI_IP"

# 6. Configure OpenClaw
echo "⚙️ Configuring OpenClaw..."
# We will prompt for the Gemini Key when they start it the first time, 
# but we can set up the environment now.

read -p "Enter your Gemini API Key: " GEMINI_KEY

# Create a config directory if it doesn't exist
mkdir -p "$HOME/.openclaw"

# Save configuration
# Note: Adjusting host to 0.0.0.0 so it listens on the network
cat <<EOF > "$HOME/.openclaw/config.yaml"
server:
  host: 0.0.0.0
  port: 9876
  enable_acp: true
  auth_enabled: true

providers:
  gemini:
    api_key: "$GEMINI_KEY"
    model: "gemini-1.5-flash"

tools:
  enabled:
    - nmap
    - ping
    - whois
    - dnsrecon
    - curl
EOF

echo "✨ Configuration saved to $HOME/.openclaw/config.yaml"

# 7. Instructions for Token
echo ""
echo "--------------------------------------------------------"
echo "🎉 SETUP COMPLETED!"
echo "--------------------------------------------------------"
echo "To start the OpenClaw Gateway, run:"
echo "openclaw-gateway start --config $HOME/.openclaw/config.yaml"
echo ""
echo "To generate your API Token for Liebe, run:"
echo "openclaw-gateway token create --name 'LiebeAssistant'"
echo ""
echo "COPY the generated token and paste it into your Windows .env file!"
echo "Kali IP: $KALI_IP"
echo "--------------------------------------------------------"
