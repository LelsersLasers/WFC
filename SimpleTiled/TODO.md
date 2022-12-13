# TODO

- Async properly
	- Fix 2 sec wait
- Dynamically/programtically choose socket locations

## WFC

### Pre loop

1. Label sockets
	- var: points
		- ex: 1 - just mid point
		- ex: 3 - corners and mid point
		- ex: 5 - 5 number summary spacing
2. Calc valid possible neighbors based on sockets

### Loop

1. Pick grid point based on lowest possible states (random if tie)
	- If a grid point has no possible states, restart
2. Collapse cell
	- Random choice of states
3. Propogate

## Fix/add

- Number of samples from socket
- Weights
    - Id each tile
    - Collapse():
        - Equal chance of picking each id, regardless of other rotations
        - Once id is picked, pick random from remaining versions
- Restart if stuck
- Stop draw loop if it is finished
- UI?

## Keybinds

- Enter: toggle auto progress
- Space: progress 1 iteration
- Escape: stop auto progress
- D: toggle drawing valid states of non-collapsed cells
- O: toggle drawing outline boarder of valid tile spots
- E: toggle drawing outline around grid tiles