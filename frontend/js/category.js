/* ============================================================
   WHITE TEAK ROASTERS — category.js
   Renders category page with subcategories & items from JSON
   ============================================================ */

'use strict';

const API_BASE = 'http://localhost:5000/api';

const DEFAULT_ITEM_IMG = 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&q=85';

const CATEGORY_META = {
  'Coffee & Brews':       { icon: '☕', img: 'https://images.unsplash.com/photo-1510707577719-ae7c14805e3a?w=800&q=85', desc: 'From bold espressos to cold brews — your perfect cup awaits.' },
  'Just Matcha & Hojicha':{ icon: '🍵', img: 'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?w=800&q=85', desc: 'Japanese-inspired matcha and hojicha drinks, crafted with love.' },
  'Beverages':            { icon: '🥤', img: 'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=800&q=85', desc: 'Milkshakes, smoothies, juices, mojitos and more.' },
  'Breakfast Plates':     { icon: '🍳', img: 'https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=800&q=85', desc: 'Start your day right with fresh, hearty breakfast plates.' },
  'Pancakes & Waffles':   { icon: '🥞', img: 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=800&q=85', desc: 'Fluffy pancakes, crispy waffles and golden French toasts.' },
  'Mains':                { icon: '🍝', img: 'https://images.unsplash.com/photo-1563379926898-05f4575a45d8?w=800&q=85', desc: 'Satisfying mains — pastas, grills, curries and all-day favourites.' },
  'Salads & Soups':       { icon: '🥗', img: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&q=85', desc: 'Light, fresh and nourishing salads and soups.' },
  'Burgers & Sandwiches': { icon: '🍔', img: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800&q=85', desc: 'Juicy burgers and loaded sandwiches made to order.' },
};

const SUBCATEGORY_IMGS = {
  // Coffee
  'Purely Black': 'https://images.unsplash.com/photo-1510707577719-ae7c14805e3a?w=400&q=80',
  'Classic Milk & Foam': 'https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=400&q=80',
  'Cold Brews / Iced Coffee / Frappes': 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=400&q=80',
  'Manual Brew Bar': 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400&q=80',
  'Affogato': 'https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?w=400&q=80',
  // Matcha
  'Matcha': 'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?w=400&q=80',
  'Hojicha': 'https://images.unsplash.com/photo-1567922045116-2a00fae2ed03?w=400&q=80',
  // Beverages
  'Milkshakes & Smoothies': 'https://images.unsplash.com/photo-1553361371-9b22f78e8b1d?w=400&q=80',
  'Hot Chocolate': 'https://images.unsplash.com/photo-1542990253-a781e8afc0a1?w=400&q=80',
  'Speciality Hot Tea Pots': 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=400&q=80',
  'Iced Tea': 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=400&q=80',
  'Mojitos': 'https://images.unsplash.com/photo-1560508180-03f285f67ded?w=400&q=80',
  'Lemonade': 'https://images.unsplash.com/photo-1523371054106-bbf80586c38c?w=400&q=80',
  'Fresh Juices': 'https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=400&q=80',
  // Breakfast
  'Toasts & Platters': 'https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=400&q=80',
  'Eggs': 'https://images.unsplash.com/photo-1482049016688-2d3e1b311543?w=400&q=80',
  'Smoothie Bowls': 'https://images.unsplash.com/photo-1511690743698-d9d85f2fbf38?w=400&q=80',
  'Oats Bowls': 'https://images.unsplash.com/photo-1517673400267-0251440c45dc?w=400&q=80',
  // Pancakes
  'Pancakes': 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=400&q=80',
  'French Toast': 'https://images.unsplash.com/photo-1484723091739-30a097e8f929?w=400&q=80',
  'Waffles': 'https://images.unsplash.com/photo-1562376552-0d160a2f238d?w=400&q=80',
  // Mains
  'Dinner': 'https://images.unsplash.com/photo-1574484284002-952d92456975?w=400&q=80',
  'Pasta': 'https://images.unsplash.com/photo-1563379926898-05f4575a45d8?w=400&q=80',
  'All-Time Favourites': 'https://images.unsplash.com/photo-1578681994506-b8f463449011?w=400&q=80',
  // Salads
  'Salads': 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&q=80',
  'Soups': 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=400&q=80',
  // Burgers
  'Burgers': 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&q=80',
  'Sandwiches': 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=400&q=80',
};

const ITEM_IMGS = {
  // Coffee - Purely Black
  'Espresso': 'https://images.unsplash.com/photo-1510707577719-ae7c14805e3a?w=400&q=80',
  'Espresso Doppio': 'https://images.unsplash.com/photo-1596952954288-16862d37405b?w=400&q=80',
  'Café Americano': 'https://images.unsplash.com/photo-1551030173-122aabc4489c?w=400&q=80',
  'Espresso Sunrise': 'https://images.unsplash.com/photo-1485808191679-5f86510bd9d4?w=400&q=80',
  'Sunrise Americano': 'https://images.unsplash.com/photo-1559525839-8ad4f2d7d31a?w=400&q=80',
  'Sparkling Americano': 'https://images.unsplash.com/photo-1497515114629-f71d768fd07c?w=400&q=80',
  // Coffee - Milk & Foam
  'Macchiato': 'https://images.unsplash.com/photo-1614179818511-0d3c895c7d60?w=400&q=80',
  'Espresso Bon Bon': 'https://images.unsplash.com/photo-1591996721490-7e0c96a7a2fc?w=400&q=80',
  'Piccolo (Hot)': 'https://images.unsplash.com/photo-1568649929103-28ffbefaca1e?w=400&q=80',
  'Cortado (Hot)': 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=400&q=80',
  'Cappuccino': 'https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=400&q=80',
  'Flat White': 'https://images.unsplash.com/photo-1577968897966-3d4325b36b61?w=400&q=80',
  'Orange Mocha': 'https://images.unsplash.com/photo-1542736667-069246bdbc6d?w=400&q=80',
  'Winter Latte': 'https://images.unsplash.com/photo-1607700703898-e5bccc6b2d1f?w=400&q=80',
  // Cold Brews
  'Coffee Lemonade': 'https://images.unsplash.com/photo-1497515114629-f71d768fd07c?w=400&q=80',
  'Classic Cold Coffee': 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=400&q=80',
  'The Classic Cold Brew': 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=400&q=80',
  'Classic Frappe': 'https://images.unsplash.com/photo-1579954115545-a95591f28bfc?w=400&q=80',
  'Cold Brew Sangria': 'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=400&q=80',
  'Cold Brew with Tender Coconut': 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=400&q=80',
  'Lemon Honey Cold Brew': 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=400&q=80',
  'Mazagran Cold Brew': 'https://images.unsplash.com/photo-1559496417-e7f25cb247f3?w=400&q=80',
  'Japanese Iced Pour Over': 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=80',
  // Manual Brew
  'Pour Over': 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400&q=80',
  'French Press': 'https://images.unsplash.com/photo-1570968915860-54d5c301fa9f?w=400&q=80',
  // Affogato
  'Affogato al Caffè': 'https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?w=400&q=80',
  // Matcha
  'Matcha Latte': 'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?w=400&q=80',
  'Matchacano': 'https://images.unsplash.com/photo-1515823064-d6e0c04616a7?w=400&q=80',
  'Mango Matcha Latte': 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=400&q=80',
  'Matcha Pure Coconut Latte': 'https://images.unsplash.com/photo-1541696490-8744a5dc0228?w=400&q=80',
  'Banana Milk Matcha Latte': 'https://images.unsplash.com/photo-1546173159-315724a31696?w=400&q=80',
  'Matcha Frappe': 'https://images.unsplash.com/photo-1579954115563-e72bf1741cc4?w=400&q=80',
  'Soft Girl Matcha Latte': 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=80',
  'Lemon Pie Matcha': 'https://images.unsplash.com/photo-1563227812-0ea4c22e6cc8?w=400&q=80',
  'Matcha Coconut Cloud': 'https://images.unsplash.com/photo-1541696490-8744a5dc0228?w=400&q=80',
  'Hojicha Coconut Cloud': 'https://images.unsplash.com/photo-1567922045116-2a00fae2ed03?w=400&q=80',
  // Beverages
  'Nutorious': 'https://images.unsplash.com/photo-1553361371-9b22f78e8b1d?w=400&q=80',
  'Caramel Crunch': 'https://images.unsplash.com/photo-1572490122747-3e9ea9a2e9b7?w=400&q=80',
  'Rocher Road': 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=400&q=80',
  'Salted Caramel and Brownie': 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=400&q=80',
  'Milky Way': 'https://images.unsplash.com/photo-1605217613423-0aea4fb32906?w=400&q=80',
  'Berry Blush': 'https://images.unsplash.com/photo-1570696516188-ade861b84a49?w=400&q=80',
  'Chocolate Cake Shake': 'https://images.unsplash.com/photo-1572490122747-3e9ea9a2e9b7?w=400&q=80',
  'Mixed Berry Smoothie': 'https://images.unsplash.com/photo-1502741224143-90386d7f8c82?w=400&q=80',
  'Mango Smoothie': 'https://images.unsplash.com/photo-1544717305-996b815c338c?w=400&q=80',
  'Green Smoothie': 'https://images.unsplash.com/photo-1638176066760-3c8e0b09e3c8?w=400&q=80',
  'Hot Chocolate (Regular Style)': 'https://images.unsplash.com/photo-1542990253-a781e8afc0a1?w=400&q=80',
  'Hot Chocolate (Thick Italian Style)': 'https://images.unsplash.com/photo-1542990253-a781e8afc0a1?w=400&q=80',
  'Classic Lemonade (Mint & Lemon)': 'https://images.unsplash.com/photo-1523371054106-bbf80586c38c?w=400&q=80',
  'Livestrong (Orange, Beetroot, Carrot, Honey)': 'https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=400&q=80',
  'Pineapple Juice': 'https://images.unsplash.com/photo-1587049633312-d628ae50a8ae?w=400&q=80',
  'Watermelon Juice': 'https://images.unsplash.com/photo-1563633249-c2b5b9c40a72?w=400&q=80',
  'Mango Coconut': 'https://images.unsplash.com/photo-1546173159-315724a31696?w=400&q=80',
  'Just Orange': 'https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=400&q=80',
  'Virgin Mojito': 'https://images.unsplash.com/photo-1560508180-03f285f67ded?w=400&q=80',
  'Blueberry Mojito': 'https://images.unsplash.com/photo-1548943487-a2e4e43b4853?w=400&q=80',
  'Passion Fruit Mojito': 'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=400&q=80',
  'Peach Mojito': 'https://images.unsplash.com/photo-1570197788417-0e82375c9371?w=400&q=80',
  'Cranberry Mojito': 'https://images.unsplash.com/photo-1570197788417-0e82375c9371?w=400&q=80',
  'Lemon Iced Tea': 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=400&q=80',
  'Peach Iced Tea': 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=400&q=80',
  'Cranberry Iced Tea': 'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=400&q=80',
  'Blueberry Iced Tea': 'https://images.unsplash.com/photo-1548943487-a2e4e43b4853?w=400&q=80',
  'Passion Fruit Iced Tea': 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=400&q=80',
  // Breakfast
  'Avocado Toast': 'https://images.unsplash.com/photo-1541519227354-08fa5d50c820?w=400&q=80',
  'Creamy Mushroom Toast': 'https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=400&q=80',
  'Protein Toast': 'https://images.unsplash.com/photo-1565299507177-b0ac66763828?w=400&q=80',
  'Grilled Tomato & Fresh Mozzarella': 'https://images.unsplash.com/photo-1546549032-9571cd6b27df?w=400&q=80',
  'Farmhouse Platter': 'https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=400&q=80',
  'English Platter': 'https://images.unsplash.com/photo-1600335895229-6e75511892c8?w=400&q=80',
  'Classic Scrambled Egg': 'https://images.unsplash.com/photo-1482049016688-2d3e1b311543?w=400&q=80',
  'Shakshuka': 'https://images.unsplash.com/photo-1572441713132-51c75654db73?w=400&q=80',
  'Turkish Yogurt & Eggs': 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=400&q=80',
  'Tropical Mango & Pineapple': 'https://images.unsplash.com/photo-1511690743698-d9d85f2fbf38?w=400&q=80',
  'Banana Matcha': 'https://images.unsplash.com/photo-1590301157890-4810ed352733?w=400&q=80',
  // Pancakes & Waffles
  'Original Pancake': 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=400&q=80',
  'Nutella Banana Pancake': 'https://images.unsplash.com/photo-1528207776546-365bb710ee93?w=400&q=80',
  'Triple Chocolate Pancake': 'https://images.unsplash.com/photo-1565299507177-b0ac66763828?w=400&q=80',
  'Original French Toast': 'https://images.unsplash.com/photo-1484723091739-30a097e8f929?w=400&q=80',
  'Nutella & Banana French Toast': 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=400&q=80',
  'Matcha French Toast': 'https://images.unsplash.com/photo-1484723091739-30a097e8f929?w=400&q=80',
  'Classic Waffle': 'https://images.unsplash.com/photo-1562376552-0d160a2f238d?w=400&q=80',
  'Triple Chocolate Waffle': 'https://images.unsplash.com/photo-1562376552-0d160a2f238d?w=400&q=80',
  'Nutella, Banana & Almond Waffle': 'https://images.unsplash.com/photo-1562376552-0d160a2f238d?w=400&q=80',
  'Blueberry Cheesecake Waffle': 'https://images.unsplash.com/photo-1562376552-0d160a2f238d?w=400&q=80',
  // Mains
  'Thai Curry & Rice': 'https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?w=400&q=80',
  'Makhani & Rice': 'https://images.unsplash.com/photo-1574484284002-952d92456975?w=400&q=80',
  'Chicken Grill': 'https://images.unsplash.com/photo-1432139509613-5c4255815697?w=400&q=80',
  'Cottage Cheese Grill': 'https://images.unsplash.com/photo-1432139509613-5c4255815697?w=400&q=80',
  'Fish Grill': 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=400&q=80',
  'Rigatoni / Penne': 'https://images.unsplash.com/photo-1563379926898-05f4575a45d8?w=400&q=80',
  'Spaghetti': 'https://images.unsplash.com/photo-1598866594230-a7c12756260f?w=400&q=80',
  'Spaghetti Parmesano Chicken': 'https://images.unsplash.com/photo-1555949258-eb67b1ef0ceb?w=400&q=80',
  'Truffle Parmesan Fries': 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=400&q=80',
  'French Fries': 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=400&q=80',
  'Chicken Wings': 'https://images.unsplash.com/photo-1527477396000-e27163b481c2?w=400&q=80',
  'Chicken Strips': 'https://images.unsplash.com/photo-1562802378-063ec186a863?w=400&q=80',
  'Chicken Nuggets': 'https://images.unsplash.com/photo-1562802378-063ec186a863?w=400&q=80',
  'Fish & Chips': 'https://images.unsplash.com/photo-1535400255456-984e0e87e948?w=400&q=80',
  'Cheesy Garlic Bread': 'https://images.unsplash.com/photo-1573140247632-f8fd74997d5c?w=400&q=80',
  'Pull Me Garlic Bun': 'https://images.unsplash.com/photo-1604882737280-dc1db9fa9c16?w=400&q=80',
  'Crispy Sliders Chicken': 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&q=80',
  'Crispy Sliders Paneer': 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&q=80',
  'Jalapeño Poppers': 'https://images.unsplash.com/photo-1616349654318-e4b7e4e9a7f1?w=400&q=80',
  'Creamy Broccoli Soup with Pita Bread': 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=400&q=80',
  // Salads
  'Caesar Salad': 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&q=80',
  'Greek Salad': 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=400&q=80',
  'Watermelon Feta': 'https://images.unsplash.com/photo-1563227812-0ea4c22e6cc8?w=400&q=80',
  'Thai Salad': 'https://images.unsplash.com/photo-1607532941433-304659e8198a?w=400&q=80',
  'Waldorf Salad': 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&q=80',
  // Burgers
  'Spicy Chicken Burger': 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&q=80',
  'Bang Bang Chicken Burger': 'https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?w=400&q=80',
  'Home Style Chicken Burger': 'https://images.unsplash.com/photo-1551782450-17144efb9c50?w=400&q=80',
  'Smash Chicken Burger': 'https://images.unsplash.com/photo-1585238342024-78d387f4a707?w=400&q=80',
  'Chickpea Patty Burger': 'https://images.unsplash.com/photo-1520072959219-c595dc870360?w=400&q=80',
  'Cottage Cheese Crispy Burger': 'https://images.unsplash.com/photo-1569091791842-7cfb64e04797?w=400&q=80',
  'Beetroot Patty Burger': 'https://images.unsplash.com/photo-1520072959219-c595dc870360?w=400&q=80',
  'Cilantro Lime Chicken Burger': 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&q=80',
  'Gochujang Burger': 'https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?w=400&q=80',
  // Sandwiches
  'Egg & Cheese Sandwich': 'https://images.unsplash.com/photo-1528736235302-52922df5c122?w=400&q=80',
  'Chicken & Cheese Sandwich': 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=400&q=80',
  'Crispy Chicken Sandwich': 'https://images.unsplash.com/photo-1565299507177-b0ac66763828?w=400&q=80',
  'Caprese Sandwich': 'https://images.unsplash.com/photo-1546793665-c74683f339c1?w=400&q=80',
  'Paneer Tikka Sandwich': 'https://images.unsplash.com/photo-1528736235302-52922df5c122?w=400&q=80',
  "Grandma's Grilled Vegetable Sandwich": 'https://images.unsplash.com/photo-1481070414801-51fd732d7184?w=400&q=80',
};

function getItemImg(name, jsonUrl) {
  if (jsonUrl && jsonUrl.trim()) return jsonUrl;
  return ITEM_IMGS[name] || DEFAULT_ITEM_IMG;
}

function formatPrice(prices) {
  if (!prices) return '';
  if (Array.isArray(prices)) {
    return prices.length > 1 ? '₹' + prices[0] + ' – ₹' + prices[prices.length - 1] : '₹' + prices[0];
  }
  return '₹' + prices;
}

function buildSimpleItemDescription(name, category, subcategory) {
  const nameText = String(name || 'House Special').trim();
  const n = nameText.toLowerCase();
  const sectionText = String(subcategory || category || 'kitchen').trim();

  function hashSeed(text) {
    let hash = 0;
    for (let i = 0; i < text.length; i += 1) {
      hash = ((hash << 5) - hash + text.charCodeAt(i)) | 0;
    }
    return Math.abs(hash);
  }

  function pick(list, seed, offset) {
    return list[(seed + offset) % list.length];
  }

  const seed = hashSeed(`${nameText}|${category || ''}|${subcategory || ''}`);
  const moods = ['flavor-packed', 'well-balanced', 'freshly crafted', 'comfort-style', 'signature'];
  const methods = ['made to order', 'prepared with care', 'finished with house seasoning', 'served fresh', 'built for a satisfying bite'];
  const endings = ['perfect for any time of day', 'a guest favorite on our menu', 'great when you want bold taste', 'crafted for a clean and rich finish', 'designed to keep every bite interesting'];

  let type = 'house special';
  if (n.includes('burger')) type = 'burger';
  else if (n.includes('sandwich')) type = 'sandwich';
  else if (n.includes('pasta') || n.includes('spaghetti') || n.includes('rigatoni') || n.includes('penne')) type = 'pasta bowl';
  else if (n.includes('coffee') || n.includes('espresso') || n.includes('latte') || n.includes('cappuccino')) type = 'coffee brew';
  else if (n.includes('matcha') || n.includes('hojicha')) type = 'tea blend';
  else if (n.includes('mojito') || n.includes('lemonade') || n.includes('juice') || n.includes('smoothie') || n.includes('shake')) type = 'refreshing drink';
  else if (n.includes('pancake') || n.includes('waffle') || n.includes('toast')) type = 'sweet plate';
  else if (n.includes('salad')) type = 'fresh salad';
  else if (n.includes('soup')) type = 'warm soup';

  return `${nameText} is a ${pick(moods, seed, 0)} ${type} from our ${sectionText} selection, ${pick(methods, seed, 2)} and ${pick(endings, seed, 4)}.`;
}

/* ── INIT ── */
document.addEventListener('DOMContentLoaded', async () => {
  // Theme
  const saved = localStorage.getItem('blaze_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', saved);
  const themeBtn = document.getElementById('themeToggle');
  if (themeBtn) themeBtn.innerHTML = saved === 'dark' ? '☀️' : '🌙';
  themeBtn?.addEventListener('click', () => {
    const cur = document.documentElement.getAttribute('data-theme');
    const next = cur === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('blaze_theme', next);
    themeBtn.innerHTML = next === 'dark' ? '☀️' : '🌙';
  });

  // Initialize cart badge from localStorage
  updateCatCartUI();

  // Wire cart button to open cart panel
  document.getElementById('cartBtn')?.addEventListener('click', openCatCart);

  // Get category from URL
  const params = new URLSearchParams(window.location.search);
  const catName = decodeURIComponent(params.get('cat') || '');

  // Load menu from backend API
  let menuData = [];
  try {
    const res = await fetch('http://localhost:5000/api/menus');
    const apiData = await res.json();
    menuData = apiData.data || [];
  } catch (e) {
    console.error('Failed to load menu from API', e);
  }

  const catData = menuData.find(c => c.category === catName);

  if (!catData) {
    document.getElementById('categoryTitle').textContent = 'Category Not Found';
    document.getElementById('restaurantGrid').innerHTML = '<p style="padding:40px;color:var(--text-muted)">No items found. <a href="index.html#menu" style="color:var(--orange)">Go back</a></p>';
    return;
  }

  // Populate header
  const meta = CATEGORY_META[catData.category] || { icon: '🍽️', img: DEFAULT_ITEM_IMG, desc: '' };
  document.title = catData.category + ' — White Teak Roasters';
  document.getElementById('categoryTitle').textContent = meta.icon + ' ' + catData.category;
  document.getElementById('categoryDescription').textContent = meta.desc;
  document.getElementById('categoryHeaderImage').querySelector('img').src = meta.img;
  document.getElementById('categoryHeaderImage').querySelector('img').alt = catData.category;

  const totalItems = catData.subcategories.reduce((s, sub) => s + sub.items.length, 0);
  document.getElementById('restaurantCount').textContent = totalItems + ' Items · ' + catData.subcategories.length + ' Sections';

  // Render subcategory tabs
  const subTabsContainer = document.getElementById('subCategoryTabs');
  const allSubcats = catData.subcategories;

  if (subTabsContainer) {
    subTabsContainer.innerHTML = '';
    const allBtn = document.createElement('button');
    allBtn.className = 'subcat-tab active';
    allBtn.textContent = 'All';
    allBtn.onclick = () => { filterSubcat('all', allBtn); };
    subTabsContainer.appendChild(allBtn);

    allSubcats.forEach(sub => {
      const btn = document.createElement('button');
      btn.className = 'subcat-tab';
      btn.textContent = sub.name;
      btn.onclick = () => { filterSubcat(sub.name, btn); };
      subTabsContainer.appendChild(btn);
    });
  }

  // Render all subcategory sections into the grid
  const grid = document.getElementById('restaurantGrid');
  grid.innerHTML = '';
  grid.style.display = 'block';

  allSubcats.forEach(sub => {
    const section = document.createElement('div');
    section.className = 'subcat-section';
    section.dataset.subcat = sub.name;

    const subImg = SUBCATEGORY_IMGS[sub.name] || DEFAULT_ITEM_IMG;
    section.innerHTML = `
      <div class="subcat-header">
        <img class="subcat-header-img" src="${subImg}" alt="${sub.name}" onerror="this.style.display='none'">
        <h3 class="subcat-title">${sub.name}</h3>
        <span class="subcat-count">${sub.items.length} items</span>
      </div>
      <div class="items-grid" id="grid-${sub.name.replace(/[^a-z0-9]/gi, '_')}"></div>
    `;
    grid.appendChild(section);

    const itemsGrid = section.querySelector('.items-grid');
    sub.items.forEach(item => {
      const img = getItemImg(item.name, item.image_url);
      const priceStr = formatPrice(item.prices || item.price_inr);
      const displayNote = (item.note || buildSimpleItemDescription(item.name, catData.category, sub.name)).trim();
      const card = document.createElement('div');
      card.className = 'item-card';
      card.innerHTML = `
        <div class="item-card-img-wrap">
          <img src="${img}" alt="${item.name}" loading="lazy" onerror="this.src='${DEFAULT_ITEM_IMG}'">
        </div>
        <div class="item-card-body">
          <div class="item-card-name item-note-trigger">${item.name}</div>
          <div class="item-card-note-wrap">
            <div class="item-card-note">${displayNote}</div>
          </div>
          <div class="item-card-footer">
            <div class="item-card-price">${priceStr}</div>
            <button class="btn-item-add" onclick="addItemToCart('${item.name.replace(/'/g,"\\'")}', ${Array.isArray(item.prices) ? item.prices[0] : (item.price_inr || 0)}, '${img}')">
              <i class="fas fa-plus"></i>
            </button>
          </div>
        </div>`;

      const noteTrigger = card.querySelector('.item-note-trigger');
      const noteWrap = card.querySelector('.item-card-note-wrap');
      const noteText = card.querySelector('.item-card-note');
      if (noteTrigger && noteWrap) {
        const toggleNote = e => {
          e.preventDefault();
          e.stopPropagation();
          const isOpen = noteWrap.classList.toggle('expanded');
          noteTrigger.classList.toggle('expanded', isOpen);
        };
        noteTrigger.addEventListener('click', toggleNote);
        noteText?.addEventListener('click', toggleNote);
      }

      itemsGrid.appendChild(card);
    });
  });

  // Search
  const searchInput = document.getElementById('catSearchInput');
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      const q = searchInput.value.toLowerCase().trim();
      document.querySelectorAll('.item-card').forEach(card => {
        const name = card.querySelector('.item-card-name')?.textContent.toLowerCase() || '';
        card.style.display = name.includes(q) ? '' : 'none';
      });
      // Show/hide sections based on visible items
      document.querySelectorAll('.subcat-section').forEach(sec => {
        const visible = [...sec.querySelectorAll('.item-card')].some(c => c.style.display !== 'none');
        sec.style.display = visible ? '' : 'none';
      });
    });
  }

  // Sort
  const sortSelect = document.getElementById('sortSelect');
  if (sortSelect) {
    sortSelect.addEventListener('change', () => {
      const val = sortSelect.value;
      document.querySelectorAll('.items-grid').forEach(g => {
        const cards = [...g.querySelectorAll('.item-card')];
        cards.sort((a, b) => {
          const pa = parseFloat(a.querySelector('.item-card-price')?.textContent.replace(/[^\d.]/g,'')) || 0;
          const pb = parseFloat(b.querySelector('.item-card-price')?.textContent.replace(/[^\d.]/g,'')) || 0;
          const na = a.querySelector('.item-card-name')?.textContent || '';
          const nb = b.querySelector('.item-card-name')?.textContent || '';
          if (val === 'price-low') return pa - pb;
          if (val === 'price-high') return pb - pa;
          if (val === 'name') return na.localeCompare(nb);
          return 0;
        });
        cards.forEach(c => g.appendChild(c));
      });
    });
  }

  // Scroll top
  const scrollTopBtn = document.getElementById('scrollTop');
  window.addEventListener('scroll', () => scrollTopBtn?.classList.toggle('visible', window.scrollY > 600), { passive: true });
  scrollTopBtn?.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

  // Navbar scroll
  const navbar = document.getElementById('navbar');
  window.addEventListener('scroll', () => navbar?.classList.toggle('scrolled', window.scrollY > 60), { passive: true });

  // Live chat
  setupLiveChat();
});

