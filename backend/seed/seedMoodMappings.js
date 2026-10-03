/* =============================================
   BLAZE KITCHEN — seed/seedMoodMappings.js
   Seed exact admin-approved mood menu dataset
   ============================================= */

const mongoose = require('mongoose');
require('dotenv').config();

const MoodCategory = require('../models/MoodCategory.model');
const MoodMenuItem = require('../models/MoodMenuItem.model');

const MOODS = [
  {
    slug: 'stressed',
    label: 'Stressed',
    reason: 'Comforting and easy-to-eat options to reduce stress cravings.',
    tags: ['comfort', 'warm', 'calming', 'quick', 'satisfying'],
  },
  {
    slug: 'gym',
    label: 'Gym / Fitness',
    reason: 'High-protein and performance-friendly options.',
    tags: ['high protein', 'healthy', 'lean', 'energy', 'recovery'],
  },
  {
    slug: 'sick',
    label: 'Sick',
    reason: 'Light, warm and gentle foods for recovery days.',
    tags: ['light', 'warm', 'gentle', 'healthy', 'recovery'],
  },
  {
    slug: 'celebration',
    label: 'Celebration',
    reason: 'Fun, indulgent and share-friendly celebration picks.',
    tags: ['special', 'party', 'sharing', 'indulgent', 'flavorful'],
  },
  {
    slug: 'office-rush',
    label: 'Office Rush',
    reason: 'Quick prep, practical and energy-sustaining meals.',
    tags: ['quick', 'portable', 'grab-and-go', 'balanced', 'light'],
  },
  {
    slug: 'late-night',
    label: 'Late Night',
    reason: 'Craving-satisfying food for late-night hunger.',
    tags: ['late-night', 'comfort', 'quick', 'snack', 'craving'],
  },
  {
    slug: 'study-mode',
    label: 'Study Mode',
    reason: 'Balanced picks that help you stay focused for long sessions.',
    tags: ['focus', 'energy', 'light', 'quick', 'brain-food'],
  },
];

const MOOD_ITEMS = {
  stressed: {
    veg: [
      { itemName: 'Veg Cheese Pasta', price: 180, calories: 450, protein: 12, shortReason: 'Creamy and cheesy pasta that helps relax the mind.' },
      { itemName: 'Chocolate Lava Cake', price: 120, calories: 350, protein: 5, shortReason: 'Warm chocolate dessert that improves mood instantly.' },
      { itemName: 'Paneer Butter Masala + Naan', price: 220, calories: 600, protein: 18, shortReason: 'Rich and creamy curry with soft naan for comfort eating.' },
      { itemName: 'Veg Loaded Nachos', price: 160, calories: 400, protein: 10, shortReason: 'Crunchy nachos topped with cheese and vegetables.' },
    ],
    'non-veg': [
      { itemName: 'Chicken Fried Wings', price: 240, calories: 500, protein: 25, shortReason: 'Crispy fried chicken wings perfect for cravings.' },
      { itemName: 'Chicken Alfredo Pasta', price: 210, calories: 520, protein: 22, shortReason: 'Creamy pasta with chicken for a rich and satisfying meal.' },
    ],
  },
  gym: {
    veg: [
      { itemName: 'Paneer Salad Bowl', price: 180, calories: 280, protein: 20, shortReason: 'Fresh vegetables with paneer for a healthy protein boost.' },
      { itemName: 'Protein Smoothie', price: 150, calories: 250, protein: 15, shortReason: 'Banana and peanut-based drink for energy and recovery.' },
      { itemName: 'Sprouts Salad', price: 100, calories: 180, protein: 12, shortReason: 'Light and protein-rich healthy snack.' },
      { itemName: 'Tofu Stir Fry', price: 170, calories: 220, protein: 18, shortReason: 'Stir-fried tofu with vegetables for muscle support.' },
    ],
    'non-veg': [
      { itemName: 'Grilled Chicken Breast', price: 220, calories: 300, protein: 35, shortReason: 'Lean chicken rich in protein for muscle growth.' },
      { itemName: 'Boiled Eggs (4 pcs)', price: 80, calories: 280, protein: 24, shortReason: 'Simple and effective high-protein meal.' },
      { itemName: 'Chicken Brown Rice Bowl', price: 200, calories: 400, protein: 28, shortReason: 'Balanced meal with carbs and protein.' },
    ],
  },
  sick: {
    veg: [
      { itemName: 'Veg Clear Soup', price: 90, calories: 120, protein: 5, shortReason: 'Light and easy-to-digest soup.' },
      { itemName: 'Moong Dal Khichdi', price: 110, calories: 250, protein: 10, shortReason: 'Soft and gentle meal for recovery.' },
      { itemName: 'Idli + Sambar', price: 80, calories: 200, protein: 8, shortReason: 'Steamed and light food ideal when sick.' },
      { itemName: 'Steamed Rice + Dal', price: 100, calories: 300, protein: 9, shortReason: 'Simple home-style meal.' },
    ],
    'non-veg': [
      { itemName: 'Chicken Soup', price: 120, calories: 180, protein: 15, shortReason: 'Nutritious soup that helps boost immunity.' },
    ],
  },
  celebration: {
    veg: [
      { itemName: 'Paneer Tikka', price: 200, calories: 400, protein: 22, shortReason: 'Grilled paneer cubes with spices.' },
      { itemName: 'Veg Pizza', price: 250, calories: 600, protein: 20, shortReason: 'Cheese-loaded pizza for party enjoyment.' },
      { itemName: 'Dessert Platter', price: 200, calories: 500, protein: 8, shortReason: 'Mix of sweets for celebrations.' },
    ],
    'non-veg': [
      { itemName: 'Chicken Biryani', price: 220, calories: 700, protein: 30, shortReason: 'Spicy and flavorful rice with chicken.' },
      { itemName: 'Chicken BBQ Wings', price: 260, calories: 550, protein: 28, shortReason: 'Smoky grilled wings perfect for parties.' },
      { itemName: 'Chicken Pizza', price: 260, calories: 650, protein: 25, shortReason: 'Loaded pizza with chicken toppings.' },
    ],
  },
  'office-rush': {
    veg: [
      { itemName: 'Veg Sandwich', price: 100, calories: 250, protein: 8, shortReason: 'Quick and light meal.' },
      { itemName: 'Paneer Wrap', price: 130, calories: 300, protein: 14, shortReason: 'Easy-to-eat wrap with paneer filling.' },
      { itemName: 'Quick Poha', price: 80, calories: 200, protein: 6, shortReason: 'Fast and healthy breakfast option.' },
    ],
    'non-veg': [
      { itemName: 'Chicken Roll', price: 140, calories: 350, protein: 18, shortReason: 'Quick grab-and-go chicken wrap.' },
      { itemName: 'Egg Roll', price: 120, calories: 300, protein: 12, shortReason: 'Simple and filling egg-based roll.' },
    ],
  },
  'late-night': {
    veg: [
      { itemName: 'Maggi Noodles', price: 80, calories: 300, protein: 7, shortReason: 'Popular late-night comfort snack.' },
      { itemName: 'Garlic Bread', price: 110, calories: 250, protein: 6, shortReason: 'Crispy bread with garlic flavor.' },
      { itemName: 'Cold Coffee', price: 100, calories: 200, protein: 6, shortReason: 'Refreshing drink for night cravings.' },
    ],
    'non-veg': [
      { itemName: 'Omelette + Toast', price: 100, calories: 280, protein: 14, shortReason: 'Light protein snack for night hunger.' },
      { itemName: 'Chicken Nuggets', price: 150, calories: 400, protein: 20, shortReason: 'Crispy bite-sized chicken snacks.' },
    ],
  },
  'study-mode': {
    veg: [
      { itemName: 'Coffee', price: 80, calories: 80, protein: 2, shortReason: 'Helps improve focus.' },
      { itemName: 'Dry Fruits Mix', price: 120, calories: 200, protein: 6, shortReason: 'Energy-boosting snack.' },
      { itemName: 'Fruit Bowl', price: 100, calories: 150, protein: 3, shortReason: 'Fresh and healthy option.' },
      { itemName: 'Peanut Butter Sandwich', price: 110, calories: 300, protein: 12, shortReason: 'Nutritious snack for long study hours.' },
    ],
    'non-veg': [
      { itemName: 'Boiled Eggs (2 pcs)', price: 50, calories: 140, protein: 12, shortReason: 'Quick brain-boosting protein snack.' },
    ],
  },
};

