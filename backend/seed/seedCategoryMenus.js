/* =============================================
   BLAZE KITCHEN — seed/seedCategoryMenus.js
   Seeds the 8 structured categories into MongoDB
   Run: node backend/seed/seedCategoryMenus.js
   ============================================= */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose       = require('mongoose');
const CategoryMenu   = require('../models/CategoryMenu.model');

const categoryMenuData = [
  {
    _id: '699ff4cbdd98af62d91f0199',
    category: 'Coffee & Brews',
    image: 'https://images.unsplash.com/photo-1510707577719-ae7c14805e3a?w=400&q=80',
    badge: '',
    availability: true,
    subcategories: [
      {
        name: 'Purely Black',
        items: [
          { name: 'Espresso',            prices: [170] },
          { name: 'Espresso Doppio',     prices: [180] },
          { name: 'Café Americano',      prices: [200] },
          { name: 'Espresso Sunrise',    prices: [220] },
          { name: 'Sunrise Americano',   prices: [230] },
          { name: 'Sparkling Americano', prices: [230] }
        ]
      },
      {
        name: 'Classic Milk & Foam',
        items: [
          { name: 'Macchiato',       prices: [190] },
          { name: 'Espresso Bon Bon',prices: [190] },
          { name: 'Piccolo (Hot)',   prices: [200] },
          { name: 'Cortado (Hot)',   prices: [200] },
          { name: 'Cappuccino',      prices: [220] },
          { name: 'Flat White',      prices: [230] },
          { name: 'Orange Mocha',    prices: [300] },
          { name: 'Winter Latte',    prices: [300] }
        ]
      },
      {
        name: 'Cold Brews / Iced Coffee / Frappes',
        items: [
          { name: 'Coffee Lemonade',                prices: [220] },
          { name: 'Classic Cold Coffee',            prices: [230] },
          { name: 'The Classic Cold Brew',          prices: [230] },
          { name: 'Classic Frappe',                 prices: [250] },
          { name: 'Cold Brew Sangria',              prices: [250] },
          { name: 'Cold Brew with Tender Coconut',  prices: [250] },
          { name: 'Lemon Honey Cold Brew',          prices: [250] },
          { name: 'Mazagran Cold Brew',             prices: [250] },
          { name: 'Japanese Iced Pour Over',        prices: [250] }
        ]
      },
      {
        name: 'Manual Brew Bar',
        items: [
          { name: 'Pour Over',   prices: [200] },
          { name: 'French Press',prices: [200] }
        ]
      },
      {
        name: 'Affogato',
        items: [
          { name: 'Affogato al Caffè', prices: [299] }
        ]
      }
    ]
  },
  {
    _id: '699ff4cbdd98af62d91f019a',
    category: 'Just Matcha & Hojicha',
    image: 'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?w=400&q=80',
    badge: '',
    availability: true,
    subcategories: [
      {
        name: 'Matcha',
        items: [
          { name: 'Matcha Latte',              prices: [320] },
          { name: 'Matchacano',                prices: [300] },
          { name: 'Mango Matcha Latte',        prices: [350] },
          { name: 'Matcha Pure Coconut Latte', prices: [300] },
          { name: 'Banana Milk Matcha Latte',  prices: [300] },
          { name: 'Matcha Frappe',             prices: [350] },
          { name: 'Soft Girl Matcha Latte',    prices: [350] },
          { name: 'Lemon Pie Matcha',          prices: [350] },
          { name: 'Matcha Coconut Cloud',      prices: [320] }
        ]
      },
      {
        name: 'Hojicha',
        items: [
          { name: 'Hojicha Coconut Cloud', prices: [320] }
        ]
      }
    ]
  },
  {
    _id: '699ff4cbdd98af62d91f019b',
    category: 'Beverages',
    image: 'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=400&q=80',
    badge: '',
    availability: true,
    subcategories: [
      {
        name: 'Milkshakes & Smoothies',
        items: [
          { name: 'Nutorious',               prices: [289] },
          { name: 'Caramel Crunch',          prices: [289] },
          { name: 'Rocher Road',             prices: [299] },
          { name: 'Salted Caramel and Brownie', prices: [299] },
          { name: 'Milky Way',               prices: [299] },
          { name: 'Berry Blush',             prices: [299] },
          { name: 'Chocolate Cake Shake',    prices: [299] },
          { name: 'Mixed Berry Smoothie',    prices: [359] },
          { name: 'Mango Smoothie',          prices: [329] },
          { name: 'Green Smoothie',          prices: [329] }
        ]
      },
      {
        name: 'Hot Chocolate',
        items: [
          { name: 'Hot Chocolate (Regular Style)',      prices: [375] },
          { name: 'Hot Chocolate (Thick Italian Style)',prices: [400] }
        ]
      },
      {
        name: 'Speciality Hot Tea Pots',
        items: [
          { name: 'Rose Lemon',   prices: [220] },
          { name: 'Orange Clove', prices: [220] },
          { name: 'Spearmint',    prices: [220] },
          { name: 'Turmeric',     prices: [220] },
          { name: 'Hibiscus',     prices: [220] },
          { name: 'Black Tea',    prices: [220] }
        ]
      },
      {
        name: 'Iced Tea',
        items: [
          { name: 'Lemon Iced Tea',       prices: [220] },
          { name: 'Peach Iced Tea',       prices: [220] },
          { name: 'Cranberry Iced Tea',   prices: [220] },
          { name: 'Blueberry Iced Tea',   prices: [220] },
          { name: 'Passion Fruit Iced Tea', prices: [220] }
        ]
      },
      {
        name: 'Mojitos',
        items: [
          { name: 'Virgin Mojito',         prices: [240] },
          { name: 'Blueberry Mojito',      prices: [240] },
          { name: 'Passion Fruit Mojito',  prices: [240] },
          { name: 'Peach Mojito',          prices: [240] },
          { name: 'Cranberry Mojito',      prices: [240] }
        ]
      },
      {
        name: 'Lemonade',
        items: [
          { name: 'Classic Lemonade (Mint & Lemon)', prices: [200] }
        ]
      },
      {
        name: 'Fresh Juices',
        items: [
          { name: 'Livestrong (Orange, Beetroot, Carrot, Honey)', prices: [250] },
          { name: 'Pineapple Juice',   prices: [250] },
          { name: 'Founders Paradise', prices: [250] },
          { name: 'Summer is Back',    prices: [250] },
          { name: 'Watermelon Juice',  prices: [250] },
          { name: 'Mango Coconut',     prices: [250] },
          { name: 'Pineapple Coconut', prices: [250] },
          { name: 'Cucumber Coconut',  prices: [250] },
          { name: 'Just Orange',       prices: [250] }
        ]
      }
    ]
  },
  {
    _id: '699ff4cbdd98af62d91f019c',
    category: 'Breakfast Plates',
    image: 'https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=400&q=80',
    badge: '',
    availability: true,
    subcategories: [
      {
        name: 'Toasts & Platters',
        items: [
          { name: 'Avocado Toast',                         prices: [350, 375], note: 'Two size options' },
          { name: 'Creamy Mushroom Toast',                 prices: [280, 300], note: 'Two size options' },
          { name: 'Protein Toast',                         prices: [280] },
          { name: 'Grilled Tomato & Fresh Mozzarella',     prices: [299] },
          { name: 'Scrambled Paneer / Tofu with Toast',    prices: [299] },
          { name: 'Farmhouse Platter',                     prices: [500] },
          { name: 'English Platter',                       prices: [500] },
          { name: 'Extras: Eggs / Paneer / Tofu / Toast',  prices: [30, 50, 50, 20] }
        ]
      },
      {
        name: 'Eggs',
        items: [
          { name: 'Classic Scrambled Egg',                                          prices: [259] },
          { name: 'Cheese Scrambled Egg',                                           prices: [269] },
          { name: 'Masala Scrambled Egg',                                           prices: [269] },
          { name: 'Fried Eggs',                                                     prices: [269] },
          { name: '3 Egg French Fold Omelette (Classic / Cheese / Masala / Mushroom)', prices: [299, 329] },
          { name: 'Turkish Yogurt & Eggs',                                          prices: [299] },
          { name: 'Shakshuka',                                                      prices: [299] }
        ]
      },
      {
        name: 'Smoothie Bowls',
        items: [
          { name: 'Tropical Mango & Pineapple',          prices: [299] },
          { name: 'Coconut Pineapple',                   prices: [299] },
          { name: 'Banana Matcha',                       prices: [299] },
          { name: 'Chocolate + Peanut Butter + Banana',  prices: [299] }
        ]
      },
      {
        name: 'Oats Bowls',
        items: [
          { name: 'Chocolate, Cinnamon & Banana', prices: [200] },
          { name: 'Peanut Butter & Banana',       prices: [200] },
          { name: 'Mango Coconut',                prices: [200] },
          { name: 'Mixed Fruit',                  prices: [200] }
        ]
      }
    ]
  },
  {
    _id: '699ff4cbdd98af62d91f019d',
    category: 'Pancakes & Waffles',
    image: 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=400&q=80',
    badge: '',
    availability: true,
    subcategories: [
      {
        name: 'Pancakes',
        items: [
          { name: 'Original Pancake',                             prices: [299] },
          { name: 'Nutella Banana Pancake',                       prices: [299] },
          { name: 'Fruit Wheel Pancake',                          prices: [299] },
          { name: 'Triple Chocolate Pancake',                     prices: [299] },
          { name: 'White Chocolate & Seasonal Fruit Pancake',     prices: [320] }
        ]
      },
      {
        name: 'French Toast',
        items: [
          { name: 'Original French Toast',            prices: [299] },
          { name: 'Nutella & Banana French Toast',    prices: [320] },
          { name: 'Fruit French Toast',               prices: [320] },
          { name: 'Matcha French Toast',              prices: [320] },
          { name: 'Matcha & Mango French Toast',      prices: [320] }
        ]
      },
      {
        name: 'Waffles',
        items: [
          { name: 'Classic Waffle',                               prices: [289] },
          { name: 'Triple Chocolate Waffle',                      prices: [299] },
          { name: 'Fruit Waffle',                                 prices: [299] },
          { name: 'Nutella, Banana & Almond Waffle',              prices: [299] },
          { name: 'Blueberry Cheesecake Waffle',                  prices: [299] },
          { name: 'White Chocolate & Seasonal Fruit Waffle',      prices: [320] }
        ]
      }
    ]
  },
  {
    _id: '699ff4cbdd98af62d91f019e',
    category: 'Mains',
    image: 'https://images.unsplash.com/photo-1563379926898-05f4575a45d8?w=400&q=80',
    badge: '',
    availability: true,
    subcategories: [
      {
        name: 'Dinner',
        items: [
          { name: 'Thai Curry & Rice',    prices: [300, 320, 340], note: 'Tofu / Paneer / Chicken' },
          { name: 'Makhani & Rice',       prices: [300, 320, 340], note: 'Tofu / Paneer / Chicken' },
          { name: 'Chicken Grill',        prices: [350] },
          { name: 'Cottage Cheese Grill', prices: [350] },
          { name: 'Fish Grill',           prices: [400] }
        ]
      },
      {
        name: 'Pasta',
        items: [
          { name: 'Rigatoni / Penne',                      prices: [300, 340], note: 'Veg / Non-veg' },
          { name: 'Spaghetti',                             prices: [300, 340], note: 'Veg / Non-veg' },
          { name: 'Spaghetti Parmesano Chicken',           prices: [350] },
          { name: 'Extras: Veggies / Chicken / Garlic Bread', prices: [50, 100, 30] }
        ]
      },
      {
        name: 'All-Time Favourites',
        items: [
          { name: 'Truffle Parmesan Fries',                    prices: [450] },
          { name: 'French Fries',                              prices: [299] },
          { name: 'Mexican Half n Half',                       prices: [299] },
          { name: 'Pull Me Garlic Bun',                        prices: [299] },
          { name: 'Korean Cream Cheese Garlic Bun',            prices: [299] },
          { name: 'Chicken Strips',                            prices: [299] },
          { name: 'Chicken Wings',                             prices: [299] },
          { name: 'Jalapeño Poppers',                          prices: [299] },
          { name: 'Plain Garlic Bread',                        prices: [240] },
          { name: 'Cheesy Garlic Bread',                       prices: [279] },
          { name: 'Angry Cheese Garlic Bread',                 prices: [299] },
          { name: 'Angry Mushroom & Cheese Garlic Bread',      prices: [349] },
          { name: 'Cheesy Potato Poppers',                     prices: [299] },
          { name: 'Hash Browns',                               prices: [299] },
          { name: 'Chicken Nuggets',                           prices: [299] },
          { name: 'Fish & Chips',                              prices: [400] },
          { name: 'Chicken Quesadilla',                        prices: [299] },
          { name: 'Crispy Sliders Paneer',                     prices: [469] },
          { name: 'Crispy Sliders Chicken',                    prices: [499] },
          { name: 'Mushroom Stuffed Spinach Tortilla',         prices: [349] },
          { name: 'Paneer Stuffed Spinach Tortilla',           prices: [349] },
          { name: 'Creamy Broccoli Soup with Pita Bread',      prices: [300] }
        ]
      }
    ]
  },
  {
    _id: '699ff4cbdd98af62d91f019f',
    category: 'Salads & Soups',
    image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&q=80',
    badge: '',
    availability: true,
    subcategories: [
      {
        name: 'Salads',
        items: [
          { name: 'Pineapple Mint Bowl', prices: [200] },
          { name: 'Papaya Bowl',         prices: [200] },
          { name: 'Mixed Fruits Bowl',   prices: [200] },
          { name: 'Caesar Salad',        prices: [279, 299], note: 'Two size options' },
          { name: 'Thai Salad',          prices: [279, 299], note: 'Two size options' },
          { name: 'Waldorf Salad',       prices: [299] },
          { name: 'Greek Salad',         prices: [299] },
          { name: 'Watermelon Feta',     prices: [299] }
        ]
      },
      {
        name: 'Soups',
        items: [
          { name: 'Creamy Broccoli Soup with Pita Bread', prices: [300] }
        ]
      }
    ]
  },
  {
    _id: '699ff4cbdd98af62d91f01a0',
    category: 'Burgers & Sandwiches',
    image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&q=80',
    badge: '',
    availability: true,
    subcategories: [
      {
        name: 'Burgers',
        items: [
          { name: 'Spicy Chicken Burger',          prices: [349] },
          { name: 'Bang Bang Chicken Burger',      prices: [349] },
          { name: 'Home Style Chicken Burger',     prices: [349] },
          { name: 'Smash Chicken Burger',          prices: [349] },
          { name: 'Chickpea Patty Burger',         prices: [349] },
          { name: 'Cottage Cheese Crispy Burger',  prices: [349] },
          { name: 'Beetroot Patty Burger',         prices: [349] },
          { name: 'Cilantro Lime Chicken Burger',  prices: [369] },
          { name: 'Gochujang Burger',              prices: [369] }
        ]
      },
      {
        name: 'Sandwiches',
        items: [
          { name: 'Egg & Cheese Sandwich',                  prices: [300] },
          { name: 'Chicken & Cheese Sandwich',              prices: [349] },
          { name: 'Crispy Chicken Sandwich',                prices: [349] },
          { name: 'Chicken Tikka Sandwich',                 prices: [340] },
          { name: 'Caprese Sandwich',                       prices: [340] },
          { name: 'Paneer Tikka Sandwich',                  prices: [340] },
          { name: 'Pickled Paneer Sandwich',                prices: [340] },
          { name: "Grandma's Grilled Vegetable Sandwich",   prices: [340] }
        ]
      }
    ]
  }
];

const seed = async () => {
  const mongoose = require('mongoose');
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    await CategoryMenu.deleteMany({});
    console.log('🗑️  Cleared existing category menu data');

    const created = await CategoryMenu.insertMany(categoryMenuData);
    console.log(`✅ Seeded ${created.length} categories:`);
    created.forEach(c => console.log(`   • ${c.category}`));

    console.log('\n✅ Category menu seeding complete!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seed failed:', err.message);
    process.exit(1);
  }
};

seed();
