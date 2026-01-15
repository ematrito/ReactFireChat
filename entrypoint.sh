#!/bin/sh

# 1. Create the config file in the build directory
# We write a simple JS command that assigns the object to window.APP_CONFIG
cat <<EOF > /app/build/config.js
window.APP_CONFIG = {
  API_BASE: "${REACT_APP_API_BASE}"
};
EOF

# 2. Print for debugging purposes
echo "Generated config.js with API_BASE: ${REACT_APP_API_BASE}"

# 3. Start the original serve command
# "exec" is important: it ensures the server becomes the main process
exec serve -s build -l ${PORT:-3000} --no-clipboard