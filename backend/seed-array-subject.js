const mongoose = require('mongoose');
require('dotenv').config();

const Subject = require('./models/Subject');
const Topic = require('./models/Topic');
const Question = require('./models/Question');

const lc = (number) => `https://leetcode.com/problems/${number}/`;
const gfg = (query) => `https://www.google.com/search?q=site%3Ageeksforgeeks.org+${encodeURIComponent(query)}`;

const levels = [
  {
    name: 'Level 0 - Absolute Basics',
    description: 'Array syntax, indexing, traversal, input/output, and foundational operations.',
    questions: [
      ['Array Declaration and Memory Allocation (1D Array)', 'Easy', 'Concept', ''],
      ['Zero-Based Indexing and N-1 Traversal', 'Easy', 'Concept', ''],
      ['Index Out of Bounds: Identify and Fix', 'Easy', 'Concept', ''],
      ['Array Input and Output', 'Easy', 'Fundamentals', ''],
      ['Array Sum and Average', 'Easy', 'Fundamentals', ''],
      ['Linear Search', 'Easy', 'Fundamentals', ''],
      ['Count Even, Odd, and Frequency of a Value', 'Easy', 'Fundamentals', ''],
      ['Reverse Print an Array', 'Easy', 'Fundamentals', ''],
      ['Find Maximum and Minimum Element', 'Easy', 'Fundamentals', '']
    ]
  },
  {
    name: 'Level 1 - Basic Two Pointers and Observation',
    description: 'In-place changes, array arrangement, rotation, and sorted-array observations.',
    questions: [
      ['Swap Elements at Two Indices', 'Easy', 'Fundamentals', ''],
      ['Reverse an Array In-Place', 'Easy', 'Two Pointers', ''],
      ['Copy and Clone an Array', 'Easy', 'Fundamentals', ''],
      ['Largest and Second Largest Element', 'Easy', 'Array', gfg('largest and second largest element in an array')],
      ['Check if an Array Is Sorted', 'Easy', 'Array', gfg('check if an array is sorted')],
      ['Check if Array Is Sorted and Rotated', 'Easy', 'LeetCode', lc('check-if-array-is-sorted-and-rotated')],
      ['Left Rotate an Array by One', 'Easy', 'Array', gfg('left rotate an array by one')],
      ['Right Rotate an Array by One', 'Easy', 'Array', gfg('right rotate an array by one')],
      ['Rotate Array by K Places', 'Medium', 'LeetCode', lc('rotate-array')]
    ]
  },
  {
    name: 'Level 2 - Core Interview Templates',
    description: 'Read-write pointers, opposite-end pointers, sliding windows, and prefix sums.',
    questions: [
      ['Move Zeroes to the End', 'Easy', 'LeetCode', lc('move-zeroes')],
      ['Remove Duplicates from Sorted Array', 'Easy', 'LeetCode', lc('remove-duplicates-from-sorted-array')],
      ['Remove Duplicates II (At Most Twice)', 'Medium', 'LeetCode', lc('remove-duplicates-from-sorted-array-ii')],
      ['Sort Array of 0s, 1s, and 2s (Dutch National Flag)', 'Medium', 'LeetCode', lc('sort-colors')],
      ['Two Sum II - Input Array Is Sorted', 'Medium', 'LeetCode', lc('two-sum-ii-input-array-is-sorted')],
      ['3Sum', 'Medium', 'LeetCode', lc('3sum')],
      ['4Sum', 'Medium', 'LeetCode', lc('4sum')],
      ['Container With Most Water', 'Medium', 'LeetCode', lc('container-with-most-water')],
      ['Valid Palindrome', 'Easy', 'LeetCode', lc('valid-palindrome')],
      ['Maximum Sum Subarray of Size K', 'Medium', 'GFG', gfg('maximum sum subarray of size k')],
      ['Longest Subarray with Sum K (Positive Numbers)', 'Medium', 'GFG', gfg('longest subarray with sum k positive numbers')],
      ['Max Consecutive Ones III', 'Medium', 'LeetCode', lc('max-consecutive-ones-iii')],
      ['Longest Subarray with Sum K (Prefix Sum and Hash Map)', 'Medium', 'GFG', gfg('longest subarray with sum k positive negative')],
      ['Longest Subarray with Sum 0', 'Medium', 'GFG', gfg('longest subarray with sum 0')],
      ['Subarray Sum Equals K', 'Medium', 'LeetCode', lc('subarray-sum-equals-k')],
      ['Product of Array Except Self', 'Medium', 'LeetCode', lc('product-of-array-except-self')],
      ['Find Pivot Index', 'Easy', 'LeetCode', lc('find-pivot-index')]
    ]
  },
  {
    name: 'Level 3 - Advanced Algorithms and Patterns',
    description: 'Kadane, cyclic placement, interval overlap, voting, permutations, and hashing.',
    questions: [
      ['Maximum Subarray Sum', 'Medium', 'LeetCode', lc('maximum-subarray')],
      ['Print the Maximum-Sum Subarray', 'Medium', 'GFG', gfg('print maximum subarray kadane')],
      ['Maximum Product Subarray', 'Medium', 'LeetCode', lc('maximum-product-subarray')],
      ['Best Time to Buy and Sell Stock', 'Easy', 'LeetCode', lc('best-time-to-buy-and-sell-stock')],
      ['Missing Number', 'Easy', 'LeetCode', lc('missing-number')],
      ['Find the Duplicate Number', 'Medium', 'LeetCode', lc('find-the-duplicate-number')],
      ['Find All Disappeared Numbers in an Array', 'Easy', 'LeetCode', lc('find-all-numbers-disappeared-in-an-array')],
      ['First Missing Positive', 'Hard', 'LeetCode', lc('first-missing-positive')],
      ['Merge Overlapping Intervals', 'Medium', 'LeetCode', lc('merge-intervals')],
      ['Insert Interval', 'Medium', 'LeetCode', lc('insert-interval')],
      ['Non-overlapping Intervals', 'Medium', 'LeetCode', lc('non-overlapping-intervals')],
      ['Majority Element (> N/2)', 'Easy', 'LeetCode', lc('majority-element')],
      ['Majority Element II (> N/3)', 'Medium', 'LeetCode', lc('majority-element-ii')],
      ['Next Permutation', 'Medium', 'LeetCode', lc('next-permutation')],
      ['Longest Consecutive Sequence', 'Medium', 'LeetCode', lc('longest-consecutive-sequence')],
      ['Leaders in an Array', 'Easy', 'GFG', gfg('leaders in an array')]
    ]
  },
  {
    name: 'Level 4 - Merging and Divide and Conquer',
    description: 'Sorted-array merging and merge-sort modifications for inversion-style problems.',
    questions: [
      ['Merge Two Sorted Arrays In-Place', 'Easy', 'LeetCode', lc('merge-sorted-array')],
      ['Count Inversions', 'Hard', 'GFG', gfg('count inversions merge sort')],
      ['Reverse Pairs', 'Hard', 'LeetCode', lc('reverse-pairs')]
    ]
  },
  {
    name: 'Level 5 - 2D Matrix and Grid Traversal',
    description: 'Row-column reasoning, in-place matrix transformations, and traversal patterns.',
    questions: [
      ['Set Matrix Zeroes', 'Medium', 'LeetCode', lc('set-matrix-zeroes')],
      ["Pascal's Triangle", 'Easy', 'LeetCode', lc('pascals-triangle')],
      ['Rotate Image by 90 Degrees', 'Medium', 'LeetCode', lc('rotate-image')],
      ['Spiral Matrix Traversal', 'Medium', 'LeetCode', lc('spiral-matrix')],
      ['Diagonal Traverse', 'Medium', 'LeetCode', lc('diagonal-traverse')]
    ]
  }
];

