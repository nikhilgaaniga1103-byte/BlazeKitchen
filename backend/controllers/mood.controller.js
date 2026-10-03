/* =============================================
   BLAZE KITCHEN — controllers/mood.controller.js
   Mood recommendation + admin mood management
   ============================================= */

const Menu = require('../models/Menu.model');
const MoodCategory = require('../models/MoodCategory.model');
const MoodMenuItem = require('../models/MoodMenuItem.model');
const sse = require('../sse');

const DEFAULT_MOOD_CATEGORIES = [
  {
    slug: 'stressed',
    label: 'Stressed',
    description: 'Comforting and easy-to-eat options to reduce stress cravings.',
  },
  {
    slug: 'gym',
    label: 'Gym / Fitness',
    description: 'High-protein and performance-friendly options.',
  },
  {
    slug: 'sick',
    label: 'Sick',
    description: 'Light, warm and gentle foods for recovery days.',
  },
  {
    slug: 'celebration',
    label: 'Celebration',
    description: 'Fun, indulgent and share-friendly celebration picks.',
  },
  {
    slug: 'office-rush',
    label: 'Office Rush',
    description: 'Quick prep, practical and energy-sustaining meals.',
  },
  {
    slug: 'late-night',
    label: 'Late Night',
    description: 'Craving-satisfying food for late-night hunger.',
  },
  {
    slug: 'study-mode',
    label: 'Study Mode',
    description: 'Balanced picks that help you stay focused for long sessions.',
  },
];

const MOOD_ALIASES = {
  'gym/fitness': 'gym',
  'gym-fitness': 'gym',
  gymfitness: 'gym',
  'office rush': 'office-rush',
  officerush: 'office-rush',
  'late night': 'late-night',
  latenight: 'late-night',
  'study mode': 'study-mode',
  studymode: 'study-mode',
};

const HEALTH_GOALS = new Set(['weight_loss', 'weight_gain', 'maintain', 'high_protein']);

const MOOD_REASON_TEXT = {
  stressed: 'Chosen for stress-friendly comfort and easy consumption.',
  gym: 'Aligned with gym and fitness recovery goals.',
  sick: 'Selected for a light and recovery-friendly profile.',
  celebration: 'Great match for a celebration vibe and indulgence.',
  'office-rush': 'Suitable for fast office breaks and quick meals.',
  'late-night': 'Designed for late-night cravings without long wait times.',
  'study-mode': 'Picked to support long study sessions with stable energy.',
};

const MOOD_TAG_HINTS = {
  stressed: ['comfort', 'warm', 'calming', 'light', 'quick'],
  gym: ['healthy', 'high protein', 'protein', 'lean', 'grilled'],
  sick: ['healthy', 'light', 'warm', 'comfort', 'soup'],
  celebration: ['special', 'indulgent', 'spicy', 'sweet', 'sharing'],
  'office-rush': ['quick', 'portable', 'energy', 'light'],
  'late-night': ['comfort', 'quick', 'warm', 'spicy'],
  'study-mode': ['quick', 'light', 'energy', 'healthy'],
};

