FROM mcr.microsoft.com/devcontainers/typescript-node:1-22-bookworm

RUN curl -sS -L https://gateway.security.cfdata.org/Cloudflare_Corp_Zero_Trust_Cert.pem -o /usr/local/share/ca-certificates/Cloudflare_CA.crt && update-ca-certificates

# Install xdg-utils for desktop integration
RUN apt-get update && apt-get install -y xdg-utils && rm -rf /var/lib/apt/lists/*

# Install Wrangler CLI globally
RUN npm install -g wrangler@latest cf
