#!/usr/bin/env bash

echo "🔄 Pulling latest changes from remote repository"
git pull

echo "🔄 Killing hugo server"
pkill -f "hugo server"

echo "✅ Synchronization is complete"