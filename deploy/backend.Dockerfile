# ============================================================
# Carbon backend + launch-video renderer (one container).
# Build from the REPO ROOT:
#   docker build -f deploy/backend.Dockerfile -t carbon-backend .
# Needs ~2 GB RAM to render 1080p. Mount a volume at /data.
# ============================================================
# Node 22: better-sqlite3 13 requires it (engines ">=22").
FROM node:22-bookworm-slim

# Shared libraries headless Chrome needs, plus fonts for emoji/CJK fallbacks.
RUN apt-get update && apt-get install -y --no-install-recommends \
      ca-certificates libnss3 libdbus-1-3 libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 \
      libxkbcommon0 libxcomposite1 libxdamage1 libxfixes3 libxrandr2 libgbm1 libasound2 \
      libpango-1.0-0 libcairo2 fonts-noto-color-emoji fonts-noto-cjk \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install deps first for better layer caching. The backend's only install
# script is better-sqlite3's implied `node-gyp rebuild` (npm ci ignores its
# "gypfile": false); it ships prebuilt binaries, and this image has no compiler.
COPY ["apps/Carbon Video/package.json", "apps/Carbon Video/package-lock.json", "apps/Carbon Video/"]
COPY ["apps/Carbon Backend/package.json", "apps/Carbon Backend/package-lock.json", "apps/Carbon Backend/"]
RUN npm ci --prefix "apps/Carbon Video" && npm ci --omit=dev --ignore-scripts --prefix "apps/Carbon Backend"

COPY ["apps/Carbon Video", "apps/Carbon Video"]
COPY ["apps/Carbon Backend", "apps/Carbon Backend"]

# Download Remotion's headless Chrome and pre-build the template bundle so the
# first video doesn't pay for it.
RUN cd "apps/Carbon Video" && npx remotion browser ensure && \
    node -e "import('./scripts/render-video.mjs').then(m => m.getServeUrl()).then(() => console.log('bundle ready'))"

ENV NODE_ENV=production \
    PORT=3002 \
    DATA_DIR=/data \
    VIDEO_APP_DIR=/app/apps/Carbon\ Video
VOLUME ["/data"]
EXPOSE 3002
WORKDIR /app/apps/Carbon Backend
CMD ["node", "server.js"]
