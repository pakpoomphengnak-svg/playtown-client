ITEM_DEFS.diamond = {
  id:          'diamond',
  name:        'เพชร',
  emoji:       '💎',
  image:       'assets/items/diamond.png',
  description: '',
  maxStack:    50,
  use() {
    Inventory._toast('เพชร นำไปขายที่ตลาดได้', { icon: '📦', color: '#00ff00' });
    return false;
  },
};
