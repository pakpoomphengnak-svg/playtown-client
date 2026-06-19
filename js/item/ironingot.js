ITEM_DEFS.ironingot = {
  id:          'ironingot',
  name:        'เหล็ก',
  emoji:       '🔩',
  image:       'assets/items/ironingot.png',
  description: '',
  maxStack:    50,
  use() {
    Inventory._toast('เหล็ก นำไปขายที่ตลาดได้', { icon: '📦', color: '#00ff00' });
    return false;
  },
};
