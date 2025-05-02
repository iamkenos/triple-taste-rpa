#!/bin/bash
source .env

function set_webhook_url() {
  local token="${TELEGRAM_BOT_KEY}"
  local url="${1}"

  if [ -z "${url}" ]; then
    echo "Usage: npm run bootstrap-webhook -- <url>"
    exit 1
  fi

  echo $(curl -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_KEY}/setWebhook" -d "url=$url")
}