function setupLiveChat() {
  const btn = document.getElementById('liveChatBtn');
  const panel = document.getElementById('chatPanel');
  const closeBtn = document.getElementById('closeChatBtn');
  const input = document.getElementById('chatInput');
  const sendBtn = document.getElementById('sendChatBtn');
  const messages = document.getElementById('chatMessages');
  if (!btn || !panel || !messages) return;

  const chatHistory = [];
  let inFlight = false;

  btn.addEventListener('click', () => panel.classList.toggle('open'));
  closeBtn?.addEventListener('click', () => panel.classList.remove('open'));

  setTimeout(() => addChatMsg('Hi! I am Blaze AI (Ollama). Ask me about menu, delivery, timings, or offers.', 'bot'), 600);

  function addChatMsg(text, type) {
    const msg = document.createElement('div');
    msg.className = `chat-msg ${type}`;
    msg.textContent = text;
    messages.appendChild(msg);
    messages.scrollTop = messages.scrollHeight;
    return msg;
  }

  function setInputState(disabled) {
    if (input) input.disabled = disabled;
    if (sendBtn) sendBtn.disabled = disabled;
  }

  async function sendMsg() {
    if (inFlight || !input) return;
    const val = input.value.trim();
    if (!val) return;

    addChatMsg(val, 'user');
    input.value = '';
    inFlight = true;
    setInputState(true);

    const typingEl = addChatMsg('Blaze AI is typing...', 'bot');

    try {
      const res = await fetch(`${API_BASE}/chat/ollama`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: val,
          history: chatHistory
        })
      });

      const data = await res.json();
      typingEl.remove();

      if (!res.ok || !data.success) {
        addChatMsg(data.message || 'AI is unavailable right now. Please try again in a moment.', 'bot');
      } else {
        chatHistory.push({ role: 'user', content: val });
        chatHistory.push({ role: 'assistant', content: data.reply });
        addChatMsg(data.reply, 'bot');
      }
    } catch (err) {
      typingEl.remove();
      addChatMsg('Could not connect to AI support. Make sure backend and Ollama are running.', 'bot');
    } finally {
      inFlight = false;
      setInputState(false);
      input.focus();
    }
  }

  sendBtn?.addEventListener('click', sendMsg);
  input?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') sendMsg();
  });
}

