ITEM_DEFS.woodplank = {
  id:          'woodplank',
  name:        'ไม้แปรรูป',
  emoji:       '📦',
  image:       'assets/items/woodplank.png',
  description: '',
  maxStack:    50,
  use() {
    Inventory._toast('ไม้แปรรูป นำไปขายที่ตลาดได้', { icon: '📦', color: '#00ff00' });
    return false;
  },
};
