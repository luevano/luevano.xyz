title: Creating my Go Godot Jam 3 entry devlog 1
author: David Luévano
lang: en
summary: Details on the implementation for the game I created for the Go Godot Jam 3, which theme is Evolution.
tags: gamedev
	godot
	gamejam
	english

**IF YOU'RE SEEING THIS, THIS IS A WIP**

The jam's theme is Evolution and all the details are listed [here](https://itch.io/jam/go-godot-jam-3). This time I'm logging as I go, so there might be some changes to the script or scenes along the way. Note that I'm not going to go into much details, the obvious will be ommitted.

I wanted to do a *Snake* clone, and I'm using this jam as an excuse to do it and add something to it. The features include:

- Snakes will pass their stats in some form to the next snakes.
- Non-grid snake movement. I just hate the grid constraint, so I wanted to make it move in any direction.
- Depending on the food you eat, you'll gain new mutations and the more you eat the more that mutation develops.
- Procedural map creation.

## Initial setup

Again, similar to the [FlappyBird](https://blog.luevano.xyz/g/flappybird_godot_devlog_1.html) clone I developed, I'm using the structure I wrote about on [Godot project structure](https://blog.luevano.xyz/g/godot_project_structure.html) with slight modifications to test things out. Also using similar *Project settings* as those from the *FlappyBird* clone like the pixel art texture imports, keybindings, layers, etc..

I've also setup [GifMaker](https://github.com/bram-dingelstad/godot-gifmaker), with slight modifications as the *AssetLib* doesn't install it correctly and contains unnecessry stuff: moved necessary files to the `res://addons` directory, deleted test scenes and files in general, and copied the license to the `res://docs` directory. Setting this up was a bit annoying because the tutorial it's bad (with all due respect). I might do a separate entry just to explain how to set it up, because I couldn't find it anywhere other than by inspecting some of the code/scenes.

This time I'm also going to be using an [Event bus](https://www.gdquest.com/docs/guidelines/best-practices/godot-gdscript/event-bus/) singleton (which I'm going to just call *Event*) as managing signals was pretty annoying on my last project; as well as a *Global* singleton for essential stuff so I don't have to do as many cross references between nodes/scenes.

## Assets

This time I'll be creating my own assets in [Aseprite](https://www.aseprite.org/), wont be that good, but enough to prototype and get things going.

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

Added `signal new_curve_point(coordinates)` to the *Event* singleton and then add the following to `head.gd`:

```gdscript
var _time_elapsed: float = 0.0

# using a timer is not recommended for < 0.01
func _handle_time_elapsed(delta: float) -> void:
	if _time_elapsed >= Global.SNAKE_POSITION_UPDATE_INTERVAL:
		Event.emit_signal("new_curve_point", global_position)
		_time_elapsed = 0.0
	_time_elapsed += delta
```

This will be pinging the current snake head position every `0.01` seconds (defined in *Global*). Now create a new scene called `Snake.tscn` which will contain a *Node2D*, a *Path2D* and an instance of *Head* as its childs. Create a new script called `snake.gd` attached to the root (*Node2D*) with the following content:

```gdscript
class_name Snake
extends Node2D

onready var path: Path2D = $Path

func _ready():
	Event.connect("new_curve_point", self, "_on_Head_new_curve_point")


func _draw() -> void:
	if path.curve.get_baked_points().size() >= 2:
		draw_polyline(path.curve.get_baked_points(), Color.aquamarine, 1, true)


func add_point_to_curve(coordinates: Vector2) -> void:
	path.curve.add_point(coordinates)
	# update call is to draw curve as there are new points to the path's curve
	update()


func _on_Head_new_curve_point(coordinates: Vector2) -> void:
	add_point_to_curve(coordinates)
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

### Creating body parts on the fly

Now it's just a matter of handling when to add new body parts in the `snake.gd` script. For now I've only setup the initial lenght of the snake. The extra code needed is the following:

```gdscript
export(PackedScene) var BODY_SEGMENT_NP: PackedScene
export(PackedScene) var TAIL_SEGMENT_NP: PackedScene

var current_body_segments: int = 0
var max_body_segments: int = 1
var body_segment_size: float = 16.0


func add_point_to_curve(coordinates: Vector2) -> void:
	path.curve.add_point(coordinates)
	# update call is to draw curve as there are new points to the path's curve
	update()

	# add the following lines
	if current_body_segments < max_body_segments:
		add_snake_segment(BODY_SEGMENT_NP)
	elif current_body_segments == max_body_segments:
		add_snake_segment(TAIL_SEGMENT_NP)


func add_snake_segment(type: PackedScene) -> void:
	if path.curve.get_baked_length() >= (current_body_segments + 1.0) * body_segment_size:
		var _temp_body_segment: PathFollow2D = type.instance()
		path.add_child(_temp_body_segment)
		current_body_segments += 1
```

Select the *Snake* node and add the *Body* and *Tail* scene to the parameters, respectively. Then when running you should see something like this:

![Snake - Basic movement with all body parts](images/g/gogodot_jam3/snake_basic_movement_added_body_parts.gif "Snake - Basic movement with all body parts")

## Brainstorm/To-do

- Snake clone with evolution.
	- Evolution on the snake itself?
		- Evolve after eating X amount?
		- Evolve after eating X type of food?
			- Similar to Contra, where you can switch the food (not sure if this counts as evolution)
	- Evolution on the world?
		- Start with a small procedural generated map, then expand it?
	- When snake dies, it passes the genes it collected by eating some food to the next snakes?
		- Or similar to the Rogue Legacy system?

- Snake clone
	- Each snake has several attributes
		- Health
		- Time to live (before getting food?)
	- Special food will unlock new attributes for subsequent snakes
		- Jumping ability (need to level it up by eating more of the same food or by using it)
		- Crawl up walls?

## Resources

- [Nuclear Throne Like Map Generation In Godot](https://www.youtube.com/watch?v=ppP2Doq3p7s)