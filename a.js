// Senja.io Review Extraction Script - Optimized Version
const TARGET_URL = args.url || 'https://senja.io/p/empathia/FPhVcvz';
const MAX_TESTIMONIALS = args.maxTestimonials || 999999; // Default: extract all
const INCLUDE_METADATA = args.includeMetadata !== false;
const EXTRACTION_TIMEOUT = args.timeout || 30000;
const WAIT_FOR_LOAD = args.waitForLoad || 3000;

if (!TARGET_URL) {
  throw new Error('Target URL is required. Please provide args.url');
}

console.error(`💬 Starting Senja review extraction - Full extraction mode`);
console.error(`🎯 Target URL: ${TARGET_URL}`);
console.error(
  `📊 Extraction config: ${MAX_TESTIMONIALS >= 999999 ? 'Extract all reviews' : `Max ${MAX_TESTIMONIALS} reviews`}`,
);

// ==================== Helper Functions ====================
function getRandomDelay(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Simulate human-like scrolling behavior
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

// Simulate mouse movement
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

// Simplified content loading - since there's no pagination
async function ensureAllContentLoaded(page) {
  console.error(`🔄 Starting simplified content loading...`);

  // Get initial card count
  const initialCardCount = await page.evaluate(() => {
    return document.querySelectorAll('.sj-masonry-item .sj-text-card').length;
  });

  console.error(`📊 Initial card count: ${initialCardCount}`);

  // Single scroll to bottom to trigger any lazy loading
  console.error('📜 Scrolling to bottom to trigger lazy loading...');
  await page.evaluate(() => {
    window.scrollTo(0, document.body.scrollHeight);
  });

  // Wait for potential lazy loading
  await page.waitForTimeout(getRandomDelay(2000, 3000));

  // Check if more content was loaded
  const finalCardCount = await page.evaluate(() => {
    return document.querySelectorAll('.sj-masonry-item .sj-text-card').length;
  });

  console.error(`📊 Final card count: ${finalCardCount}`);

  if (finalCardCount > initialCardCount) {
    console.error(`✅ Loaded ${finalCardCount - initialCardCount} additional reviews`);
  } else {
    console.error(`✅ All content was already loaded`);
  }

  return finalCardCount;
}

// ==================== Main Logic ====================

try {
  console.error('🌐 Starting navigation with human-like behavior...');

  // Set additional HTTP headers
  await page.setExtraHTTPHeaders({
    'Accept-Language': 'en-US,en;q=0.9,zh-CN;q=0.8,zh;q=0.7',
  });

  // Navigate to page with relaxed waiting conditions
  await page.goto(TARGET_URL, {
    waitUntil: 'domcontentloaded', // Faster loading condition
    timeout: 30000,
  });

  // Random initial wait
  await page.waitForTimeout(getRandomDelay(1500, 3000));

  console.error('✅ Page loaded successfully');

  // Get basic page information
  const pageTitle = await page.title();
  const currentUrl = page.url();
  console.error(`📄 Page title: ${pageTitle}`);
  console.error(`🌐 Current URL: ${currentUrl}`);

  // Simulate initial mouse movement
  await simulateMouseMovement(
    page,
    Math.random() * 100,
    Math.random() * 100,
    Math.random() * 800 + 100,
    Math.random() * 400 + 100,
  );

  // Small initial scroll to simulate human behavior
  await humanScroll(page, getRandomDelay(100, 300), 'down');
  await page.waitForTimeout(getRandomDelay(500, 1000));

  // Wait for main content container, but not too strict
  console.error('🔍 Waiting for page content...');
  try {
    await page.waitForSelector('.sj-wol-testimonials, .sj-masonry, .sj-card-wall', {
      timeout: 15000,
    });
    console.error('✅ Found main content container');
  } catch (error) {
    console.error('⚠️ Main container wait timeout, trying to continue...');
  }

  // Wait for page stability
  await page.waitForTimeout(2000);

  // Check page structure
  const pageStructure = await page.evaluate(() => {
    return {
      hasWolTestimonials: !!document.querySelector('.sj-wol-testimonials'),
      hasMasonryItems: !!document.querySelector('.sj-masonry-item'),
      hasTextCards: !!document.querySelector('.sj-text-card'),
      totalCards: document.querySelectorAll('.sj-masonry-item .sj-text-card').length,
      totalMasonryItems: document.querySelectorAll('.sj-masonry-item').length,
    };
  });

  console.error('📊 Page structure:', JSON.stringify(pageStructure, null, 2));

  // Simplified content loading
  if (pageStructure.hasWolTestimonials) {
    await ensureAllContentLoaded(page);
  }

  // Wait for content stability
  await page.waitForTimeout(WAIT_FOR_LOAD);

  // Extract review data
  console.error('📤 Starting review data extraction...');
  const testimonials = await page.evaluate((maxTestimonials) => {
    const cards = document.querySelectorAll('.sj-masonry-item .sj-text-card');
    const results = [];

    // If maxTestimonials is very large, extract all cards
    const targetCount =
      maxTestimonials >= 999999 ? cards.length : Math.min(cards.length, maxTestimonials);
    console.log(`Found ${cards.length} review cards, preparing to extract ${targetCount}`);

    for (let i = 0; i < targetCount; i++) {
      const card = cards[i];

      try {
        // Extract review text - try multiple selectors
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

        // Extract author information
        const authorEl = card.querySelector('.sj-endorser-name');
        const author = authorEl ? authorEl.textContent.trim() : '';

        // Extract avatar
        const avatarEl = card.querySelector('.sj-avatar-container img, img[src*="avatar"]');
        const avatar = avatarEl ? avatarEl.src : '';
        const avatarAlt = avatarEl ? avatarEl.alt : '';

        // Extract rating
        const ratingEl = card.querySelector('.sj-star-rating, [class*="rating"], [class*="star"]');
        let rating = null;
        if (ratingEl) {
          const filledStars = ratingEl.querySelectorAll('svg').length;
          if (filledStars > 0) rating = filledStars;
        }

        // Extract date
        const dateEl = card.querySelector(
          '.sj-card-details div[style*="opacity"], [class*="date"], time',
        );
        const date = dateEl ? dateEl.textContent.trim() : '';

        // Extract title/description
        let title = '';
        const endorserContainer = card.querySelector('.sj-endorser-view-container');
        if (endorserContainer) {
          const titleEl = endorserContainer.querySelector(
            'div:not(.sj-endorser-name):not(.sj-avatar-container)',
          );
          if (titleEl && titleEl.textContent.trim() !== author) {
            title = titleEl.textContent.trim();
          }
        }

        // Check for attached images
        const attachmentEl = card.querySelector('.sj-attachment-container img, .sj-media');
        const attachment = attachmentEl ? attachmentEl.src : '';

        if (content || author) {
          // Save as long as there's content or author
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

          console.log(`✅ Extracted #${i + 1}: ${author} - ${content.substring(0, 30)}...`);
        } else {
          console.log(`⚠️ Review #${i + 1} has no valid content, skipping`);
        }
      } catch (error) {
        console.error(`❌ Error extracting review #${i + 1}:`, error);
      }
    }

    console.log(`🎯 Successfully extracted ${results.length} reviews`);
    return results;
  }, MAX_TESTIMONIALS);

  console.error(`✅ Extraction complete, obtained ${testimonials.length} reviews`);

  // Check JSON size
  const testimonialsJson = JSON.stringify(testimonials);
  const jsonSizeKB = Math.round(testimonialsJson.length / 1024);
  console.error(`📏 Review data size: ${jsonSizeKB}KB`);

  // Generate summary statistics
  const summary = {
    totalCount: testimonials.length,
    withContent: testimonials.filter((t) => t.content && t.content.trim()).length,
    withAuthor: testimonials.filter((t) => t.author && t.author !== 'Anonymous').length,
    withRating: testimonials.filter((t) => t.rating).length,
    withDate: testimonials.filter((t) => t.date).length,
    withAvatar: testimonials.filter((t) => t.avatar).length,
    withAttachment: testimonials.filter((t) => t.attachment).length,
  };

  console.error(`📊 === Data Summary ===`);
  console.error(`📝 Total reviews: ${summary.totalCount}`);
  console.error(`✍️ With content: ${summary.withContent}`);
  console.error(`👤 With author: ${summary.withAuthor}`);
  console.error(`⭐ With rating: ${summary.withRating}`);
  console.error(`📅 With date: ${summary.withDate}`);
  console.error(`🖼️ With avatar: ${summary.withAvatar}`);
  console.error(`📎 With attachment: ${summary.withAttachment}`);
  console.error(`==================`);

  // Build result object
  const result = {
    success: true,
    url: TARGET_URL,
    extractedAt: new Date().toISOString(),
    totalTestimonials: testimonials.length,
    dataSizeKB: jsonSizeKB,
    summary: summary,
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
    console.error('📊 Metadata extraction complete');
  }

  console.error('🎉 All tasks completed!');
  return result;
} catch (error) {
  console.error('❌ Error occurred during extraction:', error.message);

  // Get debug information
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
    console.error('🐛 Debug info:', JSON.stringify(debugInfo, null, 2));
  } catch (debugError) {
    console.error('⚠️ Cannot get debug information');
  }

  return {
    success: false,
    error: error.message,
    url: TARGET_URL,
    extractedAt: new Date().toISOString(),
  };
}
