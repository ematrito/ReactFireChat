#!/bin/sh

# DEBUG: Print environment to see if Render is passing the var
echo "--- ENTRYPOINT DEBUG START ---"
echo "Current User: $(whoami)"
echo "Current Directory: $(pwd)"
echo "REACT_APP_API_BASE from env: '${REACT_APP_API_BASE}'"

# 1. Create the config file
# Using absolute path /app/build/config.js
CONFIG_PATH="/app/build/config.js"

echo "window.APP_CONFIG = {" > "$CONFIG_PATH"
echo "  API_BASE: \"${REACT_APP_API_BASE}\"" >> "$CONFIG_PATH"
echo "};" >> "$CONFIG_PATH"

echo "--- Created config.js at $CONFIG_PATH ---"
cat "$CONFIG_PATH"
echo "--- File List in /app/build ---"
ls -la /app/build
echo "--- ENTRYPOINT DEBUG END ---"

# 2. Start the server
# Use exec to ensure signals are passed
# serving current directory 'build'
exec serve -s build -l ${PORT:-3000} --no-clipboard