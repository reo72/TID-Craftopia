"""The user's material pictures (2026-10-30, C:/Users/reo72/Downloads/Minecraft_Materials_16_Items_32px.zip, kept in
tools/assets/materials/: 32 x 32, background already transparent; items.csv names them). Each is copied over the
picture its item already uses (TARGETS), or, for the job-only specials that still showed a game picture, to
textures/cooptown/materials/ (BP special-config.js texture points there; then run tools/build-special-items.mjs).
wooden_watering_can.png has no item yet (the cans are 銅 / 鉄 / 金 / 極み) and is left out.
Run from the CoopTown_RP folder:  python -P tools/import-material-art.py
"""
import os, shutil

SRC = os.path.join("tools", "assets", "materials")
TARGETS = {
    "generated_metal": "textures/cooptown/cooperation/refined",   # 精製金属 cooptown:refined_ingot
    "herb_bundle": "textures/cooptown/cooperation/herbs",         # 薬草の束
    "potion_recipe": "textures/cooptown/cauldron/scroll",         # レシピの巻物 (also the cauldron screen's scroll)
    "reinforced_timber": "textures/cooptown/cooperation/beam",    # 補強木材 cooptown:timber_beam
    "support_talisman": "textures/cooptown/cooperation/charm",    # 支援の護符 cooptown:rune_charm
    "tool_parts": "textures/cooptown/cooperation/parts",          # 道具部品
    "tomato_sauce": "textures/cooptown/food/tomato_sauce",
    "vegetable_stock": "textures/cooptown/food/vegetable_stock",  # 野菜だし
    "vinegar": "textures/cooptown/food/vinegar",
    "yogurt": "textures/cooptown/food/yogurt",
    # specials (special-config.js)
    "golden_wheat": "textures/cooptown/materials/golden_wheat",
    "mana_powder": "textures/cooptown/materials/mana_dust",
    "phantom_seed": "textures/cooptown/materials/mystic_seed",
    "secret_spice": "textures/cooptown/materials/secret_spice",
    "shining_crystal": "textures/cooptown/materials/shining_crystal",
}

def main():
    for name, dest in TARGETS.items():
        os.makedirs(os.path.dirname(dest), exist_ok=True)
        shutil.copyfile(os.path.join(SRC, name + ".png"), dest + ".png")
        print("art", name, "->", dest)

if __name__ == "__main__":
    main()
