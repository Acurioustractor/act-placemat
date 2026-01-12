/**
 * Test partial tag matching logic
 */

const julieTagsLower = [
  'advocacy', 'arts', 'business', 'educator',
  'government', 'justice', 'leader', 'practitioner',
  'technology', 'youth', 'youth_justice'
];

const piccTags = [
  'indigenous', 'youth_justice', 'mentoring',
  'cultural', 'storytelling', 'community', 'palm_island'
];

console.log('TESTING PARTIAL TAG MATCHING\n');
console.log('='.repeat(80));

for (const tag of piccTags) {
  const tagLower = tag.toLowerCase();

  console.log(`\n🔍 PICC tag: "${tag}"`);

  // Exact match
  if (julieTagsLower.includes(tagLower)) {
    console.log(`  ✅ EXACT MATCH in Julie's tags`);
    continue;
  }

  // Partial match test
  const partialMatches = julieTagsLower.filter(contactTag => {
    const tagWithSpaces = tagLower.replace(/_/g, ' ');
    return tagLower.includes(contactTag) || contactTag.includes(tagWithSpaces);
  });

  if (partialMatches.length > 0) {
    console.log(`  ✅ PARTIAL MATCH: ${partialMatches.join(', ')}`);
  } else {
    console.log(`  ❌ No match`);
  }
}

console.log('\n' + '='.repeat(80));
console.log('\nEXPECTED MATCHES:');
console.log('  • youth_justice: EXACT match ✅');
console.log('  • mentoring: NO match (Julie has "educator" but not "mentoring") ❌');
console.log('  • cultural: NO match ❌');
console.log('  • storytelling: NO match (Julie has "arts" but not "storytelling") ❌');
console.log('  • community: NO match ❌');
console.log('  • palm_island: NO match ❌');
console.log('  • indigenous: NO match ❌');
