ITEM_DEFS.rock = {
  id:          'rock',
  name:        'หินแร่',
  emoji:       '🪨',
  image:       'assets/items/rock.png',
  description: '',
  maxStack:    100,
  use() {
    Inventory._toast('หินแร่ นำไปแปรรูปก่อน ถึงจะนำไปขายที่ตลาดได้', { icon: '🪨', color: '#00ff00' });
    return false;
  },
};
