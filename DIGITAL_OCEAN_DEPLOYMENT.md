# Complete DigitalOcean Deployment Guide + DuckDNS
## For Beginners: Step-by-Step to Production

---

## Table of Contents
1. [Quick Overview](#quick-overview)
2. [Prerequisites & Setup](#prerequisites--setup)
3. [Part 1: DigitalOcean Account Setup](#part-1-digitalocean-account-setup)
4. [Part 2: Create Your First Droplet](#part-2-create-your-first-droplet)
5. [Part 3: Connect to Your Droplet](#part-3-connect-to-your-droplet)
6. [Part 4: Set Up Your Application](#part-4-set-up-your-application)
7. [Part 5: Deploy with Docker](#part-5-deploy-with-docker)
8. [Part 6: Configure DuckDNS](#part-6-configure-duckdns)
9. [Part 7: Set Up HTTPS (SSL Certificate)](#part-7-set-up-https-ssl-certificate)
10. [Part 8: Final Testing](#part-8-final-testing)
11. [Maintenance & Troubleshooting](#maintenance--troubleshooting)
12. [Where to Go From Here](#where-to-go-from-here)

---

## Quick Overview

### What You're Building
```
Your Computer (Development)
        ↓
    DigitalOcean Droplet (Virtual Server)
        ├─ Frontend App (React/Vite)
        ├─ Backend API (Python)
        └─ Nginx (Web Server)
        ↓
    DuckDNS (Free Domain)
        ↓
    Your Users Access: https://yourname.duckdns.org
```

### What is Each Thing?

**DigitalOcean Droplet**
- A virtual computer in the cloud that runs 24/7
- Like renting a powerful laptop that's always on
- You can SSH (connect) to it and run commands
- Costs money but you have $200 in credits

**DuckDNS**
- Gives you a free domain name (e.g., `myapp.duckdns.org`)
- Normally you'd need to buy a domain for $10+/year
- DuckDNS is free forever
- Points your custom domain to your Droplet's IP address

**Docker**
- Packages your app with all dependencies
- Makes sure it runs the same everywhere
- Think of it like a shipping container for software

**Nginx**
- Web server that receives requests and forwards them to your app
- Handles SSL/HTTPS encryption
- Acts like a receptionist directing traffic

### Timeline
- **Prerequisites**: 5 minutes
- **Account Setup**: 10 minutes
- **Droplet Creation**: 5 minutes
- **Connect & Initial Setup**: 10 minutes
- **Deploy Application**: 15-20 minutes
- **Configure DuckDNS**: 10 minutes
- **Set Up HTTPS**: 10 minutes
- **Total Time**: ~60 minutes (1 hour)

---

## Prerequisites & Setup

### What You Need Before Starting

#### Accounts (Create if You Don't Have)
- [ ] **GitHub Account** - Get your $200 DigitalOcean credits via Student Pack
- [ ] **DigitalOcean Account** - Link with GitHub Student Pack
- [ ] **DuckDNS Account** - Free, takes 2 minutes

#### On Your Computer
- [ ] **Git** - For cloning your code
  - Check: Open terminal and type `git --version`
  - If not installed: https://git-scm.com/downloads

- [ ] **SSH Client** - To connect to your cloud server
  - Mac/Linux: Built-in ✓
  - Windows: Built-in (Windows 10+) or use PuTTY

- [ ] **Terminal Knowledge** - Basic comfort with command line
  - Don't worry if you're new! We'll explain every command

- [ ] **Your Project Code** - Either locally or on GitHub

### Prepare Your Project

```bash
# In your project folder, make sure you have these files:
# (These were already in the Oracle guide)

GEMMA-HACKATHON/
├── docker-compose.yml    (orchestrates your services)
├── nginx.conf            (web server config)
├── .env.production       (settings for production)
├── Dockerfile            (frontend)
├── backend/
│   ├── Dockerfile        (backend)
│   ├── requirements.txt   (Python dependencies)
│   └── main.py          (entry point)
├── frontend/
│   ├── package.json
│   └── vite.config.ts
└── .gitignore           (prevents secrets being uploaded)
```

**If you don't have these files yet**, refer to Part 2 of the DEPLOYMENT_GUIDE.md we created earlier.

---

# Part 1: DigitalOcean Account Setup

## Step 1.1: Get GitHub Student Pack Credits

### What's GitHub Student Pack?
Free credits and tools for students. DigitalOcean gives $200 to use!

### Steps to Get $200 DigitalOcean Credits

1. **Go to Student Pack**
   - Visit: https://education.github.com/pack
   - Click "Sign up"
   - Use your school email or verify you're a student

2. **Find DigitalOcean in the Pack**
   - Scroll down or search for "DigitalOcean"
   - You'll see "$200 in free credits"
   - Click "Get access by joining GitHub Global Campus"

3. **Complete GitHub Verification**
   - Upload proof (student ID, enrollment letter, etc.)
   - Takes 5-15 minutes usually
   - GitHub emails you once approved

4. **Claim DigitalOcean Credit**
   - GitHub shows "ACTIVATE" button once approved
   - Click it
   - You'll be redirected to DigitalOcean

### If You Already Have DigitalOcean
- Great! Just log in and the credits should be there
- Check your billing section to see available balance

**Cost**: $0 (using student credits)  
**Time**: 15-30 minutes (mostly waiting for GitHub approval)

---

## Step 1.2: Create DigitalOcean Account

### Simple Account Creation

1. **Visit DigitalOcean**
   - Go to: https://www.digitalocean.com

2. **Click "Sign Up"**
   - Choose "Sign up with GitHub" (easiest!)
   - Authorize GitHub to access your account

3. **Verify Email**
   - Check your email inbox
   - Click verification link
   - Done!

4. **Set Up Billing** (even though you have credits)
   - Go to Settings → Billing
   - Add a payment method (required, but won't charge while you have credits)
   - This is just a safety net

### Your DigitalOcean Dashboard
```
After login, you see:
┌─────────────────────────────────────┐
│ DigitalOcean Dashboard              │
├─────────────────────────────────────┤
│ Balance: $200.00 (in credits)        │
│ Droplets: 0 (will increase)          │
│ Databases: 0                         │
│ Spaces: 0                            │
└─────────────────────────────────────┘
```

**Time to complete**: ~5 minutes

---

## Step 1.3: Generate SSH Key Pair

### What are SSH Keys?
Secure passwords to log into your cloud computer. Much safer than regular passwords.

### Generate on Your Computer

#### On Mac/Linux/Windows (WSL/Git Bash):

```bash
# Open terminal and run:
ssh-keygen -t rsa -b 4096 -f ~/.ssh/do_droplet

# When asked about passphrase, just press Enter (or set one if you want extra security)
# This creates two files:
# ~/.ssh/do_droplet          (PRIVATE - keep safe!)
# ~/.ssh/do_droplet.pub      (PUBLIC - share with DigitalOcean)

# Make sure private key has right permissions
chmod 600 ~/.ssh/do_droplet

# View your public key (you'll need to copy this)
cat ~/.ssh/do_droplet.pub

# Output looks like:
# ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAACAQC7vx... ubuntu@hostname
```

#### On Windows (if not using WSL/Git Bash):
Use PuTTYgen (GUI tool):
1. Download from: https://www.puttygen.com
2. Run it
3. Click "Generate"
4. Move mouse around for randomness
5. Click "Save Private Key" (save as `.ppk`)
6. Copy the public key text (top box)

**Important**: Never share your private key! Keep it safe.

---

## Step 1.4: Add SSH Key to DigitalOcean

### Why?
So you can log into your Droplet securely without typing passwords.

### Steps

1. **In DigitalOcean Dashboard**
   - Click on your **Account** (top right, person icon)
   - Click **Settings**
   - Click **Security** (in left menu)
   - Click **SSH Keys**

2. **Add New SSH Key**
   - Click "Add SSH Key" button
   - Paste your public key (from `do_droplet.pub`)
   - Give it a name: `My Computer` or `Laptop`
   - Click "Add SSH Key"

3. **Done!**
   - Your key now appears in the list
   - You can use this when creating Droplets

```
SSH Keys in DigitalOcean:
┌────────────────────────────┐
│ My Computer                │
│ Fingerprint: aa:bb:cc:...  │
│ Created: May 7, 2024       │
└────────────────────────────┘
```

**Time to complete**: ~3 minutes

---

# Part 2: Create Your First Droplet

## Step 2.1: Create a Droplet

### What is a Droplet?
A virtual server (like a computer in the cloud) that runs 24/7.

### Navigate to Create Droplet

1. **From Dashboard**, click **"Create"** → **"Droplets"**
2. Or go directly: https://cloud.digitalocean.com/droplets/new

### Choose Operating System

**Select Image:**
```
Choose: Ubuntu
Version: 22.04 x64 (or newer LTS)
```

Why Ubuntu? It's:
- Free and open-source
- Most popular for servers
- Lots of tutorials available
- Works great with Docker

---

## Step 2.2: Choose Size (Droplet Plan)

### Recommended Configuration

```
For GEMMA Hackathon Project:

Size: Basic (Shared CPU)
├─ $4/month (or free with credits!)
├─ 1 GB RAM
├─ 25 GB SSD
└─ 1 vCPU

This is PERFECT for:
✓ Running frontend + backend + database
✓ Starting small and learning
✓ $200 credits = ~50 months free!
```

### How Long Will $200 Last?

```
$4/month × 12 months = $48/year
$200 ÷ $48 = ~4 years (!!)
Or at least 1-2 years with plenty of buffer

As you scale:
- $6/month for 2GB RAM (if needed)
- $12/month for more power
- Still VERY affordable
```

### Select Your Plan
- Click the **$4/month** option (Basic)
- Region should be fine at default (choose closest to you if you want)

---

## Step 2.3: Configure Your Droplet

### Basic Configuration

```
Datacenter Region:
- Choose closest to your location
- (E.g., New York, London, Singapore, Toronto)
- Doesn't matter too much for now

VPC Network:
- Default is fine
- Leave as is

Backups:
- Optional ($1/month)
- For now, skip it
- You can always enable later

IPv6:
- Leave enabled (modern networking)
```

### Add SSH Key

**IMPORTANT: This is how you'll log in**

```
Authentication:
- Select: SSH Keys
- Choose: "My Computer" (the key we added earlier)
- DO NOT choose password (less secure)
```

---

## Step 2.4: Finalize Droplet

```
Hostname: (name your Droplet)
Examples:
  - gemma-hackathon
  - myapp-server
  - prod-droplet-1

Don't use spaces or special characters!

Tags: (optional, helps organize)
  - production
  - gemma
  - hackathon
```

### Create!

1. Click **"Create Droplet"**
2. Wait 30-60 seconds while it boots up
3. You'll see a spinning circle

---

## Step 2.5: After Creation

Once created, you'll see:

```
Droplet Details:
┌────────────────────────────────┐
│ gemma-hackathon                │
│                                │
│ Status: ✓ New                  │
│ IP Address: 123.45.67.89       │  ← SAVE THIS!
│ Memory: 1 GB                   │
│ Storage: 25 GB                 │
│ Backups: Off                   │
└────────────────────────────────┘
```

**Save your IP address somewhere!** You'll need it to connect.

**Time to complete**: ~10 minutes

---

# Part 3: Connect to Your Droplet

## Step 3.1: First Connection via SSH

### What is SSH?
Secure Shell. A way to connect to a remote computer and run commands.

### Connect from Your Computer

#### Mac/Linux/Windows WSL:

```bash
# In your terminal, run:
ssh -i ~/.ssh/do_droplet root@YOUR_DROPLET_IP

# Replace YOUR_DROPLET_IP with actual IP (e.g., 123.45.67.89)

# First time, it asks:
# "Are you sure you want to continue connecting?"
# Type: yes

# You should see:
# root@gemma-hackathon:~#
```

#### Windows (PuTTY):
1. Open PuTTY
2. In "Host Name": `root@YOUR_DROPLET_IP`
3. In left menu: Connection → SSH → Auth
4. Click "Browse" under "Private key file"
5. Select your `.ppk` file
6. Click "Open"

### Your First Command

Once connected, you're in the terminal of your cloud server!

```bash
# Check which computer you're on:
hostname

# Should output: gemma-hackathon

# Check system info:
uname -a

# List what's installed:
ls /home
```

---

## Step 3.2: Update Your System

### Why?
Updates include security patches and bug fixes. Always do this first!

```bash
# Update package list
sudo apt update

# You'll see:
# Reading package lists... Done
# Building dependency tree... Done
# etc.

# Upgrade packages
sudo apt upgrade -y

# This takes 1-2 minutes
# The -y means "yes to all prompts"

# Wait for it to finish...
```

---

## Step 3.3: Create a Non-Root User

### Why?
Running as `root` (administrator) is risky. Create a regular user instead.

```bash
# Create new user (replace 'ubuntu' with your preferred name)
sudo adduser ubuntu

# It asks for password
# Enter a strong password (mix of letters, numbers, symbols)
# Press Enter for other questions (skip them)

# Add user to sudo group (allows running admin commands)
sudo usermod -aG sudo ubuntu

# Switch to new user
su - ubuntu

# You should see:
# ubuntu@gemma-hackathon:~$

# Never needed to type password again (for sudo)
sudo apt install curl

# Verify it worked (no password prompt)
```

---

## Step 3.4: Set Up Basic Security

### Firewall (ufw)

```bash
# Enable firewall
sudo ufw enable

# Open SSH (so you don't get locked out!)
sudo ufw allow 22/tcp

# Open HTTP
sudo ufw allow 80/tcp

# Open HTTPS
sudo ufw allow 443/tcp

# Check status
sudo ufw status

# You should see:
# Status: active
# To                      Action  From
# --                      ------  ----
# 22/tcp                  ALLOW   Anywhere
# 80/tcp                  ALLOW   Anywhere
# 443/tcp                 ALLOW   Anywhere
```

**What Each Port Does:**
- **22**: SSH (your terminal connection)
- **80**: HTTP (regular web traffic)
- **443**: HTTPS (secure web traffic)

---

# Part 4: Set Up Your Application

## Step 4.1: Install Docker

### What's Docker?
Software that packages your app with all its dependencies. Think of it as a standardized shipping container for software.

### Install Docker on Your Droplet

```bash
# Download Docker installation script
curl -fsSL https://get.docker.com -o get-docker.sh

# Run the script
sudo sh get-docker.sh

# Wait for installation to complete...

# Verify installation
docker --version

# You should see:
# Docker version 24.0.0, build abcdef1
```

### Add User to Docker Group

```bash
# Allows running docker without 'sudo' every time
sudo usermod -aG docker ubuntu

# Log out and back in for changes to take effect
exit

# SSH back in
ssh -i ~/.ssh/do_droplet ubuntu@YOUR_DROPLET_IP

# Test it works
docker ps

# Should show:
# CONTAINER ID  IMAGE  COMMAND  CREATED  STATUS  PORTS  NAMES
# (empty because no containers running yet - that's OK!)
```

---

## Step 4.2: Install Docker Compose

### What's Docker Compose?
Lets you run multiple containers (frontend, backend, nginx) together.

```bash
# Download Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose

# Make it executable
sudo chmod +x /usr/local/bin/docker-compose

# Verify installation
docker-compose --version

# You should see:
# Docker Compose version 2.X.X
```

---

## Step 4.3: Install Git

### Why?
To clone (download) your project from GitHub.

```bash
# Install Git
sudo apt install git -y

# Verify
git --version

# You should see:
# git version 2.X.X
```

---

## Step 4.4: Clone Your Project

### Steps

```bash
# Go to home directory
cd ~

# Clone your GitHub repository
git clone https://github.com/YOUR_USERNAME/GEMMA-HACKATHON.git

# Navigate into project
cd GEMMA-HACKATHON

# List files to verify
ls -la

# You should see your docker-compose.yml, etc.
```

### Create Directories for Data

```bash
# Create folders for persistent data
mkdir -p data
mkdir -p certbot/conf
mkdir -p certbot/www
mkdir -p logs

# Set permissions
chmod -R 755 data logs
```

---

# Part 5: Deploy with Docker

## Step 5.1: Review Your Configuration Files

### Check Your Files Are Ready

```bash
# Still in ~/GEMMA-HACKATHON

# Check docker-compose.yml exists
ls -l docker-compose.yml

# Check nginx.conf exists
ls -l nginx.conf

# Check .env.production exists (should not be in git!)
ls -l .env.production

# If any are missing, refer back to DEPLOYMENT_GUIDE.md Part 2
```

---

## Step 5.2: Build Docker Images

### What's Happening?
Docker reads your Dockerfile files and creates images (like blueprints) for your app.

```bash
# Build all services (backend, frontend, nginx)
docker-compose build

# This shows progress:
# [+] Building 1.2s (8/8) FINISHED
# => [backend 1/3] FROM python:3.10-slim
# => [backend 2/3] WORKDIR /app
# ... lots of build output ...

# This takes 5-10 minutes first time
# Docker caches layers, so subsequent builds are faster
```

### Watch for Errors

```bash
# If you see errors like:
# "Error: Could not find Python package"
# Usually means:
# 1. requirements.txt has wrong package name
# 2. Backend Dockerfile has wrong pip syntax

# To debug, check logs:
docker-compose build --progress=plain

# Shows more detail about what's happening
```

---

## Step 5.3: Start Your Application

### Launch All Services

```bash
# Start all containers in background
docker-compose up -d

# The -d means "detached" (runs in background)

# You should see:
# [+] Running 3/3
# ✓ Network gemma-hackathon_default  Created
# ✓ Container gemma-backend           Started
# ✓ Container gemma-frontend          Started  
# ✓ Container nginx                   Started

# Takes 30-60 seconds for containers to fully start
```

### Check Status

```bash
# See all running containers
docker-compose ps

# You should see something like:
# NAME            STATUS
# gemma-backend   Up 2 minutes (healthy)
# gemma-frontend  Up 2 minutes (healthy)
# nginx           Up 1 minute (healthy)

# If any show "Exited" or "Unhealthy", something went wrong
```

---

## Step 5.4: View Logs

### Check for Errors

```bash
# View recent logs
docker-compose logs

# View logs from specific service
docker-compose logs backend

# Follow logs in real-time (Ctrl+C to stop)
docker-compose logs -f frontend

# Shows like:
# gemma-frontend_1 | VITE v4.3.0  ready in 1234 ms
# gemma-frontend_1 | ➜  Local:   http://localhost:3000/
# gemma-backend_1  | INFO: Uvicorn running on 0.0.0.0:8000
```

### Common Issues & Quick Fixes

```bash
# Port already in use?
sudo lsof -i :8000

# Out of memory?
docker stats

# Container keeps restarting?
docker-compose logs container-name

# Fix and rebuild
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

---

## Step 5.5: Test Locally

### Access Via Local Ports

```bash
# From your Droplet (SSH terminal):

# Test backend
curl http://localhost:8000/health

# Test frontend (shows HTML)
curl http://localhost:3000

# Test nginx (reverse proxy)
curl http://localhost

# All should return HTTP 200
```

---

# Part 6: Configure DuckDNS

## Step 6.1: Create DuckDNS Account

### What is DuckDNS?
Free service that maps your IP address to a domain name (e.g., `myapp.duckdns.org`).

### Steps

1. **Visit DuckDNS**
   - Go to: https://www.duckdns.org

2. **Sign In** (use your preferred provider)
   - Google
   - GitHub
   - GitHub + Discord
   - Just pick one

3. **Create Domain**
   - Click the text field
   - Enter subdomain name (e.g., `gemma-app`, `my-hackathon`)
   - Only letters, numbers, hyphens allowed
   - Click "add domain"
   - Your domain becomes: `gemma-app.duckdns.org`

4. **Get Your Token**
   - You see your token (long random string)
   - Save it somewhere safe (like notepad)
   - You'll need this in next step

```
DuckDNS shows you:
┌──────────────────────────────────┐
│ Your domain: gemma-app           │
│ Token: a1b2c3d4e5f6g7h8i9j0k1l   │
│ IP: (empty until we update it)   │
└──────────────────────────────────┘
```

---

## Step 6.2: Update DuckDNS with Your IP

### Method 1: Manual Update (Quick)

```bash
# On your Droplet, get your public IP
curl https://checkip.amazonaws.com

# You should see your IP:
# 123.45.67.89

# Now update DuckDNS in browser:
# Visit in your browser:
https://www.duckdns.org/update?domains=YOUR_DOMAIN&token=YOUR_TOKEN&ip=YOUR_IP

# Replace:
# YOUR_DOMAIN = gemma-app
# YOUR_TOKEN = the token you saved
# YOUR_IP = 123.45.67.89

# Example:
# https://www.duckdns.org/update?domains=gemma-app&token=a1b2c3d4e5f6&ip=123.45.67.89

# Visit that URL in browser
# You should see: OK
```

### Method 2: Automatic Update (Recommended)

**Create a script that updates automatically every 5 minutes.**

```bash
# On your Droplet, create a script file:
cat > ~/update_duckdns.sh << 'EOF'
#!/bin/bash

# Your DuckDNS settings (CHANGE THESE!)
DOMAIN="gemma-app"
TOKEN="a1b2c3d4e5f6g7h8i9j0k1l"
LOG_FILE="/home/ubuntu/duckdns_update.log"

# Get current public IP
IP=$(curl -s https://checkip.amazonaws.com)

# Update DuckDNS
RESPONSE=$(curl -s "https://www.duckdns.org/update?domains=$DOMAIN&token=$TOKEN&ip=$IP")

# Log the result
echo "$(date '+%Y-%m-%d %H:%M:%S'): IP=$IP, Response=$RESPONSE" >> $LOG_FILE

# Print status (optional)
if [[ $RESPONSE == *"OK"* ]]; then
    echo "✓ DuckDNS updated successfully at $(date)"
else
    echo "✗ Update failed: $RESPONSE"
fi
EOF

# Make script executable
chmod +x ~/update_duckdns.sh

# Test it immediately
~/update_duckdns.sh

# Check the log
cat ~/duckdns_update.log

# Should show: IP=123.45.67.89, Response=OK
```

### Set Up Automatic Updates (Every 5 Minutes)

```bash
# Edit crontab (scheduler)
crontab -e

# If it asks which editor, choose nano (simplest)

# Add this line at the end:
*/5 * * * * ~/update_duckdns.sh

# Save: Ctrl+X, then Y, then Enter

# Verify it was added:
crontab -l

# Should show your line at the bottom
```

**What does this do?**
- Runs your script every 5 minutes
- Updates DuckDNS with your current IP
- Even if your IP changes, DuckDNS stays updated!

---

## Step 6.3: Verify DuckDNS

### Test Domain Resolution

```bash
# From your Droplet:
nslookup gemma-app.duckdns.org

# Should show:
# Name: gemma-app.duckdns.org
# Address: 123.45.67.89

# From your local computer, test:
curl http://gemma-app.duckdns.org/health

# Should get a response from your backend
```

---

# Part 7: Set Up HTTPS (SSL Certificate)

## Step 7.1: What's HTTPS?

### Why HTTPS?
```
HTTP:  data sent as plain text (anyone can see passwords!)
HTTPS: data encrypted (secure, safe)
```

Your browser shows a 🔒 lock when using HTTPS. Users expect this!

---

## Step 7.2: Get Free SSL Certificate

### What's Certbot?
A tool that automatically gets free SSL certificates from Let's Encrypt.

### Install Certbot

```bash
# On your Droplet:
sudo apt install certbot -y

# Verify
certbot --version

# Should show:
# certbot 1.x.x
```

### Get Your Certificate

```bash
# Stop Nginx temporarily (so certbot can verify)
docker-compose stop nginx

# Request certificate (replace with your domain!)
sudo certbot certonly --standalone \
  -d gemma-app.duckdns.org \
  --agree-tos \
  -n \
  -m your-email@example.com

# Certbot shows:
# Successfully received certificate.
# Certificate is saved at:
#   /etc/letsencrypt/live/gemma-app.duckdns.org/fullchain.pem
# Key is saved at:
#   /etc/letsencrypt/live/gemma-app.duckdns.org/privkey.pem

# Restart Nginx
docker-compose start nginx
```

### Verify Certificate

```bash
# Check certificate details
sudo openssl x509 -in /etc/letsencrypt/live/gemma-app.duckdns.org/fullchain.pem -text -noout

# Check expiration date
sudo openssl x509 -in /etc/letsencrypt/live/gemma-app.duckdns.org/fullchain.pem -dates -noout

# Should show:
# notBefore=May  7 10:00:00 2024 GMT
# notAfter=Aug  5 10:00:00 2024 GMT (90 days from now)
```

---

## Step 7.3: Update Nginx to Use Certificate

### Edit nginx.conf

```bash
# On your Droplet, edit nginx.conf:
nano ~/GEMMA-HACKATHON/nginx.conf

# Find these lines (near bottom):
# ssl_certificate /etc/letsencrypt/live/yourname.duckdns.org/fullchain.pem;
# ssl_certificate_key /etc/letsencrypt/live/yourname.duckdns.org/privkey.pem;

# Replace yourname with your actual domain:
# ssl_certificate /etc/letsencrypt/live/gemma-app.duckdns.org/fullchain.pem;
# ssl_certificate_key /etc/letsencrypt/live/gemma-app.duckdns.org/privkey.pem;

# Find this line:
# server_name _;

# Change to (optional but recommended):
# server_name gemma-app.duckdns.org;

# Save: Ctrl+X, then Y, then Enter
```

### Restart Nginx

```bash
# Reload with new configuration
docker-compose restart nginx

# Check logs for errors
docker-compose logs nginx

# Should show nginx starting without errors
```

---

## Step 7.4: Set Up Automatic Certificate Renewal

### Why?
SSL certificates expire after 90 days. We want to auto-renew!

```bash
# Edit crontab
crontab -e

# Find the line you added earlier (DuckDNS update)
# Add a second line for certificate renewal:

*/5 * * * * ~/update_duckdns.sh
0 2 * * * sudo certbot renew --quiet && docker-compose -f ~/GEMMA-HACKATHON/docker-compose.yml restart nginx

# This:
# - Runs daily at 2 AM
# - Renews certificate if needed (doesn't do anything if not expiring)
# - Restarts Nginx to load new certificate

# Save: Ctrl+X, Y, Enter

# Verify:
crontab -l
```

---

# Part 8: Final Testing

## Step 8.1: Access Your Application

### Via Browser

1. Open browser on your **local computer** (not the Droplet)
2. Visit: `https://gemma-app.duckdns.org` (use YOUR domain!)
3. You should see your React app!
4. Check the URL bar - you should see 🔒 lock icon (HTTPS)

### What if it shows certificate error?
```
Options:
1. Wait 5-10 minutes for DNS propagation
2. Hard refresh: Ctrl+Shift+R (or Cmd+Shift+R on Mac)
3. Try in incognito/private mode
4. Check logs: docker-compose logs nginx
```

---

## Step 8.2: Test API Endpoints

### From Your Computer Terminal

```bash
# Test backend health endpoint
curl https://gemma-app.duckdns.org/api/health

# Should get response like:
# {"status": "ok"}

# Get data (example)
curl https://gemma-app.duckdns.org/api/data

# Create new item (example)
curl -X POST https://gemma-app.duckdns.org/api/data \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Item"}'
```

---

## Step 8.3: Check Performance

### Response Times

```bash
# Time a request
time curl -o /dev/null -s https://gemma-app.duckdns.org

# Shows something like:
# real    0m0.456s
# user    0m0.045s
# sys     0m0.034s
```

### Container Resource Usage

```bash
# On your Droplet, check CPU/Memory
docker stats

# Shows for each container:
# NAME       CPU %   MEM USAGE / LIMIT
# backend    0.5%    150M / 1G
# frontend   0.2%    100M / 1G
# nginx      0.1%    50M / 1G

# Press Ctrl+C to exit
```

### Check Disk Space

```bash
# See how much disk you're using
df -h

# Shows something like:
# Filesystem    Size  Used  Avail  Use%
# /dev/vda      25G   3.2G  21.8G  13%

# You have plenty of space!
```

---

## Step 8.4: Monitor Application

### View Live Logs

```bash
# Follow logs in real-time (shows new messages as they happen)
docker-compose logs -f

# Press Ctrl+C to stop following

# Follow just backend errors:
docker-compose logs -f backend | grep ERROR

# Follow just frontend requests:
docker-compose logs -f nginx | grep GET
```

### Application Health

```bash
# Run health check manually
docker-compose ps

# All containers should show:
# STATUS: Up X minutes (healthy)

# If any show "Unhealthy" or "Exited":
# 1. Check logs: docker-compose logs container-name
# 2. Restart: docker-compose restart container-name
# 3. Full restart if needed: docker-compose restart
```

---

# Maintenance & Troubleshooting

## Regular Maintenance Tasks

### Daily (Automated)
✓ DuckDNS updates IP (cron job)  
✓ Certificate renewal check (cron job)  
✓ Application monitoring

### Weekly

```bash
# SSH into Droplet
ssh -i ~/.ssh/do_droplet ubuntu@YOUR_DROPLET_IP

# Check for available updates
sudo apt update
sudo apt list --upgradable

# Review application logs
docker-compose logs backend | tail -50
docker-compose logs frontend | tail -50

# Check disk space
df -h
```

### Monthly

```bash
# Update Ubuntu packages
sudo apt upgrade -y

# Prune unused Docker images/containers
docker system prune -a

# Backup your database (if using local database)
docker-compose exec backend cp data/data.db data/data.db.backup

# Download backup to your computer
scp -i ~/.ssh/do_droplet ubuntu@YOUR_DROPLET_IP:~/GEMMA-HACKATHON/data/data.db.backup ~/backups/
```

---

## Troubleshooting Guide

### Problem 1: "Connection refused" when accessing domain

**Possible Causes & Solutions:**

```bash
# 1. Check if containers are running
docker-compose ps

# 2. If not running, start them
docker-compose up -d

# 3. Check if Nginx is listening on port 80/443
sudo netstat -tuln | grep -E ':80|:443'

# 4. If not, restart Nginx
docker-compose restart nginx

# 5. Check Nginx logs
docker-compose logs nginx

# 6. Check firewall
sudo ufw status

# Should show port 80 and 443 are ALLOW
```

### Problem 2: Domain still showing "certificate error"

**Solutions:**

```bash
# 1. Check certificate exists
sudo ls -la /etc/letsencrypt/live/gemma-app.duckdns.org/

# 2. Check certificate is valid
sudo openssl x509 -dates -noout -in /etc/letsencrypt/live/gemma-app.duckdns.org/fullchain.pem

# 3. Force certificate renewal
sudo certbot renew --force-renewal

# 4. Restart Nginx
docker-compose restart nginx

# 5. Wait 5-10 minutes and try again
# (Browser might be caching old certificate)
```

### Problem 3: Backend API returns errors

**Debug Steps:**

```bash
# 1. Check backend logs for errors
docker-compose logs backend

# 2. Look for specific error messages
# Common issues:
# - Database connection error → check database file exists
# - Port already in use → something else using port 8000
# - Memory error → increase Droplet size

# 3. Restart backend
docker-compose restart backend

# 4. Check if backend is healthy
curl http://localhost:8000/health

# 5. Test from within container
docker-compose exec backend bash
# Now you're inside the container, try running tests
python main.py
```

### Problem 4: Application running slow

**Performance Troubleshooting:**

```bash
# 1. Check resource usage
docker stats

# If CPU/Memory near 100%, need bigger Droplet:
# In DigitalOcean dashboard → Resize Droplet

# 2. Check disk space
df -h

# If almost full, clean up:
docker system prune -a
rm -rf ~/old-backups/*

# 3. Check network latency
ping 8.8.8.8

# 4. Monitor in real-time
watch -n 1 docker stats
```

### Problem 5: SSH Connection Problems

**Solutions:**

```bash
# 1. Check SSH key permissions (on your computer)
chmod 600 ~/.ssh/do_droplet

# 2. Verify key is correct
ssh -i ~/.ssh/do_droplet ubuntu@YOUR_DROPLET_IP -v

# Shows detailed connection process

# 3. If "Permission denied":
# - Check you're using ubuntu user, not root
# - Droplet might still be booting (wait 2-3 min)
# - Try different SSH key

# 4. If "Connection refused":
# - Droplet IP might be wrong (verify in dashboard)
# - SSH port (22) might be blocked by firewall
# Check: sudo ufw status
```

---

## Getting Help

### DigitalOcean Resources
- **Dashboard Help**: Click the ? icon (top right)
- **Community Tutorials**: https://www.digitalocean.com/community/tutorials
- **Documentation**: https://docs.digitalocean.com
- **Status Page**: https://status.digitalocean.com (if having issues)

### Docker Resources
- **Official Docs**: https://docs.docker.com
- **Docker Compose Docs**: https://docs.docker.com/compose

### DuckDNS
- **Help**: https://www.duckdns.org/faqs.jsp
- **Support Forum**: GitHub issues

### Stack Overflow
- Tag questions with: `digitalocean`, `docker`, `nginx`
- Be specific about errors
- Include logs and commands you ran

---

# Where to Go From Here

## Next Steps After Deployment

### 1. **Monitor Your Application** (Week 1)
```bash
# Set up alerts
# Check logs regularly
# Monitor resource usage
# Test API endpoints
```

### 2. **Optimize Performance** (Week 2-3)
- Enable caching
- Optimize database queries
- Compress images
- Use CDN for static files

### 3. **Improve Security** (Ongoing)
- Set up automated backups
- Enable monitoring
- Regular security updates
- Rotate secrets/keys

### 4. **Scale Up** (As Needed)
```
Current: $4/month (1GB RAM)
Growth options:
  $6/month (1GB RAM, better CPU)
  $12/month (2GB RAM)
  $24/month (4GB RAM)
  Or switch to App Platform (managed service)
```

### 5. **Add More Features**
- Database (PostgreSQL, MongoDB)
- Cache layer (Redis)
- Job queue (Celery)
- File storage (DigitalOcean Spaces)

---

## Moving Beyond This Guide

### Learn More About:

**Container & Orchestration:**
- Docker networking
- Docker volumes (persistent data)
- Docker security best practices
- Kubernetes (advanced, when scaling further)

**Web Servers:**
- Nginx caching strategies
- Load balancing
- Rate limiting
- Reverse proxy patterns

**DevOps & Deployment:**
- CI/CD pipelines (GitHub Actions, GitLab CI)
- Infrastructure as Code (Terraform, CloudFormation)
- Container registries (Docker Hub, GitHub Container Registry)
- Monitoring tools (Prometheus, Grafana)

**Cloud Services:**
- Databases (managed PostgreSQL, MongoDB)
- CDN (CloudFlare, DigitalOcean CDN)
- Email services
- Object storage

---

## Keeping Your Costs Down

### Free Tier Lifetime:
```
$200 credits ÷ $4/month = 50 months!
Probably 2+ years before needing to pay

Tips to reduce costs:
1. Keep only what you need running
2. Delete unused Droplets
3. Remove old backups
4. Monitor storage usage
5. Upgrade only when necessary
```

### When You Might Need to Pay:
```
After free credits end:
- Basic Droplet: $4-5/month
- With PostgreSQL: +$15/month
- With CDN: +$0.01-0.10 per GB
- Total: $20-30/month for solid setup

Compare to traditional hosting:
- Shared hosting: $5-10/month (limited)
- VPS: $10-20/month (similar to above)
- Managed platforms: $50+/month

DigitalOcean is very affordable!
```

---

## Troubleshooting Checklist

Before panicking, try these in order:

- [ ] Check if Droplet is running in dashboard
- [ ] `docker-compose ps` - containers running?
- [ ] `docker-compose logs` - any error messages?
- [ ] `docker-compose restart` - restart everything
- [ ] SSH connection working?
- [ ] Firewall rules allow ports 80/443?
- [ ] Domain resolving? `nslookup gemma-app.duckdns.org`
- [ ] Certificate valid? `sudo certbot certificates`
- [ ] Disk space available? `df -h`
- [ ] Memory available? `docker stats`

---

## Quick Reference Commands

### Most Used Commands

```bash
# Check everything
docker-compose ps

# View logs (add -f for real-time)
docker-compose logs [container-name]

# Restart everything
docker-compose restart

# Stop everything
docker-compose down

# Start everything
docker-compose up -d

# Connect to Droplet
ssh -i ~/.ssh/do_droplet ubuntu@YOUR_DROPLET_IP

# Pull latest code
cd ~/GEMMA-HACKATHON
git pull origin main
docker-compose build
docker-compose up -d

# Check resource usage
docker stats

# SSH directly into container
docker-compose exec backend bash
```

---

## Success Indicators ✓

Your deployment is successful when:

- ✓ Can access `https://your-domain.duckdns.org` from browser
- ✓ URL bar shows 🔒 lock (HTTPS)
- ✓ React frontend loads and displays
- ✓ API endpoints respond (test with curl)
- ✓ `docker-compose ps` shows all containers healthy
- ✓ DuckDNS domain resolves correctly
- ✓ Can SSH into Droplet without issues
- ✓ Certificate is valid (not expired)

**Congratulations! Your app is live! 🚀**

---

## Final Tips for Beginners

### Learning Path:
1. Get this deployment working (you are here!)
2. Understand each service (frontend, backend, nginx)
3. Learn to debug using logs
4. Explore Docker Compose more deeply
5. Try adding a database
6. Learn CI/CD for auto-deployment
7. Move to container orchestration

### Mindset:
- It's normal to encounter issues - that's how you learn!
- Always check logs first - they tell you what's wrong
- Google the error message - someone else had it before
- Take notes when you fix something - helps next time
- Start small, then scale

### Common Beginner Mistakes to Avoid:
❌ Not backing up database  
❌ Forgetting to update packages  
❌ Running everything as root  
❌ Not checking logs when something fails  
❌ Not using version control (Git)  
❌ Hardcoding secrets in code  

### Best Practices to Adopt:
✓ Always use SSH keys (not passwords)  
✓ Keep backups of important data  
✓ Monitor resource usage  
✓ Stay updated with security patches  
✓ Use environment variables for secrets  
✓ Test changes locally first  
✓ Keep a running log of what you did  

---

## Document Information

**Version**: 1.0  
**Created**: May 2024  
**For**: Beginners deploying with DigitalOcean  
**Project**: GEMMA Hackathon Application  
**Difficulty Level**: Beginner-Friendly  

### What Makes This Different:
✓ Written specifically for beginners  
✓ Explains WHY, not just HOW  
✓ Includes lots of example outputs  
✓ Common issues with solutions  
✓ Step-by-step with timing estimates  
✓ Architecture diagrams  
✓ Maintenance schedule  

---

## You Did It! 🎉

You've successfully:
1. Created a DigitalOcean Droplet
2. Installed Docker & Docker Compose
3. Deployed a multi-tier application
4. Set up a custom domain with DuckDNS
5. Secured it with HTTPS
6. Configured automatic updates

This is a solid foundation for any web application. You can now:
- Add more features
- Scale up as needed
- Learn DevOps best practices
- Impress people with your live application!

**Your app is now running 24/7 on the internet. Well done!**

---

## Additional Help

- **Need to update your app?** Go to Step 4.4, `git pull`, rebuild, restart
- **Want to add a database?** Ask about "DigitalOcean Managed Database"
- **Having SSL issues?** Run `sudo certbot certificates` to debug
- **App crashing?** Check `docker-compose logs` first
- **Forgot your Droplet IP?** Check DigitalOcean dashboard

**Happy deploying! 🚀**
