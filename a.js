// Senja.io 评论提取脚本 - 实用版（参考Amazon脚本模式）
const TARGET_URL = args.url || 'https://senja.io/p/empathia/FPhVcvz';
const MAX_TESTIMONIALS = args.maxTestimonials || 999999; // 默认抓取所有
const INCLUDE_METADATA = args.includeMetadata !== false;
const SCROLL_TO_LOAD = args.scrollToLoad !== false;
const EXTRACTION_TIMEOUT = args.timeout || 30000;
const WAIT_FOR_LOAD = args.waitForLoad || 3000;

if (!TARGET_URL) {
  throw new Error('目标URL是必需的。请提供 args.url');
}

console.error(`💬 开始提取Senja评论 - 全量抓取模式`);
console.error(`🎯 目标URL: ${TARGET_URL}`);
console.error(
  `📊 抓取配置: ${MAX_TESTIMONIALS >= 999999 ? '抓取所有评论' : `最多抓取 ${MAX_TESTIMONIALS} 条`}`
);

// ==================== 辅助函数 ====================
function getRandomDelay(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// 模拟人类滚动行为
async function humanScroll(page, distance, direction = 'down') {
  const scrollSteps = Math.floor(Math.abs(distance) / 100);
  const scrollDirection = direction === 'down' ? 1 : -1;

  for (let i = 0; i < scrollSteps; i++) {
    const scrollAmount = getRandomDelay(80, 120) * scrollDirection;
    await page.evaluate((amount) => {
      window.scrollBy(0, amount);
    }, scrollAmount);
    await page.waitForTimeout(getRandomDelay(50, 150));
  }
}

// 模拟鼠标移动
async function simulateMouseMovement(page, fromX, fromY, toX, toY) {
  const steps = 20;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const currentX = fromX + (toX - fromX) * t + Math.random() * 10 - 5;
    const currentY = fromY + (toY - fromY) * t + Math.random() * 10 - 5;
    await page.mouse.move(currentX, currentY);
    await page.waitForTimeout(getRandomDelay(10, 30));
  }
}

async function autoScrollToLoadContent(page) {
  let previousHeight = 0;
  let currentHeight = await page.evaluate(() => document.body.scrollHeight);
  let scrollAttempts = 0;
  let stableCount = 0; // 连续稳定次数
  const maxScrollAttempts = 20; // 增加最大尝试次数
  const maxStableCount = 3; // 连续3次高度不变才停止

  console.error(`🔄 开始智能滚动加载，初始高度: ${currentHeight}px`);

  while (scrollAttempts < maxScrollAttempts && stableCount < maxStableCount) {
    previousHeight = currentHeight;

    // 检查当前页面的评论卡片数量
    const currentCardCount = await page.evaluate(() => {
      return document.querySelectorAll('.sj-masonry-item .sj-text-card').length;
    });

    // 人类化滚动 - 分多次小幅度滚动
    for (let i = 0; i < 3; i++) {
      await humanScroll(page, getRandomDelay(200, 400), 'down');
      await page.waitForTimeout(getRandomDelay(800, 1500));
    }

    // 滚动到页面底部确保触发懒加载
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });

    // 等待内容加载
    await page.waitForTimeout(getRandomDelay(2000, 4000));

    // 检查高度变化
    currentHeight = await page.evaluate(() => document.body.scrollHeight);

    // 检查新的评论卡片数量
    const newCardCount = await page.evaluate(() => {
      return document.querySelectorAll('.sj-masonry-item .sj-text-card').length;
    });

    scrollAttempts++;

    if (currentHeight === previousHeight && newCardCount === currentCardCount) {
      stableCount++;
      console.error(
        `📜 滚动尝试 ${scrollAttempts}: 高度稳定 ${currentHeight}px, 卡片数量: ${newCardCount}, 稳定次数: ${stableCount}/${maxStableCount}`
      );
    } else {
      stableCount = 0; // 重置稳定计数
      console.error(
        `📜 滚动尝试 ${scrollAttempts}: 高度 ${previousHeight}px → ${currentHeight}px, 卡片数量: ${currentCardCount} → ${newCardCount}`
      );
    }

    // 如果连续多次没有新内容，尝试更激进的滚动
    if (stableCount >= 2) {
      console.error('🚀 尝试激进滚动以加载更多内容...');
      // 快速滚动到顶部再到底部
      await page.evaluate(() => {
        window.scrollTo(0, 0);
      });
      await page.waitForTimeout(1000);
      await page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight);
      });
      await page.waitForTimeout(3000);
    }
  }

  const finalCardCount = await page.evaluate(() => {
    return document.querySelectorAll('.sj-masonry-item .sj-text-card').length;
  });

  console.error(
    `✅ 滚动完成! 总尝试次数: ${scrollAttempts}, 最终高度: ${currentHeight}px, 总评论卡片: ${finalCardCount}`
  );
}

