#!/bin/bash
#

set -xe

echo "VERCEL_ENV: $VERCEL_ENV"

yarn install

if [[ "$VERCEL_ENV" == "production" ]] ; then
  yarn build_production
else
  yarn build_dev
fi


