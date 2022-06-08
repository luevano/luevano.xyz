title: Creating my Go Godot Jam 3 entry devlog 1
author: David Luévano
lang: en
summary: Details on the implementation for the game I created for the Go Godot Jam 3, which theme is Evolution.
tags: gamedev
	godot
	gamejam
	english

**IF YOU'RE SEEING THIS, THIS IS A WIP**

The jam's theme is Evolution and all the details are listed [here](https://itch.io/jam/go-godot-jam-3). ~~This time I'm logging as I go, so there might be some changes to the script or scenes along the way~~ ^^I couldn't actually do this, as I was running out of time.^^. Note that I'm not going to go into much details, the obvious will be ommitted.

I wanted to do a *Snake* clone, and I'm using this jam as an excuse to do it and add something to it. The features include:

- Snakes will pass their stats in some form to the next snakes.
- Non-grid snake movement. I just hate the grid constraint, so I wanted to make it move in any direction.
- Depending on the food you eat, you'll gain new mutations/abilities ~~and the more you eat the more that mutation develops.~~ ^^didn't have time to add this feature, sad.^^
- Procedural map creation.

## Initial setup

Again, similar to the [FlappyBird](https://blog.luevano.xyz/g/flappybird_godot_devlog_1.html) clone I developed, I'm using the directory structure I wrote about on [Godot project structure](https://blog.luevano.xyz/g/godot_project_structure.html) with slight modifications to test things out. Also using similar *Project settings* as those from the *FlappyBird* clone like the pixel art texture imports, keybindings, layers, etc..

I've also setup [GifMaker](https://github.com/bram-dingelstad/godot-gifmaker), with slight modifications as the *AssetLib* doesn't install it correctly and contains unnecessry stuff: moved necessary files to the `res://addons` directory, deleted test scenes and files in general, and copied the license to the `res://docs` directory. Setting this up was a bit annoying because the tutorial it's bad (with all due respect). I might do a separate entry just to explain how to set it up, because I couldn't find it anywhere other than by inspecting some of the code/scenes.^^I ended up not leaving this enabled in the game as it lagged the game out, but it's an option I'll end up researching more.^^

This time I'm also going to be using an [Event bus](https://www.gdquest.com/docs/guidelines/best-practices/godot-gdscript/event-bus/) singleton (which I'm going to just call *Event*) as managing signals was pretty annoying on my last project; as well as a *Global* singleton for essential stuff so I don't have to do as many cross references between nodes/scenes.

## Assets

This time I'll be creating my own assets in [Aseprite](https://www.aseprite.org/), wont be that good, but enough to prototype and get things going.

