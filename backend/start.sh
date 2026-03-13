#!/bin/bash

echo "Installing dependencies..."
npm install

echo "Generating Prisma Client..."
npx prisma generate

echo "Running Prisma migrations..."
npx prisma migrate deploy --schema=./prisma/schema.prisma

echo "Building TypeScript..."
npm run build

echo "Starting LensFlow API..."
node dist/index.js