function inferPrepTime(moodSlug, foodPreference) {
  if (moodSlug === 'office-rush') return 10;
  if (moodSlug === 'late-night') return 12;
  if (moodSlug === 'study-mode') return 8;
  if (moodSlug === 'sick') return 14;
  if (moodSlug === 'gym') return foodPreference === 'non-veg' ? 18 : 14;
  if (moodSlug === 'celebration') return 22;
  return 16;
}

async function ensureMoodCategories() {
  const ops = MOODS.map((m) => ({
    updateOne: {
      filter: { slug: m.slug },
      update: {
        $set: {
          label: m.label,
          description: m.reason,
          isEnabled: true,
        },
      },
      upsert: true,
    },
  }));

  await MoodCategory.bulkWrite(ops, { ordered: false });
}

function buildDocs() {
  const docs = [];

  MOODS.forEach((mood) => {
    const moodItems = MOOD_ITEMS[mood.slug] || { veg: [], 'non-veg': [] };

    ['veg', 'non-veg'].forEach((foodPreference) => {
      const items = moodItems[foodPreference] || [];

      items.forEach((item) => {
        docs.push({
          menuCategoryId: null,
          menuSubcategoryId: null,
          menuItemId: null,
          categoryName: 'Mood Specials',
          subcategoryName: mood.label,
          itemName: item.itemName,
          image_url: '',
          price: item.price,
          foodPreference,
          moods: [mood.slug],
          calories: item.calories,
          protein: item.protein,
          prepTime: inferPrepTime(mood.slug, foodPreference),
          tags: [...mood.tags, foodPreference === 'veg' ? 'veg' : 'non-veg'],
          shortReason: item.shortReason,
          isEnabled: true,
        });
      });
    });
  });

  return docs;
}

async function seedMoodItems() {
  if (!process.env.MONGO_URI) {
    throw new Error('MONGO_URI is missing in environment.');
  }

  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  await ensureMoodCategories();
  await MoodMenuItem.deleteMany({});

  const docs = buildDocs();
  await MoodMenuItem.insertMany(docs, { ordered: false });

  const counts = await MoodMenuItem.aggregate([
    { $unwind: '$moods' },
    { $group: { _id: '$moods', count: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ]);

  console.log('Seed complete. Mood counts:');
  counts.forEach((c) => {
    console.log(`- ${c._id}: ${c.count}`);
  });

  console.log(`Total mood mapping rows: ${docs.length}`);
  await mongoose.connection.close();
  console.log('Done.');
}

seedMoodItems().catch(async (err) => {
  console.error('Mood seed failed:', err.message);
  try {
    await mongoose.connection.close();
  } catch (_) {
    // ignore close errors
  }
  process.exit(1);
});