function filterSubcat(name, clickedBtn) {
  document.querySelectorAll('.subcat-tab').forEach(b => b.classList.remove('active'));
  clickedBtn.classList.add('active');
  document.querySelectorAll('.subcat-section').forEach(sec => {
    sec.style.display = (name === 'all' || sec.dataset.subcat === name) ? '' : 'none';
  });
  // Scroll to top of sections
  document.querySelector('.subcat-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function addItemToCart(name, price, img) {
  // Persist to localStorage cart so index.html / checkout can pick it up
  let cart = [];
  try { cart = JSON.parse(localStorage.getItem('blaze_cart') || '[]'); } catch(e) {}
  const existing = cart.find(i => i.name === name);
  if (existing) { existing.quantity = (existing.quantity || existing.qty || 1) + 1; delete existing.qty; }
  else { cart.push({ id: Date.now(), name, price, image: img, quantity: 1, category: 'menu' }); }
  localStorage.setItem('blaze_cart', JSON.stringify(cart));

  // Update badge and sidebar
  updateCatCartUI();

  // Show toast
  showCatToast('Added to cart: ' + name);
}

/* ══════════════════════════════
   CART PANEL FUNCTIONALITY
   ══════════════════════════════ */
function openCatCart() {
  document.getElementById('cartPanel')?.classList.add('open');
  document.getElementById('cartOverlay')?.classList.add('active');
  document.body.style.overflow = 'hidden';
  updateCatCartUI();
}

function closeCatCart() {
  document.getElementById('cartPanel')?.classList.remove('open');
  document.getElementById('cartOverlay')?.classList.remove('active');
  document.body.style.overflow = '';
}

function updateCatCartUI() {
  let cart = [];
  try { cart = JSON.parse(localStorage.getItem('blaze_cart') || '[]'); } catch(e) {}

  const totalQty = cart.reduce((s, i) => s + (i.quantity || 1), 0);
  const subtotal  = cart.reduce((s, i) => s + i.price * (i.quantity || 1), 0);

  // Update badge in navbar
  const badge = document.getElementById('cartCount');
  if (badge) {
    badge.textContent = totalQty;
    badge.style.display = totalQty > 0 ? '' : 'none';
  }

  // Update cart body
  const body   = document.getElementById('cartItems');
  const footer = document.getElementById('cartFooter');
  if (!body) return;

  if (!cart.length) {
    body.innerHTML = `
      <div class="cart-empty">
        <div class="cart-empty-icon">🛒</div>
        <p>Your cart is empty</p>
      </div>`;
    if (footer) footer.style.display = 'none';
    if (document.getElementById('cartItemLabel')) document.getElementById('cartItemLabel').textContent = '0 items';
    return;
  }

  body.innerHTML = cart.map(item => `
    <div class="cart-item" data-id="${item.id}">
      <img class="cart-item-img" src="${item.image || DEFAULT_ITEM_IMG}" alt="${item.name}"
           onerror="this.src='${DEFAULT_ITEM_IMG}'" />
      <div class="cart-item-info">
        <div class="cart-item-name">${item.name}</div>
        <div class="cart-item-price">₹${item.price}</div>
      </div>
      <div class="qty-controls">
        <button class="qty-btn-sm" onclick="changeCatQty(${item.id}, -1)">−</button>
        <span class="qty-val">${item.quantity || 1}</span>
        <button class="qty-btn-sm" onclick="changeCatQty(${item.id}, 1)">+</button>
      </div>
      <button class="cart-remove" onclick="removeCatItem(${item.id})">
        <i class="fas fa-trash"></i>
      </button>
    </div>`).join('');

  if (footer) {
    footer.style.display = '';
    const subEl = document.getElementById('catSubtotal');
    const totEl = document.getElementById('catTotal');
    if (subEl) subEl.textContent = `₹${subtotal}`;
    if (totEl) totEl.textContent = `₹${subtotal}`;
  }

  const label = document.getElementById('cartItemLabel');
  if (label) label.textContent = `${totalQty} item${totalQty !== 1 ? 's' : ''}`;
}

function changeCatQty(id, delta) {
  let cart = [];
  try { cart = JSON.parse(localStorage.getItem('blaze_cart') || '[]'); } catch(e) {}
  const item = cart.find(i => i.id == id);
  if (!item) return;
  item.quantity = (item.quantity || 1) + delta;
  if (item.quantity <= 0) {
    cart = cart.filter(i => i.id != id);
  }
  localStorage.setItem('blaze_cart', JSON.stringify(cart));
  updateCatCartUI();
}

function removeCatItem(id) {
  let cart = [];
  try { cart = JSON.parse(localStorage.getItem('blaze_cart') || '[]'); } catch(e) {}
  cart = cart.filter(i => i.id != id);
  localStorage.setItem('blaze_cart', JSON.stringify(cart));
  updateCatCartUI();
  showCatToast('Item removed from cart');
}

window.changeCatQty  = changeCatQty;
window.removeCatItem = removeCatItem;
window.openCatCart   = openCatCart;
window.closeCatCart  = closeCatCart;

function showCatToast(msg) {
  let container = document.getElementById('toastContainer');
  if (!container) { container = document.createElement('div'); container.id = 'toastContainer'; container.className = 'toast-container'; document.body.appendChild(container); }
  const toast = document.createElement('div');
  toast.className = 'toast toast-success';
  toast.innerHTML = '<i class="fas fa-check-circle"></i> ' + msg;
  container.appendChild(toast);
  setTimeout(() => toast.classList.add('show'), 10);
  setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 300); }, 3000);
}

