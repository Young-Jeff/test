// Senja.io 评论提取脚本 - 修正版
const TARGET_URL = args.url || 'https://senja.io/p/empathia/FPhVcvz';
const MAX_TESTIMONIALS = args.maxTestimonials || 50;
const INCLUDE_METADATA = args.includeMetadata !== false;
const SCROLL_TO_LOAD = args.scrollToLoad !== false;
const EXTRACTION_TIMEOUT = args.timeout || 30000;
const WAIT_FOR_LOAD = args.waitForLoad || 3000;

if (!TARGET_URL) {
  throw new Error('目标URL是必需的。请提供 args.url');
}

console.error(`💬 开始提取Senja评论`);
console.error(`🎯 目标URL: ${TARGET_URL}`);

function getRandomDelay(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function autoScrollToLoadContent(page) {
  let previousHeight = 0;
  let currentHeight = await page.evaluate(() => document.body.scrollHeight);
  let scrollAttempts = 0;
  const maxScrollAttempts = 10;

  while (previousHeight !== currentHeight && scrollAttempts < maxScrollAttempts) {
    previousHeight = currentHeight;

    // 滚动到页面底部
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });

    // 等待内容加载
    await page.waitForTimeout(getRandomDelay(2000, 4000));

    currentHeight = await page.evaluate(() => document.body.scrollHeight);
    scrollAttempts++;

    console.error(`📜 滚动尝试 ${scrollAttempts}: 高度从 ${previousHeight} 变为 ${currentHeight}`);
  }

  console.error(`✅ 滚动完成，共尝试 ${scrollAttempts} 次`);
}

async function extractTestimonials() {
  try {
    // 导航到目标页面
    console.error('🚀 导航到目标页面...');
    await page.goto(TARGET_URL, {
      waitUntil: 'networkidle2',
      timeout: EXTRACTION_TIMEOUT
    });

    // 等待评论容器
    await page.waitForSelector('.sj-wol-testimonials', { timeout: EXTRACTION_TIMEOUT });
    console.error('✅ 找到评论容器');

    // 滚动加载更多评论
    if (SCROLL_TO_LOAD) {
      console.error('🔄 开始滚动加载更多评论...');
      await autoScrollToLoadContent(page);
    }

    // 等待内容稳定
    await page.waitForTimeout(WAIT_FOR_LOAD);

    // 提取评论数据
    const testimonials = await page.evaluate((maxTestimonials) => {
      // 使用正确的选择器：.sj-masonry-item 内的 .sj-text-card
      const cards = document.querySelectorAll('.sj-masonry-item .sj-text-card');
      const results = [];

      for (let i = 0; i < Math.min(cards.length, maxTestimonials); i++) {
        const card = cards[i];

        try {
          // 提取评论文本 - 从 .sj-content 内的 div
          const contentEl = card.querySelector('.sj-content div div');
          const content = contentEl ? contentEl.textContent.trim() : '';

          // 提取作者信息 - 从 .sj-endorser-name
          const authorEl = card.querySelector('.sj-endorser-name');
          const author = authorEl ? authorEl.textContent.trim() : '';

          // 提取头像 - 从 .sj-avatar-container img
          const avatarEl = card.querySelector('.sj-avatar-container img');
          const avatar = avatarEl ? avatarEl.src : '';
          const avatarAlt = avatarEl ? avatarEl.alt : '';

          // 提取评分 - 从星级评分容器
          const ratingEl = card.querySelector('.sj-star-rating');
          let rating = null;
          if (ratingEl) {
            // 计算填充的星星数量或查找评分数据
            const filledStars = ratingEl.querySelectorAll('svg').length;
            if (filledStars > 0) rating = filledStars;
          }

          // 提取日期 - 从 .sj-card-details 的第一个 div
          const dateEl = card.querySelector('.sj-card-details div[style*="opacity"]');
          const date = dateEl ? dateEl.textContent.trim() : '';

          // 提取职位/描述 - 查找作者相关的描述信息
          const endorserContainer = card.querySelector('.sj-endorser-view-container');
          let title = '';
          if (endorserContainer) {
            const titleEl = endorserContainer.querySelector('div:not(.sj-endorser-name):not(.sj-avatar-container)');
            if (titleEl && titleEl.textContent.trim() !== author) {
              title = titleEl.textContent.trim();
            }
          }

          // 检查是否有附加图片
          const attachmentEl = card.querySelector('.sj-attachment-container img');
          const attachment = attachmentEl ? attachmentEl.src : '';

          if (content) {
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
              extractedAt: new Date().toISOString()
            });
          }
        } catch (error) {
          console.error(`Error extracting testimonial ${i + 1}:`, error);
        }
      }

      return results;
    }, MAX_TESTIMONIALS);

    console.error(`✅ 成功提取 ${testimonials.length} 条评论`);

    // 构建结果对象
    const result = {
      success: true,
      url: TARGET_URL,
      extractedAt: new Date().toISOString(),
      totalTestimonials: testimonials.length,
      testimonials: testimonials
    };

    if (INCLUDE_METADATA) {
      // 提取页面元数据
      const metadata = await page.evaluate(() => {
        return {
          title: document.title,
          description: document.querySelector('meta[name="description"]')?.content || '',
          pageHeight: document.body.scrollHeight,
          totalCards: document.querySelectorAll('.sj-masonry-item .sj-text-card').length
        };
      });

      result.metadata = metadata;
    }

    console.error('🎉 评论提取完成!');
    return result;

  } catch (error) {
    console.error('❌ 提取过程中发生错误:', error);
    return {
      success: false,
      error: error.message,
      url: TARGET_URL,
      extractedAt: new Date().toISOString()
    };
  }
}

// 执行提取
const result = await extractTestimonials();
return result;
