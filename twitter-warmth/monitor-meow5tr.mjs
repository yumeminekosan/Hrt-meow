#!/usr/bin/env node
/**
 * Twitter监控 - 只回复@Meow5tr的推文（测试任务）
 */

import fs from 'node:fs/promises';
import path from 'node:path';

const CONFIG = {
  apiKey: 'new1_2014c9946f134d79b5cd066c455ffaca',
  username: 'meowemiyo',
  email: 'theneko_bot@outlook.com',
  password: 'jack306470',
  proxy: 'http://sqfedmzq:vyq4gjk7sicb@31.59.20.176:6754/',
  cookieFile: '/root/.openclaw/workspace/twitter-warmth/cookie.json',
  repliedLog: '/root/.openclaw/workspace/twitter-warmth/replied-meow5tr.json',
  baseUrl: 'https://api.twitterapi.io/twitter',
  targetUser: 'Meow5tr',
  targetUserId: '1959422320491347968',
  
  // 回复模板 - 猫塑可爱风
  templates: [
    "咪咪喵喵",
    "咪咪喵喵喵",
    "转圈圈转圈圈",
    "转圈圈",
    "喵",
    "喵喵",
    "咪咪",
    "喵呜",
    "呼噜呼噜",
    "蹭蹭",
    "贴贴",
    "爪爪",
    "尾巴摇摇",
    "耳朵抖抖",
    "团成一团",
    "伸懒腰",
    "舔舔爪子",
    "眯眼",
    "翻肚皮",
    "踩奶"
  ]
};

async function saveCookie(cookie) {
  try {
    await fs.writeFile(CONFIG.cookieFile, JSON.stringify({
      cookie, savedAt: new Date().toISOString()
    }));
  } catch {}
}

async function loadCookie() {
  try {
    const data = await fs.readFile(CONFIG.cookieFile, 'utf-8');
    const parsed = JSON.parse(data);
    const savedAt = new Date(parsed.savedAt);
    const now = new Date();
    if ((now - savedAt) / (1000 * 60 * 60) < 24) return parsed.cookie;
  } catch {}
  return null;
}

async function login() {
  try {
    const response = await fetch(`${CONFIG.baseUrl}/user_login_v2`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': CONFIG.apiKey },
      body: JSON.stringify({
        user_name: CONFIG.username,
        email: CONFIG.email,
        password: CONFIG.password,
        proxy: CONFIG.proxy
      })
    });
    const data = await response.json();
    if (data.login_cookies) {
      await saveCookie(data.login_cookies);
      return data.login_cookies;
    }
  } catch {}
  return null;
}

async function getCookie() {
  return await loadCookie() || await login();
}

async function getUserTweets(userId) {
  try {
    const response = await fetch(`${CONFIG.baseUrl}/user/last_tweets?userId=${userId}`, {
      headers: { 'X-API-Key': CONFIG.apiKey }
    });
    const data = await response.json();
    return data.data?.tweets || [];
  } catch { return []; }
}

async function getRepliedTweets() {
  try {
    const data = await fs.readFile(CONFIG.repliedLog, 'utf-8');
    return JSON.parse(data);
  } catch { return []; }
}

async function saveRepliedTweet(tweetId) {
  const replied = await getRepliedTweets();
  replied.push({ id: tweetId, repliedAt: new Date().toISOString() });
  await fs.mkdir(path.dirname(CONFIG.repliedLog), { recursive: true });
  await fs.writeFile(CONFIG.repliedLog, JSON.stringify(replied.slice(-100), null, 2));
}

function getRandomReply() {
  return CONFIG.templates[Math.floor(Math.random() * CONFIG.templates.length)];
}

async function replyToTweet(cookie, tweetId, text) {
  try {
    const response = await fetch(`${CONFIG.baseUrl}/create_tweet_v2`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': CONFIG.apiKey },
      body: JSON.stringify({
        tweet_text: text,
        proxy: CONFIG.proxy,
        login_cookies: cookie,
        reply_to_tweet_id: tweetId
      })
    });
    const data = await response.json();
    return !!data.tweet_id;
  } catch { return false; }
}

async function main() {
  console.log(`🐾 监控 @${CONFIG.targetUser}...`);
  
  const cookie = await getCookie();
  if (!cookie) { console.error('登录失败'); process.exit(1); }
  
  const tweets = await getUserTweets(CONFIG.targetUserId);
  const repliedIds = new Set((await getRepliedTweets()).map(r => r.id));
  const newTweets = tweets.filter(t => !repliedIds.has(t.id));
  
  if (newTweets.length === 0) {
    console.log('没有新推文');
    return;
  }
  
  console.log(`${newTweets.length} 条新推文`);
  
  // 只回复第一条新推文
  const tweet = newTweets[0];
  console.log(`回复: ${tweet.text?.slice(0, 50)}...`);
  
  const replyText = getRandomReply();
  const success = await replyToTweet(cookie, tweet.id, replyText);
  
  if (success) {
    await saveRepliedTweet(tweet.id);
    console.log('✓ 回复成功');
  } else {
    console.log('✗ 回复失败');
  }
}

main().catch(console.error);