Other than that I used few key sprites from [vryell](https://vryell.itch.io/): [Controller & Keyboard Icons](https://vryell.itch.io/controller-keyboard-icons) and a font from [datagoblin](https://datagoblin.itch.io/): [Monogram](https://datagoblin.itch.io/monogram).

## The snake

This is the most challenging part in my opinion as making all the body parts follow the head in a user defined path it's kinda hard. I tried with like 4-5 options and the one I'm detailing here is the only one that worked as I wanted for me. This time the directory structure I'm using is the following:

![FileSystem - Snake dir structure](images/g/gogodot_jam3/file_system_snake_dir_structure.png "FileSystem - Snake dir structure")

### Basic movement

The most basic thing is to move the head, this is what we have control of. Create a scene called `Head.tscn` and setup the basic *KinematicBody2D* with it's own *Sprite* and *CollisionShape2D* (I used a small circle for the tip of the head), and set the *Collision Layer/Mask* accordingly, for now just `layer = bit 1`. And all we need to do, is keep moving the snake forwards and be able to rotate left or right. Created a new script called `head.gd` attached to the root (*KinematicBody2D*) and added:

```gdscript
extends KinematicBody2D

enum {
	LEFT=-1,
	RIGHT=1
}

var velocity: Vector2 = Vector2.ZERO
var _direction: Vector2 = Vector2.UP


func _physics_process(delta: float) -> void:
	if Input.is_action_pressed("move_left"):
		_rotate_to(LEFT)
	if Input.is_action_pressed("move_right"):
		_rotate_to(RIGHT)

	velocity = _direction * Global.SNAKE_SPEED

	velocity = move_and_slide(velocity)
	_handle_time_elapsed(delta)


func _rotate_to(direction: int) -> void:
	rotate(deg2rad(direction * Global.SNAKE_ROT_SPEED * get_physics_process_delta_time()))
	_direction = _direction.rotated(deg2rad(direction * Global.SNAKE_ROT_SPEED * get_physics_process_delta_time()))
```

After tunning all the necessary parameters you should get something like this:

![Snake - Basic movement (left and right controls)](images/g/gogodot_jam3/snake_basic_movement.gif "Snake - Basic movement (left and right controls)")

### Setting up path following

To move other snake parts by following the snake head the only solution I found was to use the *Path2D* and *PathFollow2D* nodes. *Path2D* basically just handles the curve/path that *PathFollow2D* will use to move its child node; and I say "child node" in singular... as *PathFollow2D* can only handle one damn child, all the other ones will have weird transformations and/or rotations. So, the next thing to do is to setup a way to compute (and draw so we can validate) the snake's path/curve.

Added the signal `snake_path_new_point(coordinates)` to the *Event* singleton and then add the following to `head.gd`:

```gdscript
var _time_elapsed: float = 0.0

# using a timer is not recommended for < 0.01
func _handle_time_elapsed(delta: float) -> void:
	if _time_elapsed >= Global.SNAKE_POSITION_UPDATE_INTERVAL:
		Event.emit_signal("snake_path_new_point", global_position)
		_time_elapsed = 0.0
	_time_elapsed += delta
```

This will be pinging the current snake head position every `0.01` seconds (defined in *Global*). Now create a new scene called `Snake.tscn` which will contain a *Node2D*, a *Path2D* and an instance of *Head* as its childs. Create a new script called `snake.gd` attached to the root (*Node2D*) with the following content:

```gdscript
class_name Snake
extends Node2D

onready var path: Path2D = $Path

func _ready():
	Event.connect("snake_path_new_point", self, "_on_Head_snake_path_new_point")


func _draw() -> void:
	if path.curve.get_baked_points().size() >= 2:
		draw_polyline(path.curve.get_baked_points(), Color.aquamarine, 1, true)


func _on_Head_snake_path_new_point(coordinates: Vector2) -> void:
	path.curve.add_point(coordinates)
	# update call is to draw curve as there are new points to the path's curve
	update()
```

With this, we're now populating the *Path2D* curve points with the position of the snake head. You should be able to see it because of the `_draw` call. If you run it you should see something like this:

![Snake - Basic movement with path](images/g/gogodot_jam3/snake_basic_movement_with_path.gif "Snake - Basic movement with path")

### Define body parts for the snake

At this point the only thing to do is to add the corresponding next body parts and tail of the snake. To do so, we need a *PathFollow2D* to use the live-generating *Path2D*, the only caveat is that we need one of these per body part/tail (this took me hours to figure out, *thanks documentation*).

Create a new scene called `Body.tscn` with a *PathFollow2D* as its root and an *Area2D* as its child, then just add the necessary *Sprite* and *CollisionShap2D* for the *Area2D*, I'm using `layer = bit 2` for its collision. Create a new script called `generic_segment.gd` with the following code:

```gdscript
extends PathFollow2D

export(String, "body", "tail") var TYPE: String = "body"


func _physics_process(delta: float) -> void:
	offset += Global.SNAKE_SPEED * delta
```

And this can be attached to the *Body*'s root node (*PathFollow2D*), no extra setup needed. Repeat the same steps for creating the `Tail.tscn` scene and when attaching the `generic_segment.gd` script just configure the `Type` parameter to `tail` in the GUI (by selecting the node with the script attached and editing in the *Inspector*).

### Adding body parts

Now it's just a matter of handling when to add new body parts in the `snake.gd` script. For now I've only setup for adding body parts to fulfill the initial length of the snake (this doesn't include the head or tail). The extra code needed is the following:

```gdscript
export(PackedScene) var BODY_SEGMENT_NP: PackedScene
export(PackedScene) var TAIL_SEGMENT_NP: PackedScene

var current_body_segments: int = 0
var max_body_segments: int = 1


func _add_initial_segment(type: PackedScene) -> void:
	if path.curve.get_baked_length() >= (current_body_segments + 1.0) * Global.SNAKE_SEGMENT_SIZE:
		var _temp_body_segment: PathFollow2D = type.instance()
		path.add_child(_temp_body_segment)
		current_body_segments += 1


func _on_Head_snake_path_new_point(coordinates: Vector2) -> void:
	path.curve.add_point(coordinates)
	# update call is to draw curve as there are new points to the path's curve
	update()

	# add the following lines
	if current_body_segments < max_body_segments:
		_add_initial_segment(BODY_SEGMENT_NP)
	elif current_body_segments == max_body_segments:
		_add_initial_segment(TAIL_SEGMENT_NP)
```

Select the *Snake* node and add the *Body* and *Tail* scene to the parameters, respectively. Then when running you should see something like this:

![Snake - Basic movement with all body parts](images/g/gogodot_jam3/snake_basic_movement_added_body_parts.gif "Snake - Basic movement with all body parts")

Now, we need to handle adding body parts after the snake is complete and already moved for a bit, this will require a queue so we can add part by part in the case that we eat multiple pieces of food in a short period of time. For this we need to add some signals: `snake_adding_new_segment(type)`, `snake_added_new_segment(type)`, `snake_added_initial_segments` and use them when makes sense. Now we need to add the following:

```gdscript
var body_segment_stack: Array
var tail_segment: PathFollow2D
# didn't konw how to name this, basically holds the current path lenght
# 	whenever the add body segment, and we use this stack to add body parts
var body_segment_queue: Array
```

As well as updating `_add_initial_segment` with the following so it adds the new segment on the specific variable:

```gdscript
if _temp_body_segment.TYPE == "body":
	body_segment_stack.append(_temp_body_segment)
else:
	tail_segment = _temp_body_segment
```

Now that it's just a matter of creating the segment queue whenever a new segment is needed, as well as adding each segment in a loop whenever we have items in the queue and it's a good distance to place the segment on. These two things can be achieved with the following code:

```gdscript
# this will be called in _physics_process
func _add_new_segment() -> void:
	var _path_length_threshold: float = body_segment_queue[0] + Global.SNAKE_SEGMENT_SIZE
	if path.curve.get_baked_length() >= _path_length_threshold:
		var _removed_from_queue: float = body_segment_queue.pop_front()
		var _temp_body_segment: PathFollow2D = BODY_SEGMENT_NP.instance()
		var _new_body_offset: float = body_segment_stack.back().offset - Global.SNAKE_SEGMENT_SIZE

		_temp_body_segment.offset = _new_body_offset
		body_segment_stack.append(_temp_body_segment)
		path.add_child(_temp_body_segment)
		tail_segment.offset = body_segment_stack.back().offset - Global.SNAKE_SEGMENT_SIZE

		current_body_segments += 1


func _add_segment_to_queue() -> void:
	# need to have the queues in a fixed separation, else if the eating functionality
	#	gets spammed, all next bodyparts will be spawned almost at the same spot
	if body_segment_queue.size() == 0:
		body_segment_queue.append(path.curve.get_baked_length())
	else:
		body_segment_queue.append(body_segment_queue.back() + Global.SNAKE_SEGMENT_SIZE)
```

With everything implemented and connected accordingly then we can add segments on demand (for testing I'm adding with a keystroke), it should look like this:

![Snake - Basic movement with dynamic addition of new segments](images/g/gogodot_jam3/snake_basic_movement_with_dynamic_segments.gif "Snake - Basic movement with dynamic addition of new segments")

For now, this should be enough, I'll add more stuff as needed as I go. Last thing is that after finished testing that the movement felt ok, I just added a way to stop the snake whenever it collides with itself by using the following code (and the signal `snake_segment_body_entered(body)`) in a `main.gd` script that is the entry point for the game:

```gdscript
func _snake_disabled(on_off: bool) -> void:
	_snake.propagate_call("set_process", [on_off])
	_snake.propagate_call("set_process_internal", [on_off])
	_snake.propagate_call("set_physics_process", [on_off])
	_snake.propagate_call("set_physics_process_internal", [on_off])
	_snake.propagate_call("set_process_input", [on_off])
```

Which will stop the snake node and all children.

### Fix on body segments following head

After a while of testing and developing, I noticed that sometimes the head "detaches" from the body when a lot of rotations happen (moving the snake left or right), because of how imprecise the *Curve2D* is. To do this I just send a signal (`snake_rotated`) whenever the snake rotates and make a small correction (in `generic_segment.gd`):

```gdscript
func _on_snake_rotated() -> void:
	offset -= 0.75 * Global.SNAKE_SPEED * pow(get_physics_process_delta_time(), 2)
```

This is completely random, I tweaked it manually after a lot of iterations.

## The food

For now I just decided to setup a simple system to see everything works fine. The idea is to make some kind of generic food node/scene and a "food manager" to spawn them, for now in totally random locations. For this I added the following signals: `food_placing_new_food(type)`, `food_placed_new_food(type)` and `food_eaten(type)`.

First thing is creating the `Food.tscn` which is just an *Area2D* with its necessary children with an attached script called `food.gd`. The script is really simple:

```gdscript
class_name Food # needed to access Type enum outside of the script, this registers this script as a node
extends Area2D

enum Type {
	APPLE
}

var _type_texture: Dictionary = {
	Type.APPLE: preload("res://entities/food/sprites/apple.png")
}

export(Type) var TYPE
onready var _sprite: Sprite = $Sprite


func _ready():
	connect("body_entered", self, "_on_body_entered")
	_sprite.texture = _type_texture[TYPE]


func _on_body_entered(body: Node) -> void:
	Event.emit_signal("food_eaten", TYPE)
	queue_free()
```

Then this `food_eaten` signal is received in `snake.gd` to add a new segment to the queue.

Finally, for the food manager I just created a `FoodManager.tscn` with a *Node2D* with an attached script called `food_manager.gd`. To get a random position:

```gdscript
func _get_random_pos() -> Vector2:
	var screen_size: Vector2 = get_viewport().get_visible_rect().size
	var temp_x: float = randf() * screen_size.x - screen_size.x / 2.0
	var temp_y: float = randf() * screen_size.y - screen_size.y / 2.0

	return Vector2(temp_x, temp_y)
```

Which gets the job done, but later I'll have to add a way to check that the position is valid. And to actually place the food:

```gdscript
func _place_new_food() -> void:
	var food: Area2D = FOOD.instance()
	var position: Vector2 = _get_random_pos()
	food.global_position = position
	add_child(food)
```

And this is used in `_process` to place new food whenever needed. For now I added a condition to add food until 10 pieces are in place, and keep adding whenever the food is is lower than 10. After setting everything up, this is the result:

![Snake - Food basic interaction](images/g/gogodot_jam3/snake_food_basic_interaction.gif "Snake - Food basic interaction")

## Za warudo! (The world)

It just happend that I saw a video to create random maps by using a method called [random walks](https://www.mit.edu/~kardar/teaching/projects/chemotaxis(AndreaSchmidt)/random.htm), this video was made by [NAD LABS](https://www.youtube.com/c/NADLABS): [Nuclear Throne Like Map Generation In Godot](https://www.youtube.com/watch?v=ppP2Doq3p7s). It's a pretty simple but powerful script, he provided the source code from which I based my random walker, just tweaked a few things and added others. Some of the maps than can be generated with this method (already aded some random sprites):

![World map generator - Random map 1](images/g/gogodot_jam3/world_generator_1.png "World map generator - Random map 1")

![World map generator - Random map 2](images/g/gogodot_jam3/world_generator_2.png "World map generator - Random map 2")

![World map generator - Random map 3](images/g/gogodot_jam3/world_generator_3.png "World map generator - Random map 3")

It started with just black and white tiles, but I ended up adding some sprites as it was really harsh to the eyes. My implementation is basically the same as *NAD LABS*' with few changes, most importantly: I separated the generation in 2 diferent tilemaps (floor and wall) to have better control as well as wrapped everything in a single scene with a "main" script with the following important functions:

```gdscript
func get_valid_map_coords() -> Array:
	var safe_area: Array = walker_head.get_cells_around()
	var cells_used: Array = ground_tilemap.get_used_cells()
	for location in safe_area:
		cells_used.erase(location)
	return cells_used


func get_centered_world_position(location: Vector2) -> Vector2:
	return ground_tilemap.map_to_world(location) + Vector2.ONE * Global.TILE_SIZE / 2.0
```

Where `get_cells_around` is just a function that gets the safe cells around the origin. And this `get_valid_map_coords` just returns used cells minus the safe cells, to place food. `get_centered_world_position` is so we can center the food in the tiles.

Some signals I used for the world gen: `world_gen_walker_started(id)`, `world_gen_walker_finished(id)`, `world_gen_walker_died(id)` and `world_gen_spawn_walker_unit(location)`.

### Food placement

The last food algorithm doesn't check anything related to the world, and thus the food could spawn in the walls and outside the map.

First thing is I generalized the food into a single script and added basic food and special food which inherit from base food. The most important stuff for the base food is to be able to set all necessary properties at first:

```gdscript
func update_texture() -> void:
	_sprite.texture = texture[properties["type"]]


func set_properties(pos: Vector2, loc: Vector2, special: bool, type: int, points: int=1, special_points: int=1, ttl: float = -1.0) -> void:
	properties["global_position"] = pos
	global_position = pos
	properties["location"] = loc
	properties["special"] = special
	properties["type"] = type

	properties["points"] = points
	properties["special_points"] = special_points
	properties["ttl"] = ttl
	if properties["ttl"] != -1.0:
		timer.wait_time = properties["ttl"]
		timer.start()
```

Where the `update_texture` needs to be a separate function, because we need to create the food first, set properties, add as a child and then update the sprite; we also need to keep track of the global position, location (in tilemap coordinates) and identifiers for the type of food.

Then basic/special food just extend base food, define a `Type` enum and preloads the necessary textures, for example:

```gdscript
enum Type {
	APPLE,
	BANANA,
	RAT
}


func _ready():
	texture[Type.APPLE] = preload("res://entities/food/sprites/apple.png")
	texture[Type.BANANA] = preload("res://entities/food/sprites/banana.png")
	texture[Type.RAT] = preload("res://entities/food/sprites/rat.png")
```

Now, some of the most important change to `food_manager.gd` is to get an actual random valid position:

```gdscript
func _get_random_pos() -> Array:
	var found_valid_loc: bool = false
	var index: int
	var location: Vector2

	while not found_valid_loc:
		index = randi() % possible_food_locations.size()
		location = possible_food_locations[index]
		if current_basic_food.find(location) == -1 and current_special_food.find(location) == -1:
			found_valid_loc = true

	return [world_generator.get_centered_world_position(location), location]
```

Other than that, there are some differences between placing normal and special food (specially the signal they send, and if an extra "special points" property is set). Some of the signals that I used that might be important: `food_placing_new_food(type)`, `food_placed_new_food(type, location)` and `food_eaten(type, location)`.

## TODO

Add notes on:

- Score manager stuff.
- Saved data and `Stats` class.
- State machine for player regarding abilities.

## Other minor stuff

Not as important but worth mentioning:

- Added restartability function.
- Added signals for game control: `game_over` and `game_start`, but ended not using them.
- Fixed issue where the *Curve2D* stayed the same even when restarting by just setting an empty curve on starting the node.
- Added a debug mode for drawing of the *Curve2D* instead of always drawing.
- Tweaked the tracking of the snake size.
- Tweaked the food system to contain more attributes and use a base food node.
- Added a HUD with mini snake sprites.
- Added a HUD for growth progress on snake body segments and abilities.
- Refactored the nodes to make it work with `change_scene_to`, and added a main menu.
- Added GUI for dead screen, showing the progress.
