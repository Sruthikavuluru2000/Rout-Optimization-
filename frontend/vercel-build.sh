#!/bin/bash
# Build script for Vercel

echo "Installing dependencies..."
npm install

echo "Building React app..."
npm run build

echo "Build complete!"