window.filterSubcat = filterSubcat;
window.addItemToCart = addItemToCart;
window.closeMobileMenu = () => {
  document.getElementById('menuToggle')?.classList.remove('open');
  document.getElementById('mobileNav')?.classList.remove('open');
};

/* ── CUSTOM CURSOR ── */
(function setupCursor() {
  const cursor    = document.getElementById('cursor');
  const cursorDot = document.getElementById('cursorDot');
  if (!cursor || !cursorDot || window.matchMedia('(pointer: coarse)').matches) return;
  let mouseX = 0, mouseY = 0, curX = 0, curY = 0;
  document.addEventListener('mousemove', e => {
    mouseX = e.clientX; mouseY = e.clientY;
    cursorDot.style.left = mouseX + 'px'; cursorDot.style.top = mouseY + 'px';
  });
  (function animate() {
    curX += (mouseX - curX) * 0.12;
    curY += (mouseY - curY) * 0.12;
    cursor.style.left = curX + 'px'; cursor.style.top = curY + 'px';
    requestAnimationFrame(animate);
  })();
  document.querySelectorAll('button, a, .item-card, .subcat-tab, .category-item').forEach(el => {
    el.addEventListener('mouseenter', () => cursor.classList.add('hover-state'));
    el.addEventListener('mouseleave', () => cursor.classList.remove('hover-state'));
  });
})();

/* ══════════════════════════════════════════════
   SSE — Real-time menu updates (no refresh)
   ══════════════════════════════════════════════ */
(function connectCategorySSE() {
  let closing = false;
  const es = new EventSource('http://localhost:5000/api/events/public');

  es.addEventListener('menu-updated', () => {
    console.log('[SSE] 🔄 Menu updated — reloading category page…');
    location.reload();
  });

  es.onerror = () => {
    if (closing) return;
    if (es.readyState === EventSource.CLOSED) {
      setTimeout(connectCategorySSE, 5000);
    }
  };

  window.addEventListener('beforeunload', () => {
    closing = true;
    es.close();
  });
})();