function toFiniteNumber(value, fallback = 0) {
  if (value === null || value === undefined || value === '') return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeMoodSlug(value) {
  if (!value) return '';
  const raw = String(value).trim().toLowerCase();
  if (!raw) return '';

  if (MOOD_ALIASES[raw]) return MOOD_ALIASES[raw];

  const normalized = raw.replace(/[\/\s]+/g, '-').replace(/-+/g, '-');
  return MOOD_ALIASES[normalized] || normalized;
}

function normalizeHealthGoal(value) {
  if (!value) return '';
  const normalized = String(value).trim().toLowerCase().replace(/[\s-]+/g, '_');
  return HEALTH_GOALS.has(normalized) ? normalized : '';
}

function normalizeTags(input) {
  let arr = [];
  if (Array.isArray(input)) {
    arr = input;
  } else if (typeof input === 'string') {
    arr = input.split(',');
  }

  const cleaned = arr
    .map((t) => String(t || '').trim().toLowerCase())
    .filter(Boolean)
    .slice(0, 20);

  return [...new Set(cleaned)];
}

function normalizeMoods(input) {
  const values = Array.isArray(input) ? input : [input];
  const set = new Set();

  for (const mood of values) {
    const normalized = normalizeMoodSlug(mood);
    if (DEFAULT_MOOD_CATEGORIES.some((m) => m.slug === normalized)) {
      set.add(normalized);
    }
  }

  return [...set];
}

function getPrimaryPrice(item) {
  if (!item || !Array.isArray(item.prices) || item.prices.length === 0) return 0;
  const valid = item.prices.filter((p) => Number.isFinite(p) && p >= 0);
  return valid.length ? valid[0] : 0;
}

async function ensureDefaultMoodCategories() {
  const ops = DEFAULT_MOOD_CATEGORIES.map((cat) => ({
    updateOne: {
      filter: { slug: cat.slug },
      update: {
        $setOnInsert: {
          slug: cat.slug,
          label: cat.label,
          description: cat.description,
          isEnabled: true,
        },
      },
      upsert: true,
    },
  }));

  if (!ops.length) return;
  await MoodCategory.bulkWrite(ops, { ordered: false });
}

async function findNestedMenuItem(menuItemId) {
  if (!menuItemId) return null;

  const needle = String(menuItemId);
  const docs = await Menu.find({}).lean();

  for (const categoryDoc of docs) {
    for (const sub of categoryDoc.subcategories || []) {
      for (const item of sub.items || []) {
        if (String(item._id) === needle) {
          return {
            menuCategoryId: categoryDoc._id || null,
            menuSubcategoryId: sub._id || null,
            menuItemId: item._id || null,
            categoryName: categoryDoc.category || '',
            subcategoryName: sub.name || '',
            itemName: item.name || '',
            image_url: item.image_url || '',
            price: getPrimaryPrice(item),
          };
        }
      }
    }
  }

  return null;
}

function computeHealthScore(item, healthGoal) {
  const calories = toFiniteNumber(item.calories, 0);
  const protein = toFiniteNumber(item.protein, 0);

  let score = 0;
  let reason = '';

  switch (healthGoal) {
    case 'weight_loss':
      if (calories > 0) {
        if (calories <= 450) score += 16;
        else if (calories <= 600) score += 8;
        else score -= 8;
      }
      if (protein >= 20) score += 12;
      else if (protein >= 12) score += 6;
      reason = 'Supports weight-loss preference with controlled calories and useful protein.';
      break;

    case 'weight_gain':
      if (calories >= 650) score += 14;
      else if (calories >= 450) score += 8;
      if (protein >= 20) score += 10;
      reason = 'Matches weight-gain goals with calorie-dense and protein-supportive nutrition.';
      break;

    case 'maintain':
      if (calories >= 400 && calories <= 700) score += 12;
      else if (calories > 0) score += 4;
      if (protein >= 15) score += 8;
      reason = 'Balanced for maintenance with moderate nutrition profile.';
      break;

    case 'high_protein':
      if (protein >= 25) score += 22;
      else if (protein >= 18) score += 14;
      else if (protein >= 12) score += 8;
      reason = 'Prioritized for high-protein intake.';
      break;

    default:
      break;
  }

  return { score, reason };
}

function computePrepScore(item, mood) {
  const prepTime = toFiniteNumber(item.prepTime, 0);
  if (!prepTime) return { score: 0, reason: '' };

  const fastModes = new Set(['office-rush', 'late-night', 'study-mode', 'stressed']);
  if (!fastModes.has(mood)) {
    if (prepTime <= 20) {
      return {
        score: 3,
        reason: `Fast preparation time (${prepTime} min).`,
      };
    }
    return { score: 0, reason: '' };
  }

  if (prepTime <= 15) {
    return {
      score: 10,
      reason: `Very quick prep (${prepTime} min), great for ${mood.replace('-', ' ')}.` ,
    };
  }

  if (prepTime <= 25) {
    return {
      score: 6,
      reason: `Reasonable prep time (${prepTime} min).`,
    };
  }

  return {
    score: -4,
    reason: `Slightly longer prep (${prepTime} min) than ideal for this mood.`,
  };
}

function computeTagScore(item, mood) {
  const tags = normalizeTags(item.tags);
  const hints = MOOD_TAG_HINTS[mood] || [];
  const matched = hints.filter((hint) => tags.includes(hint));

  if (!matched.length) return { score: 0, reason: '' };

  const score = Math.min(16, matched.length * 5);
  return {
    score,
    reason: `Includes mood-fit tags: ${matched.join(', ')}.`,
  };
}

function dedupeReasons(reasons) {
  return [...new Set((reasons || []).filter(Boolean).map((r) => String(r).trim()))];
}

function buildRecommendation(item, options) {
  const { mood, foodPreference, healthGoal, budget } = options;

  let score = 50;
  const reasons = [];

  reasons.push(MOOD_REASON_TEXT[mood] || 'Matched your selected mood.');

  const pref = item.foodPreference || 'both';
  if (foodPreference && foodPreference !== 'both') {
    if (pref === foodPreference) {
      score += 10;
      reasons.push(`Matches your ${foodPreference} preference.`);
    } else if (pref === 'both') {
      score += 4;
      reasons.push('Flexible for both veg and non-veg preferences.');
    } else {
      score -= 40;
      reasons.push('Does not match your selected food preference.');
    }
  }

  const health = computeHealthScore(item, healthGoal);
  score += health.score;
  if (health.reason) reasons.push(health.reason);

  const prep = computePrepScore(item, mood);
  score += prep.score;
  if (prep.reason) reasons.push(prep.reason);

  const tag = computeTagScore(item, mood);
  score += tag.score;
  if (tag.reason) reasons.push(tag.reason);

  if (budget !== null && budget !== undefined) {
    if (item.price <= budget) {
      score += Math.max(3, Math.round(10 * (1 - item.price / Math.max(budget, 1))));
      reasons.push(`Fits your budget (₹${item.price} within ₹${budget}).`);
    } else {
      score -= 25;
      reasons.push(`Price is above budget (₹${item.price} vs ₹${budget}).`);
    }
  }

  if (item.shortReason) reasons.push(item.shortReason);

  const whyThisFood = dedupeReasons(reasons);
  const explanation = whyThisFood.slice(0, 3).join(' ');

  return {
    _id: item._id,
    itemName: item.itemName,
    categoryName: item.categoryName,
    subcategoryName: item.subcategoryName,
    image_url: item.image_url || '',
    price: toFiniteNumber(item.price, 0),
    calories: toFiniteNumber(item.calories, 0),
    protein: toFiniteNumber(item.protein, 0),
    prepTime: toFiniteNumber(item.prepTime, 0),
    moods: item.moods || [],
    foodPreference: item.foodPreference || 'both',
    tags: normalizeTags(item.tags),
    explanation,
    whyThisFood,
    score,
  };
}

/* ───────────────────────── Public APIs ───────────────────────── */

exports.getPublicMoodCategories = async (req, res, next) => {
  try {
    await ensureDefaultMoodCategories();

    const categories = await MoodCategory.find({ isEnabled: true })
      .sort({ label: 1 })
      .lean();

    res.set('Cache-Control', 'no-store');
    res.json({
      success: true,
      count: categories.length,
      data: categories,
    });
  } catch (err) {
    next(err);
  }
};

exports.getMoodRecommendations = async (req, res, next) => {
  try {
    await ensureDefaultMoodCategories();

    const payload = req.method === 'GET' ? req.query : (req.body || {});

    const mood = normalizeMoodSlug(payload.mood);
    const foodPreferenceRaw = String(payload.foodPreference || 'both').trim().toLowerCase();
    const foodPreference = ['veg', 'non-veg', 'both'].includes(foodPreferenceRaw)
      ? foodPreferenceRaw
      : 'both';
    const healthGoal = normalizeHealthGoal(payload.healthGoal);

    const budgetValue = payload.budget;
    const budget = (budgetValue === '' || budgetValue === null || budgetValue === undefined)
      ? null
      : toFiniteNumber(budgetValue, null);

    if (!mood) {
      return res.status(400).json({
        success: false,
        message: 'Mood is required for recommendations.',
      });
    }

    const moodCategory = await MoodCategory.findOne({ slug: mood }).lean();
    if (!moodCategory || moodCategory.isEnabled === false) {
      return res.status(400).json({
        success: false,
        message: 'Selected mood category is currently unavailable.',
      });
    }

    const query = {
      isEnabled: true,
      moods: mood,
    };

    if (foodPreference === 'veg') query.foodPreference = { $in: ['veg', 'both'] };
    if (foodPreference === 'non-veg') query.foodPreference = { $in: ['non-veg', 'both'] };
    if (budget !== null && Number.isFinite(budget) && budget >= 0) {
      query.price = { $lte: budget };
    }

    const candidates = await MoodMenuItem.find(query).lean();

    const ranked = candidates
      .map((item) => buildRecommendation(item, { mood, foodPreference, healthGoal, budget }))
      .filter((r) => r.score > 0)
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return a.price - b.price;
      })
      .slice(0, 8);

    res.set('Cache-Control', 'no-store');
    res.json({
      success: true,
      data: {
        query: {
          mood,
          foodPreference,
          healthGoal: healthGoal || null,
          budget,
        },
        count: ranked.length,
        recommendations: ranked,
      },
    });
  } catch (err) {
    next(err);
  }
};

