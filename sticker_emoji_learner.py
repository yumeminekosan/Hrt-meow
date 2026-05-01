#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
贴纸-emoji 学习器
让Mon3能记住贴纸和emoji的对应关系
"""

import json
from datetime import datetime
from pathlib import Path
from typing import Dict, Optional

class StickerEmojiLearner:
    """贴纸-emoji学习器"""
    
    def __init__(self, data_file: str = None):
        # 数据文件路径
        self.data_file = data_file or "/root/.openclaw/workspace/memory/sticker_emoji_map.json"
        
        # 加载已有数据
        self.sticker_map = self.load_data()
        
    def load_data(self) -> Dict[str, str]:
        """加载贴纸-emoji映射数据"""
        try:
            with open(self.data_file, 'r', encoding='utf-8') as f:
                return json.load(f)
        except FileNotFoundError:
            return {}
        except json.JSONDecodeError:
            return {}
    
    def save_data(self) -> None:
        """保存数据到文件"""
        with open(self.data_file, 'w', encoding='utf-8') as f:
            json.dump(self.sticker_map, f, ensure_ascii=False, indent=2)
    
    def learn(
        self,
        sticker_file: str,
        emoji: str,
        description: Optional[str] = None
    ) -> bool:
        """学习一个贴纸-emoji对应关系"""
        sticker_id = Path(sticker_file).name
        
        # 记录映射
        self.sticker_map[sticker_id] = {
            'emoji': emoji,
            'description': description,
            'learned_at': datetime.now().isoformat()
        }
        
        # 保存
        self.save_data()
        
        return True
    
    def get_emoji(self, sticker_file: str) -> Optional[str]:
        """根据贴纸文件获取emoji"""
        sticker_id = Path(sticker_file).name
        
        if sticker_id in self.sticker_map:
            return self.sticker_map[sticker_id]['emoji']
        
        return None
    
    def get_description(self, sticker_file: str) -> Optional[str]:
        """获取贴纸的描述"""
        sticker_id = Path(sticker_file).name
        
        if sticker_id in self.sticker_map:
            return self.sticker_map[sticker_id].get('description')
        
        return None
    
    def list_learned(self) -> Dict[str, dict]:
        """列出所有已学习的贴纸"""
        return self.sticker_map
    
    def forget(self, sticker_file: str) -> bool:
        """忘记一个贴纸"""
        sticker_id = Path(sticker_file).name
        
        if sticker_id in self.sticker_map:
            del self.sticker_map[sticker_id]
            self.save_data()
            return True
        
        return False
    
    def suggest_emoji_from_media_path(self, media_path: str) -> Optional[str]:
        """从媒体路径推断emoji"""
        # 根据文件名模式
        if '---' in media_path:
            # 提取文件名
            filename = Path(media_path).name
            sticker_id = filename.split('---')[-1] if '---' in filename else filename
            
            # 查找已知映射
            if sticker_id in self.sticker_map:
                return self.sticker_map[sticker_id]['emoji']
        
        return None


def main():
    """测试代码"""
    learner = StickerEmojiLearner()
    
    print("=== 贴纸-emoji 学习器 ===\n")
    
    # 输入测试数据
    print("输入学习模式(输入 q 退出):\n")
    
    while True:
        sticker_path = input("贴纸文件路径: ").strip()
        
        if sticker_path.lower() == 'q':
            print("退出")
            break
        
        if not Path(sticker_path).exists():
            print("文件不存在,重试")
            continue
        
        emoji = input("对应Emoji: ").strip()
        desc = input("描述(可选): ").strip()
        
        if learner.learn(sticker_path, emoji, desc):
            print(f"✓ 已学习: {sticker_path} -> {emoji}")
        else:
            print("✗ 学习失败")


if __name__ == "__main__":
    main()
