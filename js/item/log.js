ITEM_DEFS.log = {
  id:          'log',
  name:        'ท่อนไม้',
  emoji:       '🪵',
  image:       'assets/items/log.png',
  description: '',
  maxStack:    100,
  use() {
    Inventory._toast('ท่อนไม้ นำไปแปรรูปก่อน ถึงจะนำไปขายที่ตลาดได้', { icon: '🪵', color: '#00ff00' });
    return false;
  },
};
