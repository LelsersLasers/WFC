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

- Final touches
    - Wrap edge cases
        - Is wrapping working correctly?
        - How wrap, floor/ceiling/side, rotate/flip interact 
        - How Color(-1, -1, -1) interacts?
        - Top edge vs bottom edge (left vs right)
            - Acts differently
    - User proof
    - I think its all working
- Speed?
    - Lots of unnecessary/duplicated updating
    - Where is speed lost
        - Likely all my "some" iteration
- UI
    - Make text input fill width?????????
- Clean?
    - Use the GridSpot class a bit better?
- Itch.io
    - Video
    - Screenshots/gifs
    - Write up
    - Downloadable zip
    - Mimic WGPU one

## Resources

- https://discourse.processing.org/t/wave-collapse-function-algorithm-in-processing/12983
- https://github.com/mxgmn/WaveFunctionCollapse
