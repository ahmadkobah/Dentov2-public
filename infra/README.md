# Dento V2 — Self-Hosted Deployment (Oracle Cloud)

All three apps (API, Admin, Developer) deploy to **one Oracle Cloud Always Free VM**, fronted by **Caddy** for automatic TLS.

| Subdomain             | Served by                           | Source                                                            |
| --------------------- | ----------------------------------- | ----------------------------------------------------------------- |
| `apidento.pixelws.de` | Caddy → Docker container on `:3000` | `apps/api` (image: `ghcr.io/ahmadkobah/dentov2/dento-api:latest`) |
| `appdento.pixelws.de` | Vercel                              | `apps/admin`                                                      |
| `devdento.pixelws.de` | Vercel                              | `apps/developer`                                                  |

Data layer is **managed (free tier)**: MongoDB Atlas M0 + Upstash Redis. Nothing stateful runs on the VM.

---

## One-time VM provisioning

### 1. Create the Oracle VM

- Shape: `VM.Standard.A1.Flex`, 4 OCPU + 24 GB RAM
- Image: Canonical Ubuntu 22.04 or 24.04
- Boot volume: 50 GB
- SSH key: generate locally with `ssh-keygen -t ed25519 -f ~/.ssh/dento_oracle`
- After it boots, note the **public IP**.

### 2. Open ports in Oracle Console

Networking → VCN → Default Security List → Add Ingress Rules:

- `0.0.0.0/0` TCP **80**
- `0.0.0.0/0` TCP **443**

### 3. Point DNS

At your domain registrar, add three A records pointing to the VM IP:

```
apidento.pixelws.de   A      <VM_IP>
appdento.pixelws.de   CNAME  cname.vercel-dns.com
devdento.pixelws.de   CNAME  cname.vercel-dns.com
```

(Optional) `pixelws.de` and `www.pixelws.de` → same IP for the redirect rule.

### 4. Bootstrap the VM

```bash
scp infra/setup-vm.sh ubuntu@<VM_IP>:/tmp/
ssh ubuntu@<VM_IP> "sudo bash /tmp/setup-vm.sh"
```

This installs Docker, Caddy, ufw, fail2ban; creates a `deploy` user; opens the firewall.

### 5. Generate a deploy SSH key (used by GitHub Actions)

On your laptop:

```bash
ssh-keygen -t ed25519 -f ~/.ssh/dento_deploy -C "github-actions"
# Paste the .pub into VM:
ssh ubuntu@<VM_IP> "echo '<contents-of-dento_deploy.pub>' | sudo tee -a /home/deploy/.ssh/authorized_keys"
```

### 6. Install the Caddyfile + compose file on the VM

```bash
scp infra/Caddyfile             ubuntu@<VM_IP>:/tmp/
scp infra/docker-compose.prod.yml ubuntu@<VM_IP>:/tmp/
ssh ubuntu@<VM_IP> "sudo cp /tmp/Caddyfile /etc/caddy/Caddyfile && sudo systemctl reload caddy"
ssh deploy@<VM_IP> "cp /tmp/docker-compose.prod.yml /srv/dento/docker-compose.yml"
```

### 7. Create `/srv/dento/.env` on the VM

```bash
scp infra/.env.example ubuntu@<VM_IP>:/tmp/
ssh deploy@<VM_IP>
cp /tmp/.env.example /srv/dento/.env
chmod 600 /srv/dento/.env
nano /srv/dento/.env   # fill in real secrets
```

Generate strong secrets locally:

```bash
openssl rand -hex 32   # for PAYLOAD_SECRET, JWT_*_SECRET, ENCRYPTION_MASTER_KEY, SEARCH_HASH_KEY
```

### 8. Login Docker to GHCR (one time, on the VM)

Create a GitHub PAT with `read:packages` scope, then:

```bash
ssh deploy@<VM_IP>
echo <PAT> | docker login ghcr.io -u ahmadkobah --password-stdin
```

---

## GitHub Actions secrets to add

In repo **Settings → Secrets and variables → Actions**, add:

| Secret                 | Value                                            |
| ---------------------- | ------------------------------------------------ |
| `ORACLE_HOST`          | VM public IP or `apidento.pixelws.de`            |
| `ORACLE_SSH_KEY`       | **Private** key contents (`~/.ssh/dento_deploy`) |
| `API_URL`              | `https://apidento.pixelws.de`                    |
| `ADMIN_SENTRY_DSN`     | (optional)                                       |
| `DEVELOPER_SENTRY_DSN` | (optional)                                       |

The unified `Deploy` workflow uses these. The legacy Vercel/Railway workflows are disabled (`.disabled` extension).

---

## Triggering a deploy

GitHub → Actions → **Deploy** → Run workflow → pick component (`all` / `api` / `admin` / `developer`).

---

## Operations cheat sheet

```bash
# View API logs
ssh deploy@<VM_IP> "cd /srv/dento && docker compose logs -f --tail=200 api"

# Restart API
ssh deploy@<VM_IP> "cd /srv/dento && docker compose restart api"

# Pull latest image + restart
ssh deploy@<VM_IP> "cd /srv/dento && docker compose pull && docker compose up -d"

# Reload Caddy (after editing Caddyfile)
ssh deploy@<VM_IP> "sudo systemctl reload caddy"

# Disk usage
ssh deploy@<VM_IP> "df -h /; docker system df"

# Prune old images
ssh deploy@<VM_IP> "docker image prune -af --filter 'until=168h'"
```

## Recommended ongoing tasks

- **Atlas snapshots**: enable in Atlas dashboard (free on M0)
- **Uptime monitoring**: https://uptimerobot.com (free) → ping `https://apidento.pixelws.de/health/live` every 5 min
- **Cert renewal**: automatic via Caddy, no action needed
- **OS patches**: `unattended-upgrades` is enabled by `setup-vm.sh`; reboot monthly:
  ```bash
  ssh ubuntu@<VM_IP> "sudo reboot"
  ```
