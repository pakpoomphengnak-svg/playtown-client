ITEM_DEFS.burger = {
  id:          'burger',
  name:        'เบอร์เกอร์',
  image:       'assets/items/burger.png',
  emoji:       '🍔',
  description: '',
  maxStack:    30,
  use() {
    if (typeof Player !== 'undefined') Player.eatFood(50);
    return true;
  },
};
