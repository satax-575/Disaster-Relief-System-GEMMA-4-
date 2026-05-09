# Complete Deployment Guide: Oracle Cloud + DuckDNS

## Table of Contents
1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Part 1: Oracle Cloud Setup](#part-1-oracle-cloud-setup)
4. [Part 2: Prepare Your Application](#part-2-prepare-your-application)
5. [Part 3: Deploy to Oracle Cloud](#part-3-deploy-to-oracle-cloud)
6. [Part 4: Configure DuckDNS](#part-4-configure-duckdns)
7. [Part 5: Connect Everything](#part-5-connect-everything)
8. [Part 6: SSL/TLS Configuration](#part-6-ssltls-configuration)
9. [Part 7: Testing & Verification](#part-7-testing--verification)
10. [Troubleshooting](#troubleshooting)

---

## Overview

This guide walks you through deploying the GEMMA Hackathon application using:
- **Oracle Cloud Infrastructure (OCI)** - for hosting your application
- **DuckDNS** - for dynamic DNS management (free and easy to set up)

### What You'll Achieve
✓ Deploy both frontend and backend to Oracle Cloud  
✓ Set up a free domain with DuckDNS  
✓ Configure SSL/TLS certificates  
✓ Access your application via custom domain name  
✓ Monitor and maintain your deployment  

### Architecture Overview
```
┌─────────────────────┐
│   Your Computer     │
│   (Development)     │
└──────────┬──────────┘
           │
           │ Push to OCI
           ▼
┌─────────────────────────────────┐
│   Oracle Cloud Instance         │
│  ┌───────────────────────────┐  │
│  │ Frontend (React/Vite)     │  │
│  │ Port: 3000                │  │
│  └───────────────────────────┘  │
│  ┌───────────────────────────┐  │
│  │ Backend (Python/Flask)    │  │
│  │ Port: 8000                │  │
│  └───────────────────────────┘  │
│  ┌───────────────────────────┐  │
│  │ Nginx (Reverse Proxy)     │  │
│  │ Port: 80, 443             │  │
│  └───────────────────────────┘  │
└──────────┬──────────────────────┘
           │
           │ DNS Resolution
           ▼
┌─────────────────────┐
│   DuckDNS           │
│ yourname.duckdns.org│
└─────────────────────┘
```

---

## Prerequisites

Before starting, ensure you have:

### 1. **Accounts & Services**
- [ ] Oracle Cloud account (free tier available at https://oracle.com/cloud/free)
- [ ] DuckDNS account (free at https://www.duckdns.org)
- [ ] GitHub account (for version control)
- [ ] SSH key pair (for secure connection to your VM)

### 2. **Local Tools**
- [ ] Git installed
- [ ] SSH client (built-in on Mac/Linux, use PuTTY or WSL on Windows)
- [ ] Docker Desktop (optional, but recommended)
- [ ] Terminal/Command Prompt
- [ ] Text editor (VS Code, Sublime, etc.)

### 3. **Project Knowledge**
- [ ] Familiarity with command line/terminal
- [ ] Basic understanding of Docker (helpful but not required)
- [ ] Access to your project's source code
- [ ] Port numbers your app uses (frontend: 3000, backend: 8000)

### 4. **Network Requirements**
- [ ] Stable internet connection
- [ ] Access to required ports (22 for SSH, 80/443 for HTTP/HTTPS)
- [ ] No firewall blocking outbound connections

---

# Part 1: Oracle Cloud Setup

## Step 1.1: Create Oracle Cloud Account

### What is Oracle Cloud?
Oracle Cloud Infrastructure (OCI) is a cloud computing platform that offers:
- **Free Tier**: Includes 2 ARM-based Ampere instances (great for hosting apps)
- **Compute Power**: Suitable for running Docker containers
- **24/7 Availability**: Your app runs continuously
- **Global Network**: Multiple data centers worldwide

### Create Account
1. Navigate to https://oracle.com/cloud/free
2. Click **"Start for free"**
3. Fill in your details:
   - Email address
   - Country
   - Company name (optional)
4. Complete verification via email
5. Set up your password and security questions
6. Accept terms and conditions
7. Your account is created!

**Time to complete**: ~15 minutes  
**Cost**: $0 for free tier  

---

## Step 1.2: Set Up SSH Key Pair

### Why SSH Keys?
SSH keys allow secure, password-less access to your VM. They're more secure than passwords.

### Generate SSH Key Pair

#### On Mac/Linux:
```bash
# Generate SSH key pair
ssh-keygen -t rsa -b 4096 -f ~/.ssh/oracle_cloud

# Press Enter when asked for passphrase (or set one if you prefer)
# This creates:
# - ~/.ssh/oracle_cloud (private key - KEEP SAFE)
# - ~/.ssh/oracle_cloud.pub (public key - upload to OCI)
```

#### On Windows (using Git Bash or WSL):
```bash
# Same command as Mac/Linux
ssh-keygen -t rsa -b 4096 -f oracle_cloud

# Files created in current directory:
# - oracle_cloud (private key)
# - oracle_cloud.pub (public key)
```

#### Using PuTTY (Windows GUI):
1. Download PuTTYgen from https://www.puttygen.com
2. Run PuTTYgen
3. Click **"Generate"** (move mouse around for randomness)
4. Click **"Save private key"** and save as `oracle_cloud.ppk`
5. Copy the public key (top text area) for later

**Important**: Never share your private key!

---

## Step 1.3: Create Compute Instance

### What is a Compute Instance?
A virtual machine that will run your application. Think of it as a computer in the cloud.

### Steps to Create Instance

1. **Log into Oracle Cloud Console**
   - Go to https://console.oracle.com
   - Enter your Cloud Tenant Name, Username, and Password

2. **Navigate to Compute**
   - Click menu (☰) → Compute → Instances
   - Click **"Create Instance"**

3. **Configure Instance**

   **Image Selection:**
   ```
   Image: Ubuntu 22.04 (or latest LTS)
   Shape: Ampere (Free Tier Eligible)
   Instance Type: Virtual Machine
   ```

   **Network Configuration:**
   ```
   Virtual Cloud Network: Default (or create new)
   Subnet: Default Public Subnet
   Assign Public IP: YES (important!)
   ```

   **SSH Key Selection:**
   ```
   SSH Key: Paste your public key (oracle_cloud.pub)
   - Open oracle_cloud.pub file
   - Copy entire contents
   - Paste into "SSH Key" field
   ```

   **Storage:**
   ```
   Boot Volume Size: 50 GB (free tier)
   ```

4. **Review & Create**
   - Review all settings
   - Click **"Create"**
   - Wait for instance to start (2-3 minutes)

### After Creation
Once created, note these details:
```
Public IP Address:    xxx.xxx.xxx.xxx  (save this!)
Instance ID:          ocid1.instance...
Availability Domain:  [your-region]
```

**Time to complete**: ~10 minutes  
**Estimated Monthly Cost**: $0 (free tier)

---

## Step 1.4: Connect to Your Instance

### Why Connect?
You need shell access to install software and configure your application.

### Connect via SSH

#### Mac/Linux/WSL:
```bash
# Connect to your instance
ssh -i ~/.ssh/oracle_cloud ubuntu@YOUR_PUBLIC_IP

# Replace YOUR_PUBLIC_IP with actual IP (e.g., 129.154.123.45)
# Answer "yes" if asked about authenticity

# You should see:
# ubuntu@instance-name:~$
```

#### Windows (PuTTY):
1. Open PuTTY
2. In "Host Name", enter: `ubuntu@YOUR_PUBLIC_IP`
3. Go to Connection → SSH → Auth
4. Click "Browse" under "Private key file"
5. Select your `oracle_cloud.ppk` file
6. Click "Open"
7. You're now connected!

### First Commands to Run
Once connected, update your system:
```bash
# Update package list
sudo apt update

# Upgrade installed packages
sudo apt upgrade -y

# Output should show "Reading package lists... Done"
```

**Time to complete**: ~5 minutes

---

## Step 1.5: Configure Security Rules

### What are Security Rules?
Rules that control which network traffic can reach your instance. Essential for security.

### Add Security Rules

1. **In Oracle Cloud Console**
   - Go to Compute → Instances
   - Click your instance name

2. **Find Virtual Cloud Network (VCN)**
   - Under "Primary VNIC", click the VCN link
   - Click on the Subnet
   - Click Security List

3. **Add Ingress Rules**
   - Click "Add Ingress Rules"
   - Add these rules:

   **Rule 1: SSH (for management)**
   ```
   Protocol: TCP
   Source CIDR: 0.0.0.0/0
   Destination Port Range: 22
   Description: SSH Access
   ```

   **Rule 2: HTTP (web traffic)**
   ```
   Protocol: TCP
   Source CIDR: 0.0.0.0/0
   Destination Port Range: 80
   Description: HTTP Traffic
   ```

   **Rule 3: HTTPS (secure web traffic)**
   ```
   Protocol: TCP
   Source CIDR: 0.0.0.0/0
   Destination Port Range: 443
   Description: HTTPS Traffic
   ```

   **Rule 4: Backend API (optional, if direct access needed)**
   ```
   Protocol: TCP
   Source CIDR: 0.0.0.0/0
   Destination Port Range: 8000
   Description: Backend API
   ```

4. **Click "Add Ingress Rules"**

**Security Note**: Port 80/443 are safe to open (web traffic). Port 22 (SSH) should ideally be restricted to your IP only.

---

# Part 2: Prepare Your Application

## Step 2.1: Optimize Docker Configuration

### What is Docker?
Docker packages your application with all dependencies. Makes deployment consistent and easy.

### Review Your Dockerfile

Check your existing Dockerfile:

```dockerfile
# frontend/Dockerfile (for React app)
FROM node:18-alpine
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install
COPY . .
RUN pnpm build
EXPOSE 3000
CMD ["pnpm", "preview"]
```

```dockerfile
# backend/Dockerfile (for Python app)
FROM python:3.10-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 8000
CMD ["python", "main.py"]
```

### Create docker-compose.yml (if not exists)

This file orchestrates running both frontend and backend:

```yaml
version: '3.8'

services:
  backend:
    build: ./backend
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=sqlite:///data.db
      - FLASK_ENV=production
    volumes:
      - ./backend/data:/app/data
    restart: always
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    depends_on:
      - backend
    environment:
      - VITE_API_URL=http://localhost:8000
    restart: always
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000"]
      interval: 30s
      timeout: 10s
      retries: 3

  nginx:
    image: nginx:latest
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./certbot/conf:/etc/letsencrypt:ro
      - ./certbot/www:/var/www/certbot:ro
    depends_on:
      - frontend
      - backend
    restart: always
```

**Key Points**:
- `restart: always` - restarts containers if they crash
- `healthcheck` - monitors if services are running
- `depends_on` - ensures services start in right order
- Ports mapped for access

---

## Step 2.2: Create Environment Configuration

### What is Environment Configuration?
Settings that change between development and production. Keeps secrets safe.

### Create .env.production file

Create a file in your project root:

```bash
# .env.production (add to .gitignore)

# Backend Configuration
FLASK_ENV=production
DATABASE_URL=sqlite:////data/data.db
DEBUG=False
SECRET_KEY=your-secret-key-here-change-this

# API Configuration
API_HOST=0.0.0.0
API_PORT=8000
API_WORKERS=4

# Frontend Configuration
VITE_API_URL=https://yourname.duckdns.org/api
VITE_ENVIRONMENT=production

# Firebase (if using)
FIREBASE_API_KEY=your-firebase-key
FIREBASE_PROJECT_ID=your-project-id

# Additional Settings
LOG_LEVEL=info
MAX_UPLOAD_SIZE=10485760
```

### Create nginx.conf

Create reverse proxy configuration:

```nginx
# nginx.conf

user nginx;
worker_processes auto;
error_log /var/log/nginx/error.log warn;
pid /var/run/nginx.pid;

events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';

    access_log /var/log/nginx/access.log main;

    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    client_max_body_size 20M;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=general_limit:10m rate=30r/s;

    upstream frontend {
        server frontend:3000;
    }

    upstream backend {
        server backend:8000;
    }

    # HTTP to HTTPS redirect
    server {
        listen 80;
        server_name _;

        location /.well-known/acme-challenge/ {
            root /var/www/certbot;
        }

        location / {
            return 301 https://$host$request_uri;
        }
    }

    # HTTPS Server
    server {
        listen 443 ssl http2;
        server_name _;

        # SSL Certificates (will be added by certbot)
        ssl_certificate /etc/letsencrypt/live/yourname.duckdns.org/fullchain.pem;
        ssl_certificate_key /etc/letsencrypt/live/yourname.duckdns.org/privkey.pem;

        # SSL Security Headers
        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-XSS-Protection "1; mode=block" always;

        # Frontend
        location / {
            proxy_pass http://frontend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_cache_bypass $http_upgrade;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;

            limit_req zone=general_limit burst=50 nodelay;
        }

        # Backend API
        location /api/ {
            proxy_pass http://backend/;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;

            # Timeouts for long-running requests
            proxy_connect_timeout 60s;
            proxy_send_timeout 60s;
            proxy_read_timeout 60s;

            limit_req zone=api_limit burst=20 nodelay;
        }

        # Health check endpoint
        location /health {
            access_log off;
            return 200 "healthy\n";
            add_header Content-Type text/plain;
        }
    }
}
```

### Create .dockerignore

Optimize Docker build size:

```
.git
.gitignore
node_modules
npm-debug.log
.env
.env.local
.DS_Store
*.md
Dockerfile*
docker-compose.yml
.next
.venv
__pycache__
*.pyc
.pytest_cache
```

---

## Step 2.3: Test Locally

### Why Test Locally?
Catching issues locally is faster and cheaper than debugging in the cloud.

### Build and Run Docker Containers

```bash
# Navigate to project root
cd ~/path/to/GEMMA-HACKATHON

# Build Docker images
docker-compose build

# Run containers
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f

# Stop containers
docker-compose down
```

### Test Endpoints

```bash
# Test frontend (in browser or curl)
curl -I http://localhost:3000

# Test backend
curl http://localhost:8000/health

# Test API endpoint
curl http://localhost:8000/api/status
```

**Expected Output**:
```
Frontend: HTTP 200 (shows React app)
Backend: HTTP 200 (returns "healthy" or similar)
```

---

# Part 3: Deploy to Oracle Cloud

## Step 3.1: Push Code to GitHub

### Why GitHub?
Cloud servers pull code from GitHub directly. Easier to update and manage.

### Initialize Repository (if not already)

```bash
# Initialize git repository
git init

# Add remote (replace with your repo)
git remote add origin https://github.com/yourusername/GEMMA-HACKATHON.git

# Add all files
git add .

# Commit
git commit -m "Initial commit - deployment ready"

# Push to GitHub
git branch -M main
git push -u origin main
```

### Create .gitignore

Ensure sensitive files aren't committed:

```
# Environment
.env
.env.local
.env.*.local

# Node modules
node_modules/
pnpm-lock.yaml.~

# Python
__pycache__/
*.pyc
*.pyo
.Python
venv/
env/
.venv

# IDE
.vscode/
.idea/
*.swp
*.swo

# Build outputs
dist/
build/
*.egg-info/

# OS
.DS_Store
Thumbs.db

# Logs
*.log
logs/

# Database
*.db
*.sqlite
```

---

## Step 3.2: Install Docker and Docker Compose on Oracle Instance

### Connect to Your Instance

```bash
# SSH into your instance (from local machine)
ssh -i ~/.ssh/oracle_cloud ubuntu@YOUR_PUBLIC_IP
```

### Install Docker

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add ubuntu user to docker group
sudo usermod -aG docker ubuntu

# Log out and back in for group membership to take effect
exit

# SSH back in
ssh -i ~/.ssh/oracle_cloud ubuntu@YOUR_PUBLIC_IP

# Verify Docker installation
docker --version
# Output: Docker version X.X.X, build XXXXX
```

### Install Docker Compose

```bash
# Download Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose

# Make executable
sudo chmod +x /usr/local/bin/docker-compose

# Verify installation
docker-compose --version
# Output: Docker Compose version X.X.X
```

---

## Step 3.3: Clone Your Repository

### Clone to Cloud Instance

```bash
# Navigate to home directory
cd ~

# Clone your repository
git clone https://github.com/yourusername/GEMMA-HACKATHON.git

# Navigate to project
cd GEMMA-HACKATHON

# List files to verify
ls -la
```

### Create Data Directories

```bash
# Create directories for persistent data
mkdir -p data
mkdir -p certbot/conf
mkdir -p certbot/www

# Set permissions
chmod -R 755 data/
chmod -R 755 certbot/
```

---

## Step 3.4: Build and Run Containers

### Build Docker Images

```bash
# Navigate to project directory
cd ~/GEMMA-HACKATHON

# Build all services
docker-compose build

# This may take 5-10 minutes depending on your backend dependencies
# You'll see progress for each layer
```

### Start Services

```bash
# Start all services in background
docker-compose up -d

# Check status
docker-compose ps

# Expected output:
# NAME                COMMAND              STATUS
# gemma-backend       python main.py       Up 2 minutes (healthy)
# gemma-frontend      pnpm preview         Up 2 minutes (healthy)
# nginx               nginx -g daemon off  Up 1 minute (healthy)
```

### Monitor Logs

```bash
# View all logs
docker-compose logs

# View specific service logs
docker-compose logs backend

# Follow logs in real-time (Ctrl+C to stop)
docker-compose logs -f frontend

# View last 50 lines
docker-compose logs --tail=50
```

**Troubleshooting Build Issues**:

```bash
# If build fails, check for errors
docker-compose build --no-cache

# View detailed build output
docker-compose build --progress=plain

# Check individual container logs
docker logs container-name

# If port is already in use
sudo lsof -i :8000  # Check what's using the port
```

---

## Step 3.5: Verify Deployment

### Check Services

```bash
# Check if containers are running
docker ps

# Check if ports are listening
sudo netstat -tuln | grep LISTEN

# Test backend
curl http://localhost:8000/health

# Test frontend
curl -I http://localhost:3000

# Test via public IP
curl http://YOUR_PUBLIC_IP/health
```

### View Web Application

1. Open your browser
2. Navigate to: `http://YOUR_PUBLIC_IP`
3. You should see your frontend application!

---

# Part 4: Configure DuckDNS

## Step 4.1: Create DuckDNS Account

### What is DuckDNS?
A free dynamic DNS service that maps your public IP to a human-readable domain name.

### Create Account

1. Go to https://www.duckdns.org
2. Click **"Sign In"** (or use a login provider: Google, GitHub, etc.)
3. Choose a subdomain name (this becomes `yourname.duckdns.org`)
   - Must be unique
   - Only alphanumeric and hyphens allowed
   - Examples: `my-app.duckdns.org`, `gemma-hackathon.duckdns.org`
4. Click **"Install"**
5. Select your domain from the list
6. Copy your **Token** (important!)

### Save Your Token

```bash
# On your local computer
echo "YOUR_DUCKDNS_TOKEN" > ~/duckdns_token.txt
chmod 600 ~/duckdns_token.txt

# Or on Oracle instance
ssh -i ~/.ssh/oracle_cloud ubuntu@YOUR_PUBLIC_IP
echo "YOUR_DUCKDNS_TOKEN" > ~/duckdns_token.txt
```

---

## Step 4.2: Set Up Dynamic DNS Update Script

### Why Dynamic DNS?
Your IP might change occasionally. This script keeps DuckDNS updated automatically.

### Create Update Script

On your Oracle instance:

```bash
# Create script file
cat > ~/update_duckdns.sh << 'EOF'
#!/bin/bash

# Configuration
DUCKDNS_DOMAIN="yourname.duckdns.org"
DUCKDNS_TOKEN="YOUR_DUCKDNS_TOKEN_HERE"
LOG_FILE="/home/ubuntu/duckdns_update.log"

# Get current public IP
IP=$(curl -s https://checkip.amazonaws.com)

# Update DuckDNS
RESPONSE=$(curl -s "https://www.duckdns.org/update?domains=$DUCKDNS_DOMAIN&token=$DUCKDNS_TOKEN&ip=$IP")

# Log result
echo "$(date): IP=$IP, Response=$RESPONSE" >> $LOG_FILE

# Check if update was successful
if [[ $RESPONSE == *"OK"* ]]; then
    echo "$(date): DuckDNS updated successfully" >> $LOG_FILE
    exit 0
else
    echo "$(date): DuckDNS update failed - $RESPONSE" >> $LOG_FILE
    exit 1
fi
EOF

# Make script executable
chmod +x ~/update_duckdns.sh

# Test the script
~/update_duckdns.sh

# Check log
cat ~/duckdns_update.log
```

### Create Cron Job (Auto-Update)

```bash
# Edit crontab
crontab -e

# Add this line (updates every 5 minutes):
*/5 * * * * ~/update_duckdns.sh

# Save and exit (Ctrl+X, then Y, then Enter if using nano)

# Verify cron job was added
crontab -l
```

### Verify DuckDNS Setup

```bash
# Wait a few minutes for cron job to run
sleep 300

# Check if domain resolves
nslookup yourname.duckdns.org

# Expected output:
# Server: 8.8.8.8
# Address: 8.8.8.8#53
#
# Non-authoritative answer:
# Name: yourname.duckdns.org
# Address: YOUR_PUBLIC_IP

# Test access via domain
curl http://yourname.duckdns.org/health
```

---

# Part 5: Connect Everything

## Step 5.1: Update Nginx Configuration

### Update nginx.conf

Replace `yourname.duckdns.org` with your actual domain:

```bash
# Edit nginx.conf on Oracle instance
nano ~/GEMMA-HACKATHON/nginx.conf
```

Change:
```nginx
server_name yourname.duckdns.org;

ssl_certificate /etc/letsencrypt/live/yourname.duckdns.org/fullchain.pem;
ssl_certificate_key /etc/letsencrypt/live/yourname.duckdns.org/privkey.pem;
```

To:
```nginx
server_name your-actual-domain.duckdns.org;

ssl_certificate /etc/letsencrypt/live/your-actual-domain.duckdns.org/fullchain.pem;
ssl_certificate_key /etc/letsencrypt/live/your-actual-domain.duckdns.org/privkey.pem;
```

### Rebuild Nginx Container

```bash
# Navigate to project directory
cd ~/GEMMA-HACKATHON

# Restart Nginx to apply changes
docker-compose restart nginx

# Check logs
docker-compose logs nginx
```

---

## Step 5.2: Configure Certbot for SSL

### What is Certbot?
Automatically requests and manages SSL certificates from Let's Encrypt (free certificates).

### Install Certbot

```bash
# On Oracle instance
sudo apt install -y certbot python3-certbot-nginx

# Verify installation
certbot --version
```

### Request SSL Certificate

```bash
# Navigate to project directory
cd ~/GEMMA-HACKATHON

# Create docker-compose entry for certbot (optional but recommended)
# Or run certbot directly:

# Stop Nginx first
docker-compose down

# Request certificate
sudo certbot certonly --standalone -d your-actual-domain.duckdns.org -d www.your-actual-domain.duckdns.org --agree-tos -n -m your-email@example.com

# Expected output:
# Successfully received certificate.
# Certificate is saved at: /etc/letsencrypt/live/your-actual-domain.duckdns.org/
# Key is saved at: /etc/letsencrypt/live/your-actual-domain.duckdns.org/privkey.pem

# Restart containers
docker-compose up -d
```

### Set Up Certificate Auto-Renewal

```bash
# Edit crontab
crontab -e

# Add renewal job (runs daily at 2 AM):
0 2 * * * certbot renew --quiet && docker-compose -f ~/GEMMA-HACKATHON/docker-compose.yml restart nginx

# Save and exit
```

---

# Part 6: SSL/TLS Configuration

## Step 6.1: Security Headers

### What are Security Headers?
HTTP headers that protect against common web vulnerabilities.

### Review Nginx Configuration

Your nginx.conf should include:

```nginx
# These should already be in the HTTPS server block:

# Prevents clickjacking attacks
add_header X-Frame-Options "SAMEORIGIN" always;

# Prevents MIME type sniffing
add_header X-Content-Type-Options "nosniff" always;

# Enables browser XSS protection
add_header X-XSS-Protection "1; mode=block" always;

# Enforces HTTPS for future visits
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

# Content Security Policy (optional, more restrictive)
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';" always;
```

---

## Step 6.2: Test SSL Configuration

### Verify Certificate

```bash
# Check certificate details
sudo openssl x509 -in /etc/letsencrypt/live/your-actual-domain.duckdns.org/fullchain.pem -text -noout

# Check certificate expiration
sudo openssl x509 -in /etc/letsencrypt/live/your-actual-domain.duckdns.org/fullchain.pem -dates -noout

# Expected output shows expiration date (valid for 90 days)
```

### Test SSL with Online Tools

```bash
# Test SSL quality using Qualys SSL Labs
# Visit: https://www.ssllabs.com/ssltest/analyze.html?d=your-actual-domain.duckdns.org
# Check for A or A+ rating

# Or test from command line:
curl -I https://your-actual-domain.duckdns.org
# Should show:
# HTTP/2 200
# ssl-session-id: ...
```

### Check Certificate Chain

```bash
# Verify full chain is correct
curl -v https://your-actual-domain.duckdns.org 2>&1 | grep "SSL"

# Check certificate validity
curl -I --cacert /etc/letsencrypt/live/your-actual-domain.duckdns.org/fullchain.pem https://your-actual-domain.duckdns.org
```

---

# Part 7: Testing & Verification

## Step 7.1: Health Checks

### Backend Health

```bash
# Test backend health endpoint
curl https://your-actual-domain.duckdns.org/api/health

# Expected response (JSON or plain text):
# {"status": "ok"} or "healthy"
```

### Frontend Health

```bash
# Test frontend is serving
curl -I https://your-actual-domain.duckdns.org

# Expected response:
# HTTP/2 200
# Content-Type: text/html
```

### Container Status

```bash
# SSH into instance
ssh -i ~/.ssh/oracle_cloud ubuntu@YOUR_PUBLIC_IP

# Check all containers
docker-compose ps

# All should show "Up X minutes (healthy)"

# If any are down:
docker-compose restart container-name
docker-compose logs container-name
```

---

## Step 7.2: Performance Testing

### Measure Response Times

```bash
# Frontend response time
time curl -o /dev/null -s https://your-actual-domain.duckdns.org

# Backend API response time
time curl -o /dev/null -s https://your-actual-domain.duckdns.org/api/data

# Load testing (optional, be careful)
# Using Apache Bench (ab)
ab -n 100 -c 10 https://your-actual-domain.duckdns.org/
```

### Monitor Resource Usage

```bash
# SSH into instance
ssh -i ~/.ssh/oracle_cloud ubuntu@YOUR_PUBLIC_IP

# Check CPU and memory
docker stats

# Press Ctrl+C to exit

# Check disk usage
df -h

# Expected (for free tier):
# Should show mostly free space in /dev/sda1
```

---

## Step 7.3: Access Your Application

### Via Browser

1. Open: `https://your-actual-domain.duckdns.org`
2. You should see your GEMMA application
3. Click around and test features
4. Open browser DevTools (F12) to check network requests
   - API calls should go to `/api/*`
   - Check Network tab for any failed requests
   - Check Console for JavaScript errors

### Via Mobile

1. Open on your phone's browser: `https://your-actual-domain.duckdns.org`
2. Test responsive design
3. Test any mobile-specific features

### Test API Endpoints

```bash
# Get list of data (example)
curl -X GET https://your-actual-domain.duckdns.org/api/data

# Create new item (example)
curl -X POST https://your-actual-domain.duckdns.org/api/data \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Item"}'

# Check response status
curl -I -X GET https://your-actual-domain.duckdns.org/api/data
```

---

## Step 7.4: Debugging Common Issues

### Application Not Loading

```bash
# Check if containers are running
docker-compose ps

# If any container is down, restart it
docker-compose up -d container-name

# Check logs for errors
docker-compose logs container-name

# Look for error messages in logs
```

### Certificate Issues

```bash
# Check certificate expiration
sudo openssl x509 -in /etc/letsencrypt/live/your-actual-domain.duckdns.org/fullchain.pem -dates -noout

# Manual renewal if needed
sudo certbot renew --force-renewal --no-eff-email

# Restart Nginx to apply new certificate
docker-compose restart nginx
```

### DNS Not Resolving

```bash
# Check if domain resolves
nslookup your-actual-domain.duckdns.org

# If it doesn't resolve, update DuckDNS manually
~/update_duckdns.sh

# Wait a few minutes and try again
```

---

# Troubleshooting

## Common Issues & Solutions

### Issue 1: Can't Connect via SSH

**Problem**: `ssh: connect to host [IP] port 22: Connection refused`

**Solution**:
```bash
# Wait for instance to fully boot (2-3 minutes after creation)
# Check if security group allows SSH (port 22)
# Verify SSH key permissions
chmod 600 ~/.ssh/oracle_cloud

# Try verbose mode to see what's happening
ssh -v -i ~/.ssh/oracle_cloud ubuntu@YOUR_PUBLIC_IP
```

### Issue 2: Docker Command Not Found

**Problem**: `command not found: docker`

**Solution**:
```bash
# Reinstall Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add user to docker group
sudo usermod -aG docker ubuntu

# Log out and back in
exit
# SSH back in
```

### Issue 3: Containers Won't Start

**Problem**: `docker-compose up` fails or containers keep restarting

**Solution**:
```bash
# Check logs
docker-compose logs

# Look for specific error messages
# Common causes:
# - Port already in use: sudo lsof -i :8000
# - Out of disk space: df -h
# - Out of memory: docker stats

# Rebuild from scratch
docker-compose down
docker-compose build --no-cache
docker-compose up -d

# Check specific container
docker logs container-name
```

### Issue 4: Domain Not Resolving

**Problem**: `Domain not found` or `Connection refused`

**Solution**:
```bash
# Manually update DuckDNS
~/update_duckdns.sh

# Check DuckDNS dashboard at https://www.duckdns.org
# Verify your token and domain are correct

# Wait for DNS propagation (can take up to 15 minutes)
# Test with nslookup
nslookup your-actual-domain.duckdns.org

# If still not working, clear DNS cache
sudo systemctl restart systemd-resolved

# Try again
nslookup your-actual-domain.duckdns.org
```

### Issue 5: HTTPS Not Working / Certificate Errors

**Problem**: Browser shows certificate warning or "not secure"

**Solution**:
```bash
# Verify certificate is installed
sudo ls -la /etc/letsencrypt/live/your-actual-domain.duckdns.org/

# Check Nginx is configured correctly
docker exec nginx cat /etc/nginx/nginx.conf | grep ssl_certificate

# If paths are wrong, update nginx.conf and restart
docker-compose restart nginx

# Verify certificate is valid
sudo openssl x509 -in /etc/letsencrypt/live/your-actual-domain.duckdns.org/fullchain.pem -dates -noout

# If expired, renew
sudo certbot renew --force-renewal
```

### Issue 6: Out of Disk Space

**Problem**: `no space left on device`

**Solution**:
```bash
# Check disk usage
df -h

# See what's taking space
du -sh /*

# Clean up Docker (remove unused containers/images)
docker system prune -a

# Check logs aren't too large
du -sh /var/lib/docker/containers

# If needed, remove old logs
docker logs --tail 0 container-name
```

### Issue 7: High Memory/CPU Usage

**Problem**: Application runs slowly or server becomes unresponsive

**Solution**:
```bash
# Check resource usage
docker stats

# Identify resource-hungry container
docker top container-name

# Increase container memory limits in docker-compose.yml:
deploy:
  resources:
    limits:
      cpus: '2'
      memory: 2G
    reservations:
      cpus: '0.5'
      memory: 512M

# Rebuild and restart
docker-compose down
docker-compose up -d
```

### Issue 8: Backend API Errors

**Problem**: API calls fail or return 500 errors

**Solution**:
```bash
# Check backend logs
docker-compose logs backend

# Look for specific error messages
# Common causes:
# - Database connection issues
# - Missing environment variables
# - Crashed Python process

# Restart backend
docker-compose restart backend

# Check if health endpoint works
curl http://localhost:8000/health

# If database error, check database file
ls -la /path/to/database
```

---

## Monitoring & Maintenance

### Weekly Tasks

```bash
# Check for updates
ssh ubuntu@YOUR_PUBLIC_IP
sudo apt update
sudo apt list --upgradable

# Check disk space
df -h

# Check Docker logs for errors
docker-compose logs --tail 100
```

### Monthly Tasks

```bash
# Update Ubuntu packages
sudo apt upgrade

# Prune unused Docker resources
docker system prune

# Check SSL certificate expiration
sudo openssl x509 -dates -noout -in /etc/letsencrypt/live/your-actual-domain.duckdns.org/fullchain.pem

# Review application logs for issues
docker-compose logs backend | grep ERROR
```

### As-Needed Tasks

```bash
# If you need to stop everything
docker-compose down

# If you need to restart everything
docker-compose restart

# If you need to pull latest code
git pull origin main
docker-compose build
docker-compose up -d

# If you need to access database
docker exec backend sqlite3 data/data.db ".tables"
```

---

## Performance Optimization Tips

### 1. Enable Caching

```nginx
# In nginx.conf, add to http block:
proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=my_cache:10m;

location / {
    proxy_cache my_cache;
    proxy_cache_valid 200 10m;
    proxy_cache_use_stale error timeout updating http_500 http_502 http_503 http_504;
    add_header X-Cache-Status $upstream_cache_status;
}
```

### 2. Optimize Images

- Use `.webp` format where possible
- Optimize image sizes before uploading
- Use CDN for static assets (optional)

### 3. Database Optimization

- Regular backups
- Remove old logs
- Use indexes for frequently queried fields

### 4. Rate Limiting

Already configured in nginx.conf:
- General requests: 30 req/s
- API requests: 10 req/s

---

## Backup & Recovery

### Backup Your Data

```bash
# Connect to instance
ssh ubuntu@YOUR_PUBLIC_IP

# Backup database
docker exec backend cp data/data.db data/data.db.backup

# Backup configuration
tar -czf config-backup-$(date +%Y%m%d).tar.gz ~/GEMMA-HACKATHON/

# Download backups locally
scp -r ubuntu@YOUR_PUBLIC_IP:~/config-backup*.tar.gz ~/backups/
```

### Restore from Backup

```bash
# Upload backup to instance
scp ~/backups/config-backup-20240101.tar.gz ubuntu@YOUR_PUBLIC_IP:~/

# Extract
tar -xzf config-backup-20240101.tar.gz

# Restart services
docker-compose down
docker-compose up -d
```

---

## Additional Resources

### Useful Links
- [Oracle Cloud Documentation](https://docs.oracle.com/en-us/iaas/Content/home.htm)
- [Docker Documentation](https://docs.docker.com/)
- [Nginx Documentation](https://nginx.org/en/docs/)
- [Let's Encrypt](https://letsencrypt.org/)
- [DuckDNS](https://www.duckdns.org)

### Command Cheat Sheet

```bash
# Docker Commands
docker-compose up -d              # Start services
docker-compose down               # Stop services
docker-compose logs -f            # View logs
docker-compose restart            # Restart services
docker ps                         # List running containers
docker exec container-name cmd    # Run command in container

# SSH & File Transfer
ssh -i key.pem ubuntu@IP          # Connect to instance
scp -i key.pem file ubuntu@IP:~   # Copy file to instance
scp -i key.pem ubuntu@IP:~file .  # Copy file from instance

# System Commands
df -h                             # Check disk space
docker stats                      # Check resource usage
crontab -e                        # Edit scheduled tasks
sudo systemctl restart service    # Restart service
```

---

## Final Checklist

Before considering deployment complete:

- [ ] Oracle Cloud instance created and running
- [ ] SSH connection working
- [ ] Docker and Docker Compose installed
- [ ] Repository cloned to instance
- [ ] Docker containers building successfully
- [ ] Containers running without errors
- [ ] DuckDNS account created and token saved
- [ ] Dynamic DNS update script working
- [ ] Domain resolving to correct IP
- [ ] SSL certificate installed
- [ ] Nginx reverse proxy configured
- [ ] Frontend accessible via domain
- [ ] Backend API responding
- [ ] Certificate auto-renewal configured
- [ ] Health checks passing
- [ ] Performance acceptable
- [ ] Backups configured
- [ ] Monitoring logs checked

---

## Success! 🎉

Your application is now deployed and accessible via:
- **URL**: `https://your-actual-domain.duckdns.org`
- **SSL**: Automatically configured and renewed
- **Uptime**: 24/7 running on Oracle Cloud free tier
- **Domain**: Easy-to-remember custom domain

For questions or issues, refer to the Troubleshooting section or check container logs with `docker-compose logs`.

---

## Document Version
**Version**: 1.0  
**Last Updated**: May 2024  
**Project**: GEMMA Hackathon  
**Application**: Multi-tier Medical RAG System with AI Agents
