#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Dento V2 — Oracle Cloud VM Bootstrap (Ubuntu 22.04 / 24.04 ARM or AMD)
# Run ONCE on a fresh VM:   curl -fsSL <raw-url>/infra/setup-vm.sh | sudo bash
# Or:   scp infra/setup-vm.sh ubuntu@HOST:/tmp/ && ssh ubuntu@HOST "sudo bash /tmp/setup-vm.sh"
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

DOMAIN_ROOT="${DOMAIN_ROOT:-pixelws.de}"
DEPLOY_USER="${DEPLOY_USER:-deploy}"
APP_ROOT="/srv/dento"

echo "==> System update"
apt-get update -y
apt-get upgrade -y
apt-get install -y curl ca-certificates gnupg lsb-release ufw fail2ban unattended-upgrades rsync jq

echo "==> Enable unattended security upgrades"
dpkg-reconfigure -f noninteractive unattended-upgrades

echo "==> Add 2GB swap (critical on 1GB micro instances)"
if ! swapon --show | grep -q '/swapfile'; then
  fallocate -l 2G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
  # Lower swappiness — only swap when really necessary
  sysctl vm.swappiness=10
  echo 'vm.swappiness=10' > /etc/sysctl.d/99-swappiness.conf
fi

echo "==> Install Docker"
if ! command -v docker >/dev/null 2>&1; then
  curl -fsSL https://get.docker.com | sh
fi
systemctl enable --now docker

echo "==> Install Caddy (reverse proxy + auto-TLS)"
if ! command -v caddy >/dev/null 2>&1; then
  apt-get install -y debian-keyring debian-archive-keyring apt-transport-https
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' \
    | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' \
    > /etc/apt/sources.list.d/caddy-stable.list
  apt-get update -y
  apt-get install -y caddy
fi
systemctl enable --now caddy

echo "==> Create deploy user (passwordless docker, used by GitHub Actions SSH)"
if ! id "$DEPLOY_USER" >/dev/null 2>&1; then
  useradd -m -s /bin/bash "$DEPLOY_USER"
  usermod -aG docker "$DEPLOY_USER"
fi
mkdir -p "/home/$DEPLOY_USER/.ssh"
touch "/home/$DEPLOY_USER/.ssh/authorized_keys"
chown -R "$DEPLOY_USER:$DEPLOY_USER" "/home/$DEPLOY_USER/.ssh"
chmod 700 "/home/$DEPLOY_USER/.ssh"
chmod 600 "/home/$DEPLOY_USER/.ssh/authorized_keys"

# Allow deploy user to reload caddy without password (needed when Caddyfile changes)
cat >/etc/sudoers.d/deploy-caddy <<EOF
$DEPLOY_USER ALL=(root) NOPASSWD: /bin/systemctl reload caddy, /bin/systemctl restart caddy
EOF
chmod 440 /etc/sudoers.d/deploy-caddy

echo "==> Create app directories"
mkdir -p "$APP_ROOT"/{api,admin,developer,backups,logs}
chown -R "$DEPLOY_USER:$DEPLOY_USER" "$APP_ROOT"

echo "==> Open firewall (Oracle iptables + ufw)"
# Oracle's default Ubuntu image has restrictive iptables — open 80/443
iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT  || true
iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT || true
if command -v netfilter-persistent >/dev/null 2>&1; then
  netfilter-persistent save || true
fi

ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

echo "==> fail2ban (SSH brute-force protection)"
systemctl enable --now fail2ban

echo "==> Done."
echo
echo "Next steps:"
echo "  1) Add your GitHub Actions deploy SSH PUBLIC KEY to:"
echo "       /home/$DEPLOY_USER/.ssh/authorized_keys"
echo "  2) Copy .env file (with all secrets) to:"
echo "       $APP_ROOT/.env   (chown $DEPLOY_USER:$DEPLOY_USER, chmod 600)"
echo "  3) Place infra/Caddyfile at /etc/caddy/Caddyfile and reload:"
echo "       sudo cp /tmp/Caddyfile /etc/caddy/Caddyfile && sudo systemctl reload caddy"
echo "  4) Trigger the GitHub Actions 'Deploy' workflow."
