/** Metro requires static references for bundled images; metadata stays in JSON. */
export const atlasAssets: Record<string, number> = {
  dungeon: require('../../assets/game/dungeon.png'),
  'white-spider': require('../../assets/game/enemies/white-spider.png'),
  'black-spider': require('../../assets/game/enemies/black-spider.png'),
  'red-spider': require('../../assets/game/enemies/red-spider.png'),
  'giant-black-spider': require('../../assets/game/enemies/giant-black-spider.png'),
};