/* ───────────────────────── Admin APIs ───────────────────────── */

exports.getAdminMoodCategories = async (req, res, next) => {
  try {
    await ensureDefaultMoodCategories();

    const categories = await MoodCategory.find({})
      .sort({ label: 1 })
      .lean();

    res.json({ success: true, count: categories.length, data: categories });
  } catch (err) {
    next(err);
  }
};

exports.updateAdminMoodCategory = async (req, res, next) => {
  try {
    await ensureDefaultMoodCategories();

    const slug = normalizeMoodSlug(req.params.slug);
    if (!slug) {
      return res.status(400).json({ success: false, message: 'Invalid mood slug.' });
    }

    const isEnabled = !!req.body.isEnabled;

    const category = await MoodCategory.findOneAndUpdate(
      { slug },
      { isEnabled },
      { new: true, runValidators: true }
    );

    if (!category) {
      return res.status(404).json({ success: false, message: 'Mood category not found.' });
    }

    sse.broadcastAll('mood-updated', {
      action: 'category-updated',
      slug,
      isEnabled,
    });

    res.json({ success: true, data: category });
  } catch (err) {
    next(err);
  }
};

exports.getAdminMenuItems = async (req, res, next) => {
  try {
    const docs = await Menu.find({}).sort({ category: 1 }).lean();

    const flattened = [];
    for (const categoryDoc of docs) {
      for (const sub of categoryDoc.subcategories || []) {
        for (const item of sub.items || []) {
          flattened.push({
            menuCategoryId: categoryDoc._id,
            menuSubcategoryId: sub._id,
            menuItemId: item._id,
            categoryName: categoryDoc.category,
            subcategoryName: sub.name,
            itemName: item.name,
            image_url: item.image_url || '',
            price: getPrimaryPrice(item),
            available: item.available !== false && categoryDoc.availability !== false,
          });
        }
      }
    }

    res.json({ success: true, count: flattened.length, data: flattened });
  } catch (err) {
    next(err);
  }
};

