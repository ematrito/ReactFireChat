#!/bin/sh

# 1. Create the config file
# Using absolute path /app/build/config.js
CONFIG_PATH="/app/build/config.js"

echo "window.APP_CONFIG = {" > "$CONFIG_PATH"
echo "  API_BASE: \"${REACT_APP_API_BASE}\"" >> "$CONFIG_PATH"
echo "};" >> "$CONFIG_PATH"

# 2. Start the server
# Use exec to ensure signals are passed
# serving current directory 'build'
exec serve -s build -l ${PORT:-3000} --no-clipboard