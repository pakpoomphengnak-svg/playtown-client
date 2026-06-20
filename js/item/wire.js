ITEM_DEFS.wire = {
  id:          'wire',
  name:        'สายไฟ',
  image:       'assets/items/wire.png',
  emoji:       '🔌',
  description: '',
  maxStack:    50,
  use() {
    Inventory._toast('สายไฟ ที่ไปขโมยมา', { icon: '🔌', color: '#00ff00' });
    return false;
  },
};
