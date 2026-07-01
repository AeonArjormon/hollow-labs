# Shadow Jump Assets

`shadow-jump-sprites.svg` is the original source reference sheet for the first playable pass.

`raster/` contains the PNG game art now used by Phaser:

- `background-light.png`
- `background-shadow.png`
- `hero-light.png`
- `hero-shadow.png`
- `enemy-light.png`
- `enemy-shadow.png`
- `feather-light.png`
- `feather-shadow.png`

The game still keeps small runtime-generated fallback textures for effects and missing asset recovery, but primary character, enemy, projectile, and scene background art uses PNG images.
