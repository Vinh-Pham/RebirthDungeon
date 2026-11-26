const townNpcSprites = {
  lantern_rest: new Map([
    ["warden", "lantern_nera"],
    ["blacksmith", "lantern_venn"],
    ["school", "lantern_elian"],
    ["church", "lantern_maelin"],
    ["grocery_store", "lantern_corin"],
    ["healer", "lantern_sera"],
    ["general_shop", "lantern_tamsin"],
    ["bank", "lantern_ledger_keeper"],
    ["magic_school", "magic_school_instructor"],
  ]),
  spindle_hollow: new Map([
    ["warden", "town_atlas_1"],
    ["blacksmith", "town_atlas_2"],
    ["general_shop", "town_atlas_1"],
    ["healer", "town_atlas_4"],
    ["bank", "town_atlas_1"],
  ]),
};

export function townNpcSprite(townId: string, landmarkId: string) {
  if (townId === "lantern_rest" || townId === "spindle_hollow") {
    return townNpcSprites[townId].get(landmarkId);
  }
}