async function seed() {
  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 10000 });

  const subjectName = 'Arrays - Zero to Advanced';
  let subject = await Subject.findOne({ name: subjectName });
  if (subject) {
    console.log(`Subject already exists: ${subject._id}`);
    await mongoose.disconnect();
    return;
  }

  subject = await Subject.create({
    name: subjectName,
    description: 'A complete English-language array curriculum from absolute basics to advanced interview patterns, including LeetCode and GFG practice links.'
  });

  let questionCount = 0;
  for (let levelIndex = 0; levelIndex < levels.length; levelIndex++) {
    const level = levels[levelIndex];
    const topic = await Topic.create({
      subjectId: subject._id,
      name: level.name,
      description: level.description,
      order: levelIndex
    });

    await Question.insertMany(level.questions.map((question, questionIndex) => ({
      topicId: topic._id,
      subjectId: subject._id,
      title: question[0],
      difficulty: question[1],
      platform: question[2],
      link: question[3],
      order: questionIndex
    })));
    questionCount += level.questions.length;
  }

  await Subject.updateOne({ _id: subject._id }, { totalQuestions: questionCount });
  console.log(`Created ${subjectName}: ${levels.length} levels, ${questionCount} questions.`);
  await mongoose.disconnect();
}

seed().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect();
  process.exitCode = 1;
});