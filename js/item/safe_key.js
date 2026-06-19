ITEM_DEFS.safe_key = {
  id:          'safe_key',
  name:        'กุญแจตู้เซฟ',
  emoji:       '🗝️',
  image:       'assets/items/safe_key.png',
  description: '',
  maxStack:    1,
  use(slot) {
    Inventory._toast('กุญแจตู้เซฟ', { icon: '🗝️', color: '#00ff00' });
    return false;
  },
};
