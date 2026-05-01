#!/usr/bin/env python3
"""
Telegram 贴纸下载器
需要: BOT_TOKEN 和贴纸包名称
"""

import os
import sys
import asyncio
import aiohttp
from telegram import Bot

# 贴纸包列表
STICKER_SETS = [
    "stickers_atri",
    "Mon3tr", 
    "kawaiikipfel_by_moe_sticker_bot",
    "ArknightsRosmontis"
]

async def download_sticker_set(bot_token: str, set_name: str, output_dir: str):
    """下载单个贴纸包"""
    bot = Bot(token=bot_token)
    
    try:
        # 获取贴纸包信息
        sticker_set = await bot.get_sticker_set(set_name)
        print(f"找到贴纸包: {sticker_set.title} ({len(sticker_set.stickers)} 个贴纸)")
        
        # 创建输出目录
        os.makedirs(output_dir, exist_ok=True)
        
        # 下载每个贴纸
        async with aiohttp.ClientSession() as session:
            for i, sticker in enumerate(sticker_set.stickers):
                # 获取文件
                file = await bot.get_file(sticker.file_id)
                file_url = file.file_path
                
                # 下载
                ext = ".webm" if sticker.is_video else ".webp"
                filename = f"{set_name}_{i:03d}{ext}"
                filepath = os.path.join(output_dir, filename)
                
                async with session.get(file_url) as response:
                    if response.status == 200:
                        with open(filepath, 'wb') as f:
                            f.write(await response.read())
                        print(f"  ✓ 下载: {filename}")
                    else:
                        print(f"  ✗ 失败: {filename}")
        
        print(f"完成: {set_name}")
        
    except Exception as e:
        print(f"错误 {set_name}: {e}")

async def main():
    # 从环境变量获取 bot token
    bot_token = os.getenv("TELEGRAM_BOT_TOKEN")
    
    if not bot_token:
        print("错误: 请设置 TELEGRAM_BOT_TOKEN 环境变量")
        print("获取方式: @BotFather 创建 bot 获取 token")
        sys.exit(1)
    
    # 下载所有贴纸包
    base_dir = "/root/.openclaw/workspace/emoji-packs"
    
    for set_name in STICKER_SETS:
        output_dir = os.path.join(base_dir, set_name.replace("_by_", "_").replace("_bot", ""))
        print(f"\n下载: {set_name}")
        await download_sticker_set(bot_token, set_name, output_dir)

if __name__ == "__main__":
    asyncio.run(main())
