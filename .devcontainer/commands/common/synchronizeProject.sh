#!/usr/bin/env bash

echo "🔄 Pulling latest changes from remote repository"
git pull

echo "🔄 Installing dependencies"
corepack yarn

echo "🔄 Killing hugo server"
pkill -f "hugo server"

echo "✅ Synchronization is complete"