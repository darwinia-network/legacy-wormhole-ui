#!/usr/bin/env bash

deployer=runner
svr=121.40.143.87
path=/alidata1/www/itering_www
dir=current
deploy_path=$path/$dir

# backup
echo "BACKUP: 'ssh $deployer@$svr "cp -r $deploy_path $path/releases/$(date +%s)"'"
ssh $deployer@$svr "cp -r $deploy_path $path/releases/$(date +%s)"

# upload latest version to current
echo "UPLOADING: 'scp -r ./build/* $deployer@$svr:$deploy_path'"
scp -r ./build/* $deployer@$svr:$deploy_path