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