exports.getAdminMoodItems = async (req, res, next) => {
  try {
    await ensureDefaultMoodCategories();

    const items = await MoodMenuItem.find({})
      .sort({ updatedAt: -1 })
      .lean();

    res.json({ success: true, count: items.length, data: items });
  } catch (err) {
    next(err);
  }
};

exports.createAdminMoodItem = async (req, res, next) => {
  try {
    await ensureDefaultMoodCategories();

    const menuItemId = req.body.menuItemId || null;
    const menuSnapshot = await findNestedMenuItem(menuItemId);

    const moods = normalizeMoods(req.body.moods);
    if (!moods.length) {
      return res.status(400).json({ success: false, message: 'Select at least one mood category.' });
    }

    const itemName = String(req.body.itemName || menuSnapshot?.itemName || '').trim();
    if (!itemName) {
      return res.status(400).json({ success: false, message: 'Item name is required.' });
    }

    const foodPreferenceRaw = String(req.body.foodPreference || 'both').trim().toLowerCase();
    const foodPreference = ['veg', 'non-veg', 'both'].includes(foodPreferenceRaw)
      ? foodPreferenceRaw
      : 'both';

    const payload = {
      menuCategoryId: menuSnapshot?.menuCategoryId || req.body.menuCategoryId || null,
      menuSubcategoryId: menuSnapshot?.menuSubcategoryId || req.body.menuSubcategoryId || null,
      menuItemId: menuSnapshot?.menuItemId || menuItemId || null,
      categoryName: String(req.body.categoryName || menuSnapshot?.categoryName || '').trim(),
      subcategoryName: String(req.body.subcategoryName || menuSnapshot?.subcategoryName || '').trim(),
      itemName,
      image_url: String(req.body.image_url || menuSnapshot?.image_url || '').trim(),
      price: Math.max(0, toFiniteNumber(req.body.price, menuSnapshot?.price || 0)),
      foodPreference,
      moods,
      calories: Math.max(0, toFiniteNumber(req.body.calories, 0)),
      protein: Math.max(0, toFiniteNumber(req.body.protein, 0)),
      prepTime: Math.max(0, toFiniteNumber(req.body.prepTime, 0)),
      tags: normalizeTags(req.body.tags),
      shortReason: String(req.body.shortReason || '').trim(),
      isEnabled: req.body.isEnabled !== false,
    };

    const created = await MoodMenuItem.create(payload);

    sse.broadcastAll('mood-updated', {
      action: 'item-created',
      id: created._id,
    });

    res.status(201).json({ success: true, data: created });
  } catch (err) {
    next(err);
  }
};

