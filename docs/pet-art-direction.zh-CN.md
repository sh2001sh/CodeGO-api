# Code Go 宠物美术方案

## 1. 结论

当前这版宠物之所以显得丑和粗糙，核心原因不是颜色，而是方法本身有上限：

1. 现在是前端里手写的小尺寸像素块，细节空间太少。
2. 16 只宠物虽然配色不同，但视觉语言仍然过于统一。
3. 它们更像“同一套模板换部件”，不像真正独立的角色。

推荐方案：

- 不再把“最终宠物形象”继续手写在前端代码里。
- 先确定 16 只宠物的形象规格。
- 用外部工具生成或绘制透明背景 PNG。
- 前端只保留展示层和状态层。

最推荐的生产路线是：

1. 先按本文档生成 16 张静态立绘。
2. 每张图做成统一尺寸的透明背景 PNG。
3. 第一阶段只替换图鉴、首页、成就、盲盒页中的宠物图。
4. 第二阶段再补 2 帧或 4 帧待机动画。

## 2. 为什么不建议继续用当前方式

### 2.1 不适合做品牌角色

像 `Sprite-Generator` 这种项目更适合“程序化随机精灵”或机器人、飞船、龙这类模板化对象，不适合做需要记忆点和性格的品牌宠物。

它的核心方法是：

- 用二维 mask 模板
- 随机填充
- 镜像生成

这类方法适合批量生成“像素物件”，不适合做 16 只需要长期运营、能被用户记住的主角宠物。

## 3. 推荐的资产生产流程

### 方案 A：生成后人工精选，推荐

适合你现在的情况。

流程：

1. 用本文档里的 16 只描述生成首版图片
2. 每只生成 4 到 8 张候选
3. 选 1 张最合适的
4. 放进 Aseprite 或 Piskel 做像素化修整
5. 导出透明 PNG

优点：

- 出图快
- 角色差异大
- 风格更容易统一

### 方案 B：纯像素手绘

流程：

1. 先画黑白剪影
2. 再定 4 到 6 色小调色板
3. 再做 48x48 或 64x64 像素正面立绘
4. 最后导出 PNG

优点：

- 像素味最纯
- 可控性最高

缺点：

- 慢
- 16 只全部手工成本高

### 方案 C：继续前端代码画 SVG 像素

不推荐继续投入。

原因：

- 每改一只都要改代码
- 很难画出精细体积
- 很难保证“可爱”“丑萌”“像素感”同时成立

## 4. 分辨率与风格标准

建议统一如下：

- 画布：`64x64`
- 输出：透明背景 PNG
- 主视角：正面或微 3/4 视角
- 风格：像素风、类掌机 RPG 精灵图鉴风格
- 线条：清晰外轮廓，不要脏边
- 配色：每只宠物 `4~7` 个主色
- 明暗：至少 3 阶亮度
- 表情：大眼、短嘴、小鼻、圆润肢体，整体偏可爱
- 统一规则：头身比偏大，四肢偏短，适合做收藏图鉴

不要做成：

- 写实动物
- 厚重欧美怪物
- 高复杂度机甲
- 完全照搬宝可梦现有角色

可以参考的方向是：

- 宝可梦早期图鉴精灵的“轮廓识别度”
- 掌机像素游戏里“头大身小”的可爱怪物
- 一眼能靠耳朵、尾巴、头冠、背鳍、角、翅膀区分种类

## 5. 统一生成提示词模板

下面这个模板适合给图像模型或画师：

```text
一只可爱的原创像素风宠物，64x64 sprite style，transparent background，front-facing or slight 3/4 view，big head small body，clear silhouette，clean outline，limited palette，retro handheld RPG monster sprite，cute but slightly goofy，high readability，polished pixel shading，no text，no UI，no frame，no background scene
```

负面约束：

```text
no realistic fur, no photo, no painterly brush, no blurry edges, no heavy rendering, no 3d model, no full background, no text, no watermark, not copied pokemon character, not exact pokemon species, not human-like anime idol
```

## 6. 16 只宠物的详细形状描述

下面每只都按“轮廓、脸、身体、标志物、气质”来写，方便直接喂给生成模型。

---

## 6.1 火花犬

定位：第一只新手宠，像“代码世界的入门搭子”

形状描述：

- 小型犬轮廓，头大身体短
- 两只耳朵像向上翘起的小火苗，不对称更灵动
- 脸是圆角三角形，鼻口区短，嘴巴小
- 眼睛偏大，黑色高光眼，表情兴奋
- 脸颊两侧有小小橙红色腮红
- 背上有一撮像打火星一样的毛尖
- 尾巴像一小簇火焰，末端更亮
- 四肢很短，站姿前倾，像要冲出去

关键词：

