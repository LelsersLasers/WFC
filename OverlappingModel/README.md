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

- Is it actually working???
- Speed?
    - Prob rewrite with classes instead of W
- Remove H??
- Optional WRAP
- Add flips/rotations to pattern data
- Weighted choices
- Improve UI
    - Spinning thing when loading
	- Live update svg rect elements as they get changed in propagate()
- Resources:
	- https://discourse.processing.org/t/wave-collapse-function-algorithm-in-processing/12983
	- https://github.com/mxgmn/WaveFunctionCollapse
