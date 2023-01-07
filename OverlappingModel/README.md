# Overlapping Model

Takes 1 input image.

## Keybinds

- Enter: toggle auto progress
- Space: progress 1 iteration
- Escape: stop auto progress
- D: toggle drawing valid states of non-collapsed cells
- O: toggle drawing outline boarder of valid tile spots
- E: toggle drawing outline around grid tiles
- H: toggle drawing entropy
- R: reset grid

## Todo?

- "Throttoling" when not propagating?
    - Right now: 100%s a CPU core thread
        - While propagating and while not propagating
- Speed?
    - Prob rewrite with classes instead of W
    - Remove H??
    - Lots of unnecessary/duplicated updating
- Optional WRAP
- Add flips/rotations to pattern data
- Weighted choices
- Optional ceiling/floor pixels
    - To better "replicate" the input image
- Improve UI
    - Maybe make it like the 3d cellular automata
        - https://lelserslasers.itch.io/3d-cellular-automata-wgpu-rust
        - https://github.com/LelsersLasers/3D-Cellular-Automata-WGPU/tree/SetRuleFromHTML
    - And a start menu for non "run time" options
        - Wrap, N, upload picture there, dims, which flips/rotations to use, ceiling/floor pixels, etc
- Clean?
## Resources

- https://discourse.processing.org/t/wave-collapse-function-algorithm-in-processing/12983
- https://github.com/mxgmn/WaveFunctionCollapse
