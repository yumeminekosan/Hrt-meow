#!/bin/bash
# Twitter温暖回复任务
cd /root/.openclaw/workspace/twitter-warmth
node bot.mjs >> /tmp/twitter-warmth.log 2>&1
echo "[$(date)] 任务完成" >> /tmp/twitter-warmth.log
