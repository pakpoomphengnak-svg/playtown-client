ITEM_DEFS.gachav1 = {
  id:          'gachav1',
  name:        'กาชา V1',
  image:       'assets/items/gachav1.png',
  emoji:       '🎰',
  description: '',
  maxStack:    Infinity,
  use() {
    if (typeof Gacha !== 'undefined' && typeof Gacha.open === 'function') {
      Gacha.open('gachav1');
    } else {
      Inventory._toast('ระบบกาชายังไม่พร้อมใช้งาน', { icon: '🎰', color: '#00ff00' });
    }
    return false;
  },
};
