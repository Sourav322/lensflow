#!/bin/bash
echo "🔄 Running Prisma migrations..."
npx prisma migrate deploy --schema=./prisma/schema.prisma

echo "🚀 Starting LensFlow API..."
node dist/index.js
