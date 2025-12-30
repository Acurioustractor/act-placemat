/**
 * Rate Limiter Utility
 * Prevents hitting Gmail API rate limits by batching requests
 */

/**
 * Process items in batches with delay between batches
 * @param {Array} items - Items to process
 * @param {Function} processor - Async function to process each item
 * @param {number} batchSize - Number of items per batch
 * @param {number} delayMs - Delay between batches in milliseconds
 */
export async function processBatches(items, processor, batchSize = 10, delayMs = 1000) {
  const results = [];

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);

    console.log(`[Rate Limiter] Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(items.length / batchSize)} (${batch.length} items)`);

    // Process batch in parallel
    const batchResults = await Promise.all(
      batch.map(item => processor(item).catch(err => {
        console.error(`[Rate Limiter] Error processing item:`, err.message);
        return null; // Return null for failed items
      }))
    );

    results.push(...batchResults.filter(r => r !== null));

    // Delay before next batch (except for last batch)
    if (i + batchSize < items.length) {
      console.log(`[Rate Limiter] Waiting ${delayMs}ms before next batch...`);
      await sleep(delayMs);
    }
  }

  return results;
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry a function with exponential backoff
 */
export async function retryWithBackoff(fn, maxRetries = 3, baseDelay = 1000) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries - 1) throw error;

      const delay = baseDelay * Math.pow(2, attempt);
      console.log(`[Retry] Attempt ${attempt + 1} failed, retrying in ${delay}ms...`);
      await sleep(delay);
    }
  }
}