// ==================== 主逻辑 - 参考Amazon脚本模式 ====================

try {
  console.error('🌐 开始导航，使用人类化行为...');

  // 设置额外的HTTP头
  await page.setExtraHTTPHeaders({
    'Accept-Language': 'en-US,en;q=0.9,zh-CN;q=0.8,zh;q=0.7',
  });

  // 导航到页面 - 使用更宽松的等待条件
  await page.goto(TARGET_URL, {
    waitUntil: 'domcontentloaded', // 更快的加载条件
    timeout: 30000,
  });

  // 随机初始等待
  await page.waitForTimeout(getRandomDelay(1500, 3000));

  console.error('✅ 页面加载完成');

  // 获取页面基本信息
  const pageTitle = await page.title();
  const currentUrl = page.url();
  console.error(`📄 页面标题: ${pageTitle}`);
  console.error(`🌐 当前URL: ${currentUrl}`);

  // 模拟初始鼠标移动
  await simulateMouseMovement(
    page,
    Math.random() * 100,
    Math.random() * 100,
    Math.random() * 800 + 100,
    Math.random() * 400 + 100
  );

  // 小幅度初始滚动，模拟人类行为
  await humanScroll(page, getRandomDelay(100, 300), 'down');
  await page.waitForTimeout(getRandomDelay(500, 1000));

  // 等待主要内容容器，但不要太严格
  console.error('🔍 等待页面内容...');
  try {
    await page.waitForSelector('.sj-wol-testimonials, .sj-masonry, .sj-card-wall', {
      timeout: 15000,
    });
    console.error('✅ 找到主要内容容器');
  } catch (error) {
    console.error('⚠️ 主容器等待超时，尝试继续...');
  }

  // 等待页面稳定
  await page.waitForTimeout(2000);

  // 检查页面结构
  const pageStructure = await page.evaluate(() => {
    return {
      hasWolTestimonials: !!document.querySelector('.sj-wol-testimonials'),
      hasMasonryItems: !!document.querySelector('.sj-masonry-item'),
      hasTextCards: !!document.querySelector('.sj-text-card'),
      totalCards: document.querySelectorAll('.sj-masonry-item .sj-text-card').length,
      totalMasonryItems: document.querySelectorAll('.sj-masonry-item').length,
    };
  });

  console.error('📊 页面结构:', JSON.stringify(pageStructure, null, 2));

  // 滚动加载更多内容
  if (SCROLL_TO_LOAD && pageStructure.hasWolTestimonials) {
    console.error('🔄 开始滚动加载更多评论...');
    await autoScrollToLoadContent(page);

    // 滚动后再次检查
    const updatedStructure = await page.evaluate(() => {
      return {
        totalCards: document.querySelectorAll('.sj-masonry-item .sj-text-card').length,
        totalMasonryItems: document.querySelectorAll('.sj-masonry-item').length,
      };
    });
    console.error('📊 滚动后结构:', JSON.stringify(updatedStructure, null, 2));
  }

  // 等待内容稳定
  await page.waitForTimeout(WAIT_FOR_LOAD);

  // 提取评论数据
  console.error('📤 开始提取评论数据...');
  const testimonials = await page.evaluate((maxTestimonials) => {
    const cards = document.querySelectorAll('.sj-masonry-item .sj-text-card');
    const results = [];

    // 如果maxTestimonials很大，就提取所有卡片
    const targetCount =
      maxTestimonials >= 999999 ? cards.length : Math.min(cards.length, maxTestimonials);
    console.log(`找到 ${cards.length} 个评论卡片，准备提取 ${targetCount} 个`);

    for (let i = 0; i < targetCount; i++) {
      const card = cards[i];

      try {
        // 提取评论文本 - 尝试多个选择器
        let content = '';
        const contentSelectors = [
          '.sj-content div div',
          '.sj-content div',
          '.sj-content',
          '[class*="content"]',
        ];

        for (const selector of contentSelectors) {
          const contentEl = card.querySelector(selector);
          if (contentEl && contentEl.textContent.trim()) {
            content = contentEl.textContent.trim();
            break;
          }
        }

        // 提取作者信息
        const authorEl = card.querySelector('.sj-endorser-name');
        const author = authorEl ? authorEl.textContent.trim() : '';

        // 提取头像
        const avatarEl = card.querySelector('.sj-avatar-container img, img[src*="avatar"]');
        const avatar = avatarEl ? avatarEl.src : '';
        const avatarAlt = avatarEl ? avatarEl.alt : '';

        // 提取评分
        const ratingEl = card.querySelector('.sj-star-rating, [class*="rating"], [class*="star"]');
        let rating = null;
        if (ratingEl) {
          const filledStars = ratingEl.querySelectorAll('svg').length;
          if (filledStars > 0) rating = filledStars;
        }

        // 提取日期
        const dateEl = card.querySelector(
          '.sj-card-details div[style*="opacity"], [class*="date"], time'
        );
        const date = dateEl ? dateEl.textContent.trim() : '';

        // 提取职位/描述
        let title = '';
        const endorserContainer = card.querySelector('.sj-endorser-view-container');
        if (endorserContainer) {
          const titleEl = endorserContainer.querySelector(
            'div:not(.sj-endorser-name):not(.sj-avatar-container)'
          );
          if (titleEl && titleEl.textContent.trim() !== author) {
            title = titleEl.textContent.trim();
          }
        }

        // 检查是否有附加图片
        const attachmentEl = card.querySelector('.sj-attachment-container img, .sj-media');
        const attachment = attachmentEl ? attachmentEl.src : '';

        if (content || author) {
          // 只要有内容或作者就保存
          results.push({
            id: `testimonial_${i + 1}`,
            content: content,
            author: author || 'Anonymous',
            avatar: avatar,
            avatarAlt: avatarAlt,
            rating: rating,
            date: date,
            title: title,
            attachment: attachment,
            source: 'senja.io',
            extractedAt: new Date().toISOString(),
          });

          console.log(`✅ 提取第 ${i + 1} 条: ${author} - ${content.substring(0, 30)}...`);
        } else {
          console.log(`⚠️ 第 ${i + 1} 条评论无有效内容，跳过`);
        }
      } catch (error) {
        console.error(`❌ 提取第 ${i + 1} 条评论时出错:`, error);
      }
    }

    console.log(`🎯 成功提取 ${results.length} 条评论`);
    return results;
  }, MAX_TESTIMONIALS);

  console.error(`✅ 提取完成，获得 ${testimonials.length} 条评论`);

  // 构建结果对象
  const result = {
    success: true,
    url: TARGET_URL,
    extractedAt: new Date().toISOString(),
    totalTestimonials: testimonials.length,
    testimonials: testimonials,
  };

  if (INCLUDE_METADATA) {
    const metadata = await page.evaluate(() => {
      return {
        title: document.title,
        description: document.querySelector('meta[name="description"]')?.content || '',
        pageHeight: document.body.scrollHeight,
        totalCards: document.querySelectorAll('.sj-masonry-item .sj-text-card').length,
        totalMasonryItems: document.querySelectorAll('.sj-masonry-item').length,
        url: window.location.href,
        extractedAt: new Date().toISOString(),
      };
    });

    result.metadata = metadata;
    console.error('📊 元数据提取完成');
  }

  console.error('🎉 所有任务完成!');
  return result;
} catch (error) {
  console.error('❌ 提取过程中发生错误:', error.message);

  // 获取调试信息
  try {
    const debugInfo = await page.evaluate(() => {
      return {
        url: window.location.href,
        title: document.title,
        hasContent: document.body.innerHTML.length > 0,
        totalElements: document.querySelectorAll('*').length,
        hasTestimonialContainer: !!document.querySelector('.sj-wol-testimonials'),
      };
    });
    console.error('🐛 调试信息:', JSON.stringify(debugInfo, null, 2));
  } catch (debugError) {
    console.error('⚠️ 无法获取调试信息');
  }

  return {
    success: false,
    error: error.message,
    url: TARGET_URL,
    extractedAt: new Date().toISOString(),
  };
}
