#!/usr/bin/env bash
# One-time server setup for digital-dekanat (Ubuntu 24.04). Run as root:
#   bash bootstrap.sh studcab.ru                    first run
#   bash bootstrap.sh studcab.ru --show-passwords   re-run and print demo passwords again
# Idempotent: never overwrites /opt/dekanat/.env or an installed deploy key. To rotate the key,
# delete the "dekanat-deploy" line from /home/deploy/.ssh/authorized_keys and run again.
set -euo pipefail
DOMAIN="${1:-}"; OPT="${2:-}"; DIR=/opt/dekanat; ENVF="$DIR/.env"; KEYF=/root/dekanat-deploy-key
AUTH=/home/deploy/.ssh/authorized_keys; ALPHA='abcdefghijkmnpqrstuvwxyz23456789'
die() { echo "ERROR: $*" >&2; exit 1; }
# If we fail before the key is printed, drop it from authorized_keys so a re-run makes a new one.
cleanup() {
  rm -f "$KEYF" "$KEYF.pub"
  [[ "${NEWKEY:-no}" == yes && "${PRINTED:-no}" != yes ]] && sed -i '/ dekanat-deploy$/d' "$AUTH"
  return 0; }
step() { echo "== $*"; }
# Random string from an alphabet; head/cut read all input, so no SIGPIPE under pipefail.
rnd() { head -c 4096 /dev/urandom | LC_ALL=C tr -dc "$1" | cut -c "1-$2"; }
demo_pw() { local s; s="$(rnd "$ALPHA" 12)"; echo "${s:0:4}-${s:4:4}-${s:8:4}"; }

[[ $EUID -eq 0 ]] || die "run as root"
re='^([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$'
[[ "$DOMAIN" =~ $re ]] || die "usage: bash bootstrap.sh <domain> [--show-passwords]"
[[ -z "$OPT" || "$OPT" == "--show-passwords" ]] || die "unknown option: $OPT"
step "packages"
export DEBIAN_FRONTEND=noninteractive
apt-get update -q
apt-get upgrade -y -q
apt-get install -y -q docker.io docker-compose-v2 ufw unattended-upgrades openssh-server
printf 'APT::Periodic::Update-Package-Lists "1";\nAPT::Periodic::Unattended-Upgrade "1";\n' \
  > /etc/apt/apt.conf.d/20auto-upgrades
systemctl enable --now docker || echo "WARN: could not start docker via systemd"
step "timezone"
timedatectl set-timezone Europe/Moscow 2>/dev/null ||
  ln -sf /usr/share/zoneinfo/Europe/Moscow /etc/localtime
step "swap"
if [[ -z "$(swapon --noheadings 2>/dev/null)" ]]; then
  if [[ ! -f /swapfile ]]; then
    fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile >/dev/null
  fi
  swapon /swapfile || echo "WARN: swapon failed"
  grep -q '^/swapfile ' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi
step "user deploy and $DIR"
id deploy >/dev/null 2>&1 || useradd -m -s /bin/bash deploy
usermod -aG docker deploy
install -d -o deploy -g deploy -m 750 "$DIR"
install -d -o deploy -g deploy -m 700 /home/deploy/.ssh
NEWKEY=no
if ! grep -q 'dekanat-deploy' "$AUTH" 2>/dev/null; then
  rm -f "$KEYF" "$KEYF.pub"
  trap cleanup EXIT
  ssh-keygen -q -t ed25519 -N '' -C dekanat-deploy -f "$KEYF"
  # restrict: no port, agent or X11 forwarding and no pty; commands and scp still work.
  echo "restrict $(cat "$KEYF.pub")" >> "$AUTH"
  NEWKEY=yes
fi
chown deploy:deploy "$AUTH" && chmod 600 "$AUTH"
step "firewall"
{ ufw default deny incoming && ufw default allow outgoing &&
  ufw allow OpenSSH && ufw allow 80/tcp && ufw allow 443 && ufw --force enable; } ||
  die "ufw failed; refusing to leave the server without a firewall"
step "$ENVF"
NEWENV=no
if [[ ! -f "$ENVF" ]]; then
  pg="$(rnd 'A-Za-z0-9' 32)"
  ( umask 077
    { echo "SITE_DOMAIN=$DOMAIN"
      echo "POSTGRES_USER=dekanat"; echo "POSTGRES_DB=dekanat"; echo "POSTGRES_PASSWORD=$pg"
      echo "DATABASE_URL=postgresql://dekanat:$pg@db:5432/dekanat?schema=public"
      for n in ALINA DENIS MFC DEKANAT; do echo "DEMO_PASSWORD_$n=$(demo_pw)"; done
    } > "$ENVF" )
  NEWENV=yes
fi
chown deploy:deploy "$ENVF" && chmod 600 "$ENVF"
step "nightly demo reset (04:00 Europe/Moscow)"
cat > /etc/systemd/system/dekanat-reset.service <<'UNIT'
[Unit]
Description=digital-dekanat nightly demo data reset
Requires=docker.service
After=docker.service
[Service]
Type=oneshot
User=deploy
WorkingDirectory=/opt/dekanat
ExecStart=/usr/bin/docker compose -f compose.prod.yml --env-file .env --env-file release.env \
  --profile tools run --rm tools demo-reset
UNIT
printf '[Timer]\nOnCalendar=*-*-* 04:00:00 Europe/Moscow\nPersistent=true\n%s\n%s\n' \
  '[Install]' 'WantedBy=timers.target' > /etc/systemd/system/dekanat-reset.timer
{ systemctl daemon-reload && systemctl enable --now dekanat-reset.timer; } ||
  echo "WARN: systemd timer not enabled"
step "sshd: keys only, no root login"
grep -q '^restrict ssh-ed25519 .* dekanat-deploy$' "$AUTH" || die "no deploy key; sshd unchanged"
printf 'PasswordAuthentication no\nKbdInteractiveAuthentication no\nPermitRootLogin no\n' \
  > /etc/ssh/sshd_config.d/00-dekanat.conf
mkdir -p /run/sshd
if ! sshd -t; then rm -f /etc/ssh/sshd_config.d/00-dekanat.conf; die "sshd config test failed"; fi
systemctl reload ssh || systemctl reload sshd || echo "WARN: could not reload sshd"

IP="$(ip -4 route get 1.1.1.1 2>/dev/null |
  awk '{for(i=1;i<NF;i++) if($i=="src") print $(i+1)}' || true)"
HOSTKEY="$(awk '{print $1" "$2}' /etc/ssh/ssh_host_ed25519_key.pub)"
if [[ "$NEWKEY" == yes || "$NEWENV" == yes || -n "$OPT" ]]; then
  printf '\n%s\n%s\n' "!!! Do not paste this output into any chat, including Claude Code. !!!" \
    "!!! Copy values into GitHub secrets and a password manager only.   !!!"
  echo "==================== BEGIN SECRETS ===================="
  printf 'SSH_HOST: %s   (check it matches the IP in the Timeweb panel)\nSSH_USER: deploy\n' "$IP"
  printf -- '--- SSH_KNOWN_HOSTS (one line) ---\n%s\n' "$IP $HOSTKEY"
  if [[ "$NEWKEY" == yes ]]; then
    echo "--- SSH_PRIVATE_KEY (all lines, including BEGIN and END) ---"
    cat "$KEYF"; PRINTED=yes
  fi
  if [[ "$NEWENV" == yes || -n "$OPT" ]]; then
    echo "--- demo passwords (password manager) ---"
    grep '^DEMO_PASSWORD_' "$ENVF"
  fi
  echo "===================== END SECRETS ====================="
fi
echo "bootstrap done"
