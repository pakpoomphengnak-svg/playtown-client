ITEM_DEFS.cement = {
  id:          'cement',
  name:        'ปูน',
  image:       'assets/items/cement.png',
  emoji:       '🧱',
  description: '',
  maxStack:    50,
  use() {
    Inventory._toast('ปูน ที่ไปขโมยมา', { icon: '🧱', color: '#00ff00' });
    return false;
  },
};