```text
cute pixel fire puppy, oversized head, flame-shaped ears, tiny paws, short muzzle, glowing tail tip, cheerful starter monster
```

---

## 6.2 字节獭

定位：抱着键帽、喜欢滚来滚去的水獭宠

形状描述：

- 整体是横向椭圆身体，像一只坐着的小水獭
- 头圆，耳朵很小，贴头
- 双手抱着一个方形键帽或代码芯片块
- 嘴巴是小小的 “w” 形
- 腹部是明显的浅色圆肚皮
- 尾巴宽扁，像小划水板，从身体一侧伸出
- 眼神偏呆萌，像“我在认真抱住这个键帽”

关键词：

```text
cute pixel otter mascot, holding a keyboard keycap, round head, creamy belly, flat tail, nerdy but adorable
```

---

## 6.3 回声猫

定位：稳定输出型中前期主力宠

形状描述：

- 猫科轮廓，但比真实猫更圆
- 大三角耳，耳尖微向外
- 眼睛半眯，像聪明又懒散
- 胸口或额头有一圈“回声波纹”形状的斑纹
- 尾巴末端分叉成双音叉一样的形状
- 身体中等偏瘦，站姿很稳
- 表情是“我知道你下一步要调用什么模型”

关键词：

```text
cute pixel cat spirit, large triangle ears, forked tail tip, echo-wave markings, calm intelligent expression
```

---

## 6.4 夜巡枭

定位：千次调用后的夜班巡逻宠

形状描述：

- 猫头鹰轮廓，但做成胖乎乎圆柱体身体
- 脸像面罩，眼圈很大
- 眼睛发亮，但不要凶，偏认真
- 头顶两边有小羽角
- 翅膀短而厚，像披风
- 身体底部有短小爪子
- 整体像一个熬夜盯日志的小守卫

关键词：

```text
cute pixel night owl, large face mask, glowing round eyes, tiny talons, cloak-like wings, vigilant but cute
```

---

## 6.5 薄荷蜥

定位：轻量消耗成就宠，灵巧型

形状描述：

- 小蜥蜴外形，头窄一点，身体细长
- 眼睛大，略偏斜，表现机灵
- 头顶和背部有叶片状小鳍
- 尾巴细长，尾尖卷曲
- 前爪小，像在轻轻扒地
- 背部带浅色斑点，像薄荷叶纹路

关键词：

```text
cute pixel mint lizard, leaf-like crest, curled tail tip, agile small body, fresh fantasy reptile
```

---

## 6.6 可可豚

定位：笨拙但耐用的中程宠

形状描述：

- 野猪和小河豚的混合感，整体圆滚滚
- 鼻子偏大但短，不要真实獠牙，只留两颗小牙点缀
- 眼睛很小但表情憨
- 背部略拱，身体像一团可可豆
- 耳朵短圆
- 四肢短粗，站稳

关键词：

```text
cute pixel chubby boar creature, round cocoa-bean body, tiny tusks, short legs, goofy and dependable
```

---

## 6.7 铸光虎机

定位：重度开发向，高记忆点大猫

形状描述：

- 老虎或大型猫科轮廓，但做成幼兽体型
- 额头有锻造火花形斑纹
- 身上条纹不是自然虎纹，而是几何发光条纹
- 耳朵偏尖，肩膀宽一点
- 尾巴粗，尾尖发亮
- 姿势挺胸，像“主力前排”

关键词：

```text
cute pixel tiger cub monster, geometric glowing stripes, broad chest, forge spark markings, heroic but adorable
```

---

## 6.8 契约龟

定位：套餐系长期陪伴宠

形状描述：

- 乌龟轮廓，但壳做得更精致
- 龟壳像徽章或契约印章，正中有符文或几何章纹
- 头圆，眼睛友善
- 四肢像软软的圆柱
- 可以带一个小冠片或肩甲感装饰
- 整体像稳重的守约伙伴

关键词：

```text
cute pixel turtle mascot, ornate shell emblem, contract seal motif, steady guardian vibe, soft rounded limbs
```

---

## 6.9 缎带狐

定位：套餐收藏系，偏华丽但不能太媚

形状描述：

- 狐狸轮廓，耳朵长而尖
- 脖子或尾巴根部有缎带状毛束
- 尾巴大而蓬，尾尖有两段色阶
- 眼睛细长但柔和
- 身形轻盈，站姿优雅
- 可以有一侧耳朵挂小结饰

关键词：

```text
cute pixel fox spirit, ribbon-like fur, large fluffy tail, elegant pose, stylish but still playful
```

---

## 6.10 软糖鲨

定位：盲盒新手宠，偏活泼

形状描述：

