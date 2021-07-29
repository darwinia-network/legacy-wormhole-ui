#!/bin/bash
#

set -xe

echo "VERCEL_ENV: $VERCEL_ENV"

npm i

if [[ "$VERCEL_ENV" == "production" ]] ; then
  npm run build_production
else
  npm run build_dev
fi


