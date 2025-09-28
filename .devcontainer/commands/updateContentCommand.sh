#!/usr/bin/env bash

echo "🔄 Updating apt package manager"
sudo apt update -y
sudo apt upgrade -y

echo "🔄 Start synchronization"
./.devcontainer/commands/common/synchronizeProject.sh