- 鲨鱼轮廓，但头大身短，像陆地萌物
- 背鳍明显，尾鳍圆润
- 嘴巴宽但不要尖牙外露太多，只点两三颗小牙
- 腮部可做成果冻分层质感
- 身体下半部浅色
- 表情像“想再拆一个盒子”

关键词：

```text
cute pixel gummy shark, oversized head, rounded fins, tiny visible teeth, jelly-like layered body
```

---

## 6.11 棱团怪

定位：盲盒常驻宠，带一点怪但不能吓人

形状描述：

- 主体像一团半透明史莱姆加棱晶
- 顶部有几个不规则晶体尖角
- 身体轮廓不是圆形，而是下宽上窄
- 眼睛大而间距略宽，显得呆
- 腹部可做半透明亮芯
- 像一坨会弹来弹去的彩色凝胶

关键词：

```text
cute pixel prism slime, chunky crystal bumps, translucent core, goofy eyes, bouncy blob creature
```

---

## 6.12 流星啾

定位：盲盒大奖宠，传说感

形状描述：

- 小鸟轮廓，但更像天体精灵
- 头顶有流星尾迹一样的羽冠
- 翅膀短，但边缘像星屑散开
- 眼睛圆亮，神情自信
- 尾巴细长并拖出一小截流光
- 身体不要胖，要轻盈精致

关键词：

```text
cute pixel star bird, comet crest, sparkling wing edges, trailing starlight tail, legendary but tiny
```

---

## 6.13 联机鹦

定位：邀请社交宠，热闹型

形状描述：

- 鹦鹉轮廓，嘴稍大但圆润
- 头顶冠羽分成三片，像聊天气泡
- 双翼颜色鲜明，像在招手
- 眼神热情，不要高冷
- 尾羽多层但短
- 姿势略向前探，像想和人打招呼

关键词：

```text
cute pixel social parrot, rounded beak, chat-bubble crest, welcoming wing pose, friendly energetic expression
```

---

## 6.14 彩纸豚

定位：高邀请成就宠，庆典感

形状描述：

- 水豚轮廓，但更圆更短
- 头顶或背上有彩纸礼花一样的小装饰
- 鼻口宽，表情佛系微笑
- 身体敦实，像一团会走路的庆祝包
- 尾巴几乎看不见
- 肚子偏浅色，整体很治愈

关键词：

```text
cute pixel festive capybara, confetti decorations, calm smile, chunky body, celebration mascot
```

---

## 6.15 云团兔

定位：连续签到宠，值班型可爱角色

形状描述：

- 兔子轮廓，长耳是最大特征
- 耳朵像云朵边缘，末端圆而蓬
- 脸很软，眼睛圆润
- 身体像小棉花团
- 脚掌小且短
- 可在脸边做轻云纹或雾感装饰

关键词：

```text
cute pixel cloud rabbit, fluffy cloud-like ears, cotton body, soft dreamy face, gentle daily companion
```

---

## 6.16 像素龙

定位：月签到终阶主宠，最终守护者

形状描述：

- 幼龙轮廓，头冠、角、翅膀、尾巴都要有，但整体仍然可爱
- 角短而厚，不要尖锐成人化
- 翅膀小而精致，像收藏图鉴里的终阶吉祥物
- 胸口有亮色核心鳞片
- 尾巴末端可以是星形或焰形
- 姿态挺立，但眼睛不能凶，要有“可靠守护者”感觉

关键词：

```text
cute pixel baby dragon, short horns, tiny wings, glowing chest scale, guardian mascot, final legendary companion
```

## 7. 推荐生成参数

如果你交给图像模型生成，建议这样控制：

- 每只生成 `4~8` 张候选
- 尺寸：先高分辨率生成，再缩到 `64x64` 或 `96x96`
- 背景：透明或纯白方便扣图
- 构图：单角色居中
- 不要道具堆太多
- 不要全身动作太夸张

## 8. 后续落地建议

### 第一阶段

- 只替换首页、成就页、盲盒页、说明文档里的宠物图
- 每只先做单帧静态图

### 第二阶段

- 给当前出战宠物做 `2 帧待机`
- 盲盒页大奖宠和首页主宠做轻动画

### 第三阶段

- 宠物升级后切换不同外观层级
- 同一只宠物 1~5 级外观逐步增强

## 9. 我建议你现在就这样做

最实用方案：

1. 用本文档的 16 只描述去批量生成第一版
2. 每只挑 1 张
3. 我再帮你统一做命名、尺寸、透明底、前端接入规范

如果你要，我下一步可以继续直接给你：

- 一份 **更适合 Midjourney / GPT Image / 即梦 / SDXL 的逐只提示词版本**
- 一份 **适合像素画师的外包 Brief 版本**
- 一份 **前端资源命名与替换规范**

