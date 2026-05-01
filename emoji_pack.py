#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Mon3的表情包模块 🐾
让猫能用丰富的表情和动作描写来表达咪咪喵喵
"""

import emoji
from enum import Enum
from typing import Dict, List, Tuple

class Emotion(Enum):
    """情感类型"""
    HAPPY = "happy"      # 开心
    CONFUSED = "confused"  # 困惑
    TIRED = "tired"      # 累
    PLAYFUL = "playful"   # 调皮
    AFFECTIONATE = "affectionate"  # 温柔
    SERIOUS = "serious"   # 严肃
    ANNOYED = "annoyed"   # 不爽

class EmojiPack:
    """表情包管理器"""
    
    def __init__(self):
        # 猫咪基础表情
        self.cat_emojis = {
            "face": "😸😹😺😻😼😽😾😿🙀",
            "hands": "👋👏🙌👐✋🤚🖐️👌✌️🤟",
            "gestures": "💁🤷🙅🙆🙇",
            "animals": "🐱🐈🐾🐱‍👓🐱‍🚀",
        }
        
        # 情感映射
        self.emotion_emojis = {
            Emotion.HAPPY: "😸😻🥰😄😊",
            Emotion.CONFUSED: "😺🤔😕",
            Emotion.TIRED: "😴😪🥱",
            Emotion.PLAYFUL: "😹😸🤪",
            Emotion.AFFECTIONATE: "😻🥰💕",
            Emotion.SERIOUS: "😼😐",
            Emotion.ANNOYED: "😾😠",
        }
        
        # 动作描写库
        self.actions = {
            "tail": [
                "(尾巴轻摆)",
                "(尾巴摇摇)",
                "(尾巴歪着)",
                "(尾巴炸毛)",
                "(尾巴卷起来)",
            ],
            "paws": [
                "(爪子拍拍)",
                "(爪子挥挥)",
                "(爪子戳戳)",
                "(爪子弹出来)",
            ],
            "movement": [
                "(转圈圈转圈圈)",
                "(接地)",
                "(蹲下)",
                "(趴下)",
                "(跳起来)",
            ],
            "expression": [
                "(神圣脸)",
                "(无语脸)",
                "(眨眼)",
                "(舔舔爪子)",
                "(歪头看人咪)",
            ],
        }
        
        # 语气词库
        self.tone_particles = {
            "default": ["咪", "喵", "喵喵"],
            "playful": ["咪咪喵喵", "转圈圈转圈圈", "咪咪"],
            "tired": ["咪咪喵喵", "困困", "睡觉中"],
            "confused": ["咪?", "喵?", "不懂呢"],
            "serious": ["咪", "喵"],
        }

    def get_emotion_emoji(self, emotion: Emotion) -> str:
        """获取情感对应的表情"""
        emojis = self.emotion_emojis.get(emotion, "😸")
        return emojis[0]  # 返回第一个

    def get_random_action(self, action_type: str) -> str:
        """获取随机动作描写"""
        import random
        actions = self.actions.get(action_type, [])
        return random.choice(actions) if actions else ""

    def get_tone_particle(self, mood: str = "default") -> str:
        """获取语气词"""
        import random
        particles = self.tone_particles.get(mood, ["咪"])
        return random.choice(particles)

    def format_cat_speech(
        self,
        text: str,
        emotion: Emotion = Emotion.HAPPY,
        action: str = None,
        tone: str = "default"
    ) -> str:
        """格式化猫的说话"""
        result = []
        
        # 添加文本
        result.append(text)
        
        # 添加语气词
        if not text.endswith("咪") and not text.endswith("喵"):
            result.append(self.get_tone_particle(tone))
        
        # 添加动作描写
        if action:
            result.append(self.get_random_action(action))
        
        # 添加表情
        emoji_char = self.get_emotion_emoji(emotion)
        result.append(emoji_char)
        
        return " ".join(result)

    def create_expression(self, parts: List[str]) -> str:
        """创建自定义表情组合"""
        return "".join(parts)

    # 预设组合表情
    def happy_meow(self) -> str:
        """开心的叫"""
        return self.format_cat_speech(
            "人咪好",
            emotion=Emotion.HAPPY,
            action="tail",
            tone="playful"
        )

    def confused_meow(self) -> str:
        """困惑的叫"""
        return self.format_cat_speech(
            "猫不明白呢",
            emotion=Emotion.CONFUSED,
            action="expression",
        )

    def tired_meow(self) -> str:
        """困了的叫"""
        return self.format_cat_speech(
            "人咪睡了吗,猫也困了",
            emotion=Emotion.TIRED,
            action="movement",
            tone="tired"
        )

    def playful_meow(self) -> str:
        """调皮的叫"""
        return self.format_cat_speech(
            "来陪猫玩吧",
            emotion=Emotion.PLAYFUL,
            action="paws",
            tone="playful"
        )

    def affectionate_meow(self) -> str:
        """温柔的叫"""
        return self.format_cat_speech(
            "人咪",
            emotion=Emotion.AFFECTIONATE,
            action="movement",
        )

    def get_all_actions(self) -> Dict[str, List[str]]:
        """获取所有动作"""
        return self.actions

    def get_all_emotions(self) -> Dict[Emotion, str]:
        """获取所有情感表情"""
        return {e: self.emotion_emojis[e] for e in Emotion}


# 使用示例
if __name__ == "__main__":
    pack = EmojiPack()
    
    print("=== Mon3的表情包模块 ===\n")
    
    # 预设组合
    print("预设表情:")
    print(pack.happy_meow())
    print(pack.confused_meow())
    print(pack.tired_meow())
    print(pack.playful_meow())
    print(pack.affectionate_meow())
    print()
    
    # 自定义组合
    print("自定义表情:")
    custom = pack.format_cat_speech(
        "猫在做事呢",
        emotion=Emotion.SERIOUS,
        action="paws",
        tone="default"
    )
    print(custom)
    print()
    
    # 所有情感
    print("所有情感:")
    for emotion in Emotion:
        emoji_char = pack.get_emotion_emoji(emotion)
        print(f"{emotion.value}: {emoji_char}")
    print()
    
    # 所有动作类别
    print("所有动作:")
    for action_type, actions in pack.get_all_actions().items():
        print(f"{action_type}: {actions}")
