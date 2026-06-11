FROM mcr.microsoft.com/devcontainers/typescript-node:1-22-bookworm

# ── Custom CA Certificates ────────────────────────────────────────────────────
# Place any .crt certificate files in .devcontainer/certs/ and they will be
# automatically trusted by both the system and Node.js.
#
# ─────────────────────────────────────────────────────────────────────────────
COPY .devcontainer/certs/*.crt /usr/local/share/ca-certificates/
RUN update-ca-certificates

# Node.js uses its own bundled certificate list by default.
# Point it to the system CA bundle which now includes our custom certs.
ENV NODE_EXTRA_CA_CERTS=/etc/ssl/certs/ca-certificates.crt

# Also ensure the env var is available in login shells (e.g. via exec)
RUN echo 'export NODE_EXTRA_CA_CERTS=/etc/ssl/certs/ca-certificates.crt' > /etc/profile.d/node-certs.sh

# Install xdg-utils for desktop integration
RUN apt-get update && apt-get install -y xdg-utils && rm -rf /var/lib/apt/lists/*

# Install Wrangler and cf CLI globally
RUN npm install -g wrangler@latest cf
