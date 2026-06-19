ITEM_DEFS.goldingot = {
  id:          'goldingot',
  name:        'ทอง',
  emoji:       '🪙',
  image:       'assets/items/goldingot.png',
  description: '',
  maxStack:    50,
  use() {
    Inventory._toast('ทอง นำไปขายที่ตลาดได้', { icon: '📦', color: '#00ff00' });
    return false;
  },
};
