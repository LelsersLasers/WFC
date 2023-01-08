# Overlapping Model v2

Takes 1 input image.

## Keybinds

- Enter: toggle auto collapse on propogate finish
- Space: collapse 1 cell and propagate
- Escape: stop auto progress
- D: toggle drawing valid states of non-collapsed cells
- E: toggle drawing outline around grid tiles
- H: toggle drawing entropy
- R: reset grid

## Todo?

- Speed?
    - Lots of unnecessary/duplicated updating
    - Where is speed lost
- Optional WRAP
- Add flips/rotations to pattern data
- Optional ceiling/floor pixels
    - To better "replicate" the input image
- Improve UI
    - Maybe make it like the 3d cellular automata
        - https://lelserslasers.itch.io/3d-cellular-automata-wgpu-rust
        - https://github.com/LelsersLasers/3D-Cellular-Automata-WGPU/tree/SetRuleFromHTML
    - And a start menu for non "run time" options
        - Wrap, N, upload picture there, dims, which flips/rotations to use, ceiling/floor pixels, etc
        - Like wordle single player create game page
- Clean?
    - Use the GridSpot class a bit better?
## Resources

- https://discourse.processing.org/t/wave-collapse-function-algorithm-in-processing/12983
- https://github.com/mxgmn/WaveFunctionCollapse
