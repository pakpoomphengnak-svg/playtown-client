ITEM_DEFS.water_bottle = {
  id:          'water_bottle',
  name:        'น้ำเปล่า',
  image:       'assets/items/water_bottle.png',
  emoji:       '💧',
  description: '',
  maxStack:    30,
  use() {
    if (typeof Player !== 'undefined') Player.drinkWater(50);
    return true;
  },
};
