/* =============================================
   BLAZE KITCHEN — seed/seedData.js
   Run: npm run seed
   ============================================= */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');
const User     = require('../models/User.model');
const Menu     = require('../models/Menu.model');

// ── Seed Menu Items (120 items matching frontend) ──
const menuItems = [
  // BURGERS (20)
  { name: 'Classic Smash Burger', category: 'burgers', price: 229, description: 'Double smashed beef patty, American cheese, pickles, special sauce', image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=300&q=70' },
  { name: 'Blaze Double Stack', category: 'burgers', price: 299, description: 'Two beef patties, cheddar, caramelized onions, jalapeño' },
  { name: 'Crispy Chicken Burger', category: 'burgers', price: 249, description: 'Southern fried chicken thigh, coleslaw, honey mustard' },
  { name: 'Veg Portobello Burger', category: 'burgers', price: 199, description: 'Grilled portobello, roasted peppers, pesto, mozzarella' },
  { name: 'BBQ Bacon Beast', category: 'burgers', price: 349, description: 'Beef patty, crispy bacon, BBQ sauce, onion rings' },
  { name: 'Spicy Ghost Burger', category: 'burgers', price: 279, description: 'Ghost pepper sauce, fiery jalapeños, pepper jack cheese' },
  { name: 'Mushroom Swiss Melt', category: 'burgers', price: 259, description: 'Beef patty, sautéed mushrooms, Swiss cheese, truffle aioli' },
  { name: 'Korean BBQ Burger', category: 'burgers', price: 319, description: 'Gochujang beef, kimchi slaw, fried egg, sesame bun' },
  { name: 'Truffle Cheese Burger', category: 'burgers', price: 389, description: 'Wagyu blend patty, truffle cheese, arugula, dijon' },
  { name: 'Buffalo Chicken Burger', category: 'burgers', price: 269, description: 'Buffalo-sauced fried chicken, blue cheese dressing, celery' },
  { name: 'The Big Blaze', category: 'burgers', price: 449, description: 'Triple patty, triple cheese, bacon, extra sauce' },
  { name: 'Paneer Tikka Burger', category: 'burgers', price: 219, description: 'Marinated paneer tikka, mint chutney, pickled onions' },
  { name: 'Fish & Tartar Burger', category: 'burgers', price: 259, description: 'Beer-battered fish fillet, tartar sauce, shredded lettuce' },
  { name: 'Avocado Ranch Burger', category: 'burgers', price: 239, description: 'Fresh avocado, ranch dressing, tomato, lettuce, onion' },
  { name: 'Smokehouse Brisket', category: 'burgers', price: 369, description: 'Slow-smoked brisket, pickled jalapeños, cheddar, BBQ' },
  { name: 'Black Bean Veggie', category: 'burgers', price: 209, description: 'Housemade black bean patty, mango salsa, lime aioli' },
  { name: 'Loaded Nacho Burger', category: 'burgers', price: 289, description: 'Beef patty, nacho cheese, tortilla chips, jalapeños, salsa' },
  { name: 'Egg Bacon Breakfast', category: 'burgers', price: 249, description: 'Fried egg, crispy bacon, cheddar, hash brown patty' },
  { name: 'Chipotle Chicken', category: 'burgers', price: 259, description: 'Grilled chipotle chicken, smoky mayo, corn relish' },
  { name: 'Keto Lettuce Burger', category: 'burgers', price: 279, description: 'No-bun, lettuce wrap, double patty, cheese, pickles' },
  
  // BEVERAGES (20)
  { name: 'Classic Lemonade', category: 'beverages', price: 89, description: 'Fresh squeezed lemons, cane sugar, sparkling water' },
  { name: 'Virgin Mojito', category: 'beverages', price: 99, description: 'Mint, lime, sugar syrup, soda' },
  { name: 'Watermelon Cooler', category: 'beverages', price: 109, description: 'Fresh watermelon, basil, mint, sparkling water' },
  { name: 'Iced Passion Fruit Tea', category: 'beverages', price: 129, description: 'Passion fruit, hibiscus tea, honey, ice' },
  { name: 'Blue Butterfly Lemonade', category: 'beverages', price: 139, description: 'Butterfly pea flower, lemon, mint' },
  { name: 'Cold Brew Tonic', category: 'beverages', price: 149, description: 'Cold brew coffee, premium tonic water, orange peel' },
  { name: 'Strawberry Soda Float', category: 'beverages', price: 159, description: 'Fresh strawberry soda with vanilla ice cream' },
  { name: 'Kiwi Mint Cooler', category: 'beverages', price: 119, description: 'Fresh kiwi, mint, ginger, lime, sparkling water' },
  { name: 'Rose Falooda', category: 'beverages', price: 169, description: 'Rose syrup, vermicelli, basil seeds, cold milk' },
  { name: 'Green Detox Juice', category: 'beverages', price: 129, description: 'Cucumber, spinach, apple, ginger, lemon' },
  { name: 'Ginger Turmeric Latte', category: 'beverages', price: 139, description: 'Turmeric, ginger, oat milk, honey' },
  { name: 'Tamarind Jaljeera', category: 'beverages', price: 79, description: 'Tamarind, cumin, black salt, mint' },
  { name: 'Coconut Water Mojito', category: 'beverages', price: 109, description: 'Fresh coconut water, mint, lime, sea salt' },
  { name: 'Masala Chai Cold Brew', category: 'beverages', price: 149, description: 'Spiced chai cold brewed 24h, served over ice' },
  { name: 'Litchi Rose Lemonade', category: 'beverages', price: 129, description: 'Litchi juice, rose water, lemon, pink salt' },
  { name: 'Sparkling Grape Soda', category: 'beverages', price: 99, description: 'Homemade grape concentrate, sparkling water, mint' },
  { name: 'Pineapple Jalapeño', category: 'beverages', price: 119, description: 'Fresh pineapple, jalapeño, lime — sweet heat' },
  { name: 'Aam Panna', category: 'beverages', price: 89, description: 'Raw mango, cumin, black salt, mint' },
  { name: 'Blaze Signature Punch', category: 'beverages', price: 159, description: 'Our secret house punch — citrus, berry, spice' },

  // DESSERTS (20)
  { name: 'Molten Lava Cake', category: 'desserts', price: 199, description: 'Warm chocolate cake, flowing molten center' },
  { name: 'NY Cheesecake', category: 'desserts', price: 179, description: 'Classic dense cheesecake, berry compote' },
  { name: 'Gulab Jamun Ice Cream', category: 'desserts', price: 149, description: 'Hot gulab jamun meets cold vanilla ice cream' },
  { name: 'Tiramisu Cup', category: 'desserts', price: 189, description: 'Espresso-soaked ladyfingers, mascarpone' },
  { name: 'Chocolate Brownie Sundae', category: 'desserts', price: 229, description: 'Warm fudge brownie, double scoop ice cream' },
  { name: 'Mango Sticky Rice', category: 'desserts', price: 169, description: 'Thai-style sweet sticky rice, fresh alphonso mango' },
  { name: 'Crème Brûlée', category: 'desserts', price: 209, description: 'Classic custard, caramelized sugar top' },
  { name: 'Waffles & Nutella', category: 'desserts', price: 189, description: 'Crispy Belgian waffles, Nutella, banana' },
  { name: 'Kulfi on Stick', category: 'desserts', price: 119, description: 'Homemade pistachio-mango kulfi, rabri drizzle' },
  { name: 'Churros & Dip', category: 'desserts', price: 159, description: 'Crispy cinnamon churros, chocolate sauce' },
  { name: 'Banana Foster', category: 'desserts', price: 199, description: 'Caramelized banana, rum-butter sauce, ice cream' },
  { name: 'Rasgulla Fusion', category: 'desserts', price: 139, description: 'Classic rasgulla with mango sorbet' },
  { name: 'S\'mores Skillet', category: 'desserts', price: 219, description: 'Dark chocolate, toasted marshmallows' },
  { name: 'Mochi Ice Cream', category: 'desserts', price: 179, description: 'Japanese rice cake filled with ice cream' },
  { name: 'Halwa Platter', category: 'desserts', price: 149, description: 'Semolina, carrot and beetroot halwa trio' },
  { name: 'Cookie Dough Jar', category: 'desserts', price: 189, description: 'Edible raw cookie dough, Oreo crumble' },
  { name: 'Apple Crumble', category: 'desserts', price: 169, description: 'Cinnamon spiced apple, oat crumble, custard' },
  { name: 'Tres Leches Cake', category: 'desserts', price: 199, description: 'Milk-soaked sponge, whipped cream, cherries' },
  { name: 'Pistachio Baklava', category: 'desserts', price: 159, description: 'Flaky phyllo, pistachio, honey syrup' },

  // COFFEE & SHAKES (20)
  { name: 'Signature Cold Brew', category: 'coffee', price: 149, description: 'Single origin beans cold brewed 24 hours' },
  { name: 'Espresso Tonic', category: 'coffee', price: 159, description: 'Double espresso shot over sparkling tonic' },
  { name: 'Caramel Macchiato', category: 'coffee', price: 169, description: 'Vanilla syrup, steamed milk, espresso, caramel' },
  { name: 'Nutella Shake', category: 'coffee', price: 199, description: 'Nutella, banana, whole milk, vanilla ice cream' },
  { name: 'Oreo Blizzard Shake', category: 'coffee', price: 189, description: 'Oreo blended with vanilla ice cream' },
  { name: 'Mango Lassi Shake', category: 'coffee', price: 169, description: 'Thick mango yogurt shake with cardamom' },
  { name: 'Peanut Butter Shake', category: 'coffee', price: 199, description: 'Peanut butter, banana, chocolate ice cream' },
  { name: 'Mocha Frappe', category: 'coffee', price: 179, description: 'Blended espresso, chocolate, ice cream' },
  { name: 'Vanilla Soft Shake', category: 'coffee', price: 149, description: 'Classic creamy vanilla milkshake' },
  { name: 'Dirty Chai Latte', category: 'coffee', price: 159, description: 'Masala chai with a shot of espresso' },
  { name: 'Matcha Latte', category: 'coffee', price: 169, description: 'Ceremonial grade matcha, oat milk, honey' },
  { name: 'Strawberry Cheesecake Shake', category: 'coffee', price: 209, description: 'Strawberry, cream cheese, vanilla ice cream' },
  { name: 'Dark Chocolate Shake', category: 'coffee', price: 189, description: '70% dark chocolate, espresso, sea salt' },
  { name: 'Affogato', category: 'coffee', price: 149, description: 'Double shot espresso poured over vanilla gelato' },
  { name: 'Salted Caramel Latte', category: 'coffee', price: 169, description: 'Espresso, salted caramel, steamed milk' },
  { name: 'Banana Walnut Shake', category: 'coffee', price: 179, description: 'Fresh banana, walnut butter, dates, almond milk' },
  { name: 'S\'mores Frappe', category: 'coffee', price: 199, description: 'Chocolate, marshmallow, graham cracker frappe' },
  { name: 'Coconut Coffee Shake', category: 'coffee', price: 189, description: 'Cold brew, coconut milk, coconut ice cream' },
  { name: 'Red Velvet Shake', category: 'coffee', price: 219, description: 'Red velvet crumble, cream cheese ice cream' },

  // APPETIZERS (20)
  { name: 'Loaded Fries', category: 'appetizers', price: 179, description: 'Crispy fries, nacho cheese, jalapeños, sour cream' },
  { name: 'Onion Rings', category: 'appetizers', price: 139, description: 'Beer-battered thick-cut onion rings, ranch dip' },
  { name: 'Chicken Wings (6pc)', category: 'appetizers', price: 299, description: 'Buffalo, BBQ or Honey-Garlic glazed wings' },
  { name: 'Paneer 65', category: 'appetizers', price: 199, description: 'Crispy fried paneer, curry leaf, green chilli' },
  { name: 'Mozzarella Sticks', category: 'appetizers', price: 189, description: 'Fried mozzarella, marinara sauce, basil' },
  { name: 'Veg Spring Rolls', category: 'appetizers', price: 149, description: 'Crispy rolls, noodle & vegetable filling' },
  { name: 'Crispy Calamari', category: 'appetizers', price: 279, description: 'Lightly battered squid rings, aioli' },
  { name: 'Peri Peri Strips', category: 'appetizers', price: 229, description: 'Crispy chicken strips tossed in peri peri sauce' },
  { name: 'Nachos Grande', category: 'appetizers', price: 229, description: 'Tortilla chips, salsa, guacamole, sour cream' },
  { name: 'Samosa Chaat', category: 'appetizers', price: 149, description: 'Crushed samosa, chole, chutneys, yogurt, sev' },
  { name: 'Bruschetta Trio', category: 'appetizers', price: 199, description: 'Classic tomato, mushroom truffle, roasted pepper' },
  { name: 'Prawn Tempura', category: 'appetizers', price: 329, description: 'Light tempura prawns, ponzu dipping sauce' },
  { name: 'Gyoza (6pc)', category: 'appetizers', price: 249, description: 'Pan-fried pork dumplings, soy-ginger sauce' },
  { name: 'Cheese Garlic Bread', category: 'appetizers', price: 149, description: 'Sourdough, garlic butter, melted cheddar' },
  { name: 'Corn & Cheese Bites', category: 'appetizers', price: 169, description: 'Sweet corn, cream cheese, jalapeño, breadcrumb' },
  { name: 'Crispy Tofu Bao', category: 'appetizers', price: 199, description: 'Steamed bao bun, crispy tofu, pickled cucumber' },
  { name: 'Spinach Artichoke Dip', category: 'appetizers', price: 219, description: 'Warm dip with toasted bread, spinach, artichoke' },
  { name: 'Seekh Kebab', category: 'appetizers', price: 279, description: 'Minced lamb seekh kebab, mint chutney' },
  { name: 'Corn Ribs', category: 'appetizers', price: 179, description: 'Baked corn riblets, peri peri spice, lime aioli' },
  { name: 'Pav Bhaji Bruschetta', category: 'appetizers', price: 159, description: 'Mumbai street bhaji on toasted pav' },

  // COMBOS (20)
  { name: 'Blaze Classic Combo', category: 'combos', price: 349, description: 'Classic Smash Burger + Large Fries + Beverage' },
  { name: 'Double Trouble Combo', category: 'combos', price: 449, description: 'Blaze Double Stack + Onion Rings + Cold Brew' },
  { name: 'Family Feast Box', category: 'combos', price: 1199, description: '4 Burgers + 4 Fries + 4 Beverages + 2 Desserts' },
  { name: 'Veg Saver Meal', category: 'combos', price: 399, description: 'Paneer Tikka Burger + Veg Spring Rolls + Mango Lassi' },
  { name: 'Midnight Madness', category: 'combos', price: 599, description: 'Spicy Ghost Burger + Peri Peri Strips + Shake + Brownie' },
  { name: 'Chicken Feast', category: 'combos', price: 549, description: 'Crispy Chicken Burger + 6pc Wings + Loaded Fries + Soda' },
  { name: 'Korean BBQ Combo', category: 'combos', price: 499, description: 'Korean BBQ Burger + Gyoza (6pc) + Matcha Latte' },
  { name: 'Truffle Luxury Set', category: 'combos', price: 699, description: 'Truffle Cheese Burger + Bruschetta + Affogato' },
  { name: 'Game Night Box', category: 'combos', price: 899, description: '2 Burgers + Nachos Grande + 6pc Wings + 4 Beverages' },
  { name: 'Date Night Special', category: 'combos', price: 849, description: '2 Premium Burgers + Mozz Sticks + 2 Shakes + Lava Cake' },
  { name: 'Solo Savage Meal', category: 'combos', price: 649, description: 'The Big Blaze + Loaded Fries + Any Large Shake' },
  { name: 'Breakfast Combo', category: 'combos', price: 399, description: 'Egg Bacon Burger + Hash Browns + Caramel Macchiato' },
  { name: 'Street Food Platter', category: 'combos', price: 449, description: 'Samosa Chaat + Pav Bhaji Bruschetta + Kulfi' },
  { name: 'Veg Royale Combo', category: 'combos', price: 499, description: 'Mushroom Swiss Melt + Paneer 65 + Lassi' },
  { name: 'Spice Trail Combo', category: 'combos', price: 549, description: 'Spicy Ghost Burger + Seekh Kebab + Peri Peri + Jaljeera' },
  { name: 'Ocean\'s Delight', category: 'combos', price: 699, description: 'Fish Burger + Crispy Calamari + Prawn Tempura' },
  { name: 'Health Freak Box', category: 'combos', price: 599, description: 'Keto Lettuce Burger + Avocado Ranch + Green Detox Juice' },
  { name: 'Office Lunch Box (5 pax)', category: 'combos', price: 1499, description: '5 Burgers + 5 Sides + 5 Beverages' },
  { name: 'Kids Happy Meal', category: 'combos', price: 249, description: 'Small Burger + Small Fries + Apple Juice + Ice Cream' },
  { name: 'Cheat Day Pack', category: 'combos', price: 799, description: 'BBQ Bacon Beast + Brownie Sundae + Oreo Shake + Churros' },
];

// ── Seed Users ──
const seedUsers = [
  {
    name    : 'Blaze Admin',
    email   : 'admin@blazekitchen.com',
    password: 'Admin@123',
    role    : 'admin'
  },
  {
    name    : 'Nikhil User',
    email   : 'user@blazekitchen.com',
    password: 'User@123',
    role    : 'user'
  }
];

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Clear existing data
    await User.deleteMany({});
    await Menu.deleteMany({});
    console.log('🗑️  Cleared existing data');

    // Seed users (password will be auto-hashed by pre-save hook)
    const createdUsers = await User.create(seedUsers);
    console.log(`👥 Created ${createdUsers.length} users:`);
    createdUsers.forEach(u => console.log(`   • ${u.role.toUpperCase()}: ${u.email}`));

    // Seed menu items
    const createdMenu = await Menu.insertMany(menuItems);
    console.log(`🍔 Seeded ${createdMenu.length} menu items`);

    console.log('\n✅ Database seeded successfully!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('ADMIN LOGIN:');
    console.log('  Email   : admin@blazekitchen.com');
    console.log('  Password: Admin@123');
    console.log('USER LOGIN:');
    console.log('  Email   : user@blazekitchen.com');
    console.log('  Password: User@123');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    process.exit(0);
  } catch (err) {
    console.error('❌ Seed failed:', err.message);
    process.exit(1);
  }
};

seed();