exports.updateAdminMoodItem = async (req, res, next) => {
  try {
    await ensureDefaultMoodCategories();

    const doc = await MoodMenuItem.findById(req.params.id);
    if (!doc) {
      return res.status(404).json({ success: false, message: 'Mood item not found.' });
    }

    const nextMenuItemId = req.body.menuItemId || doc.menuItemId || null;
    const menuSnapshot = await findNestedMenuItem(nextMenuItemId);

    const moods = normalizeMoods(req.body.moods || doc.moods);
    if (!moods.length) {
      return res.status(400).json({ success: false, message: 'Select at least one mood category.' });
    }

    const nextName = String(req.body.itemName || menuSnapshot?.itemName || doc.itemName || '').trim();
    if (!nextName) {
      return res.status(400).json({ success: false, message: 'Item name is required.' });
    }

    const foodPreferenceRaw = String(req.body.foodPreference || doc.foodPreference || 'both').trim().toLowerCase();
    const foodPreference = ['veg', 'non-veg', 'both'].includes(foodPreferenceRaw)
      ? foodPreferenceRaw
      : 'both';

    doc.menuCategoryId = menuSnapshot?.menuCategoryId || req.body.menuCategoryId || doc.menuCategoryId || null;
    doc.menuSubcategoryId = menuSnapshot?.menuSubcategoryId || req.body.menuSubcategoryId || doc.menuSubcategoryId || null;
    doc.menuItemId = menuSnapshot?.menuItemId || nextMenuItemId || doc.menuItemId || null;
    doc.categoryName = String(req.body.categoryName || menuSnapshot?.categoryName || doc.categoryName || '').trim();
    doc.subcategoryName = String(req.body.subcategoryName || menuSnapshot?.subcategoryName || doc.subcategoryName || '').trim();
    doc.itemName = nextName;
    doc.image_url = String(req.body.image_url || menuSnapshot?.image_url || doc.image_url || '').trim();
    doc.price = Math.max(0, toFiniteNumber(req.body.price, menuSnapshot?.price ?? doc.price));
    doc.foodPreference = foodPreference;
    doc.moods = moods;
    doc.calories = Math.max(0, toFiniteNumber(req.body.calories, doc.calories));
    doc.protein = Math.max(0, toFiniteNumber(req.body.protein, doc.protein));
    doc.prepTime = Math.max(0, toFiniteNumber(req.body.prepTime, doc.prepTime));
    doc.tags = normalizeTags(req.body.tags !== undefined ? req.body.tags : doc.tags);
    doc.shortReason = String(req.body.shortReason !== undefined ? req.body.shortReason : doc.shortReason || '').trim();
    if (req.body.isEnabled !== undefined) doc.isEnabled = !!req.body.isEnabled;

    await doc.save();

    sse.broadcastAll('mood-updated', {
      action: 'item-updated',
      id: doc._id,
    });

    res.json({ success: true, data: doc });
  } catch (err) {
    next(err);
  }
};

exports.toggleAdminMoodItem = async (req, res, next) => {
  try {
    const doc = await MoodMenuItem.findById(req.params.id);
    if (!doc) {
      return res.status(404).json({ success: false, message: 'Mood item not found.' });
    }

    doc.isEnabled = !doc.isEnabled;
    await doc.save();

    sse.broadcastAll('mood-updated', {
      action: 'item-toggled',
      id: doc._id,
      isEnabled: doc.isEnabled,
    });

    res.json({ success: true, data: doc });
  } catch (err) {
    next(err);
  }
};

exports.deleteAdminMoodItem = async (req, res, next) => {
  try {
    const doc = await MoodMenuItem.findByIdAndDelete(req.params.id);
    if (!doc) {
      return res.status(404).json({ success: false, message: 'Mood item not found.' });
    }

    sse.broadcastAll('mood-updated', {
      action: 'item-deleted',
      id: doc._id,
    });

    res.json({ success: true, message: 'Mood item deleted.' });
  } catch (err) {
    next(err);
  }
};
