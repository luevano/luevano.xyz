title: Creating a FlappyBird clone in Godot 3.5 devlog 1
author: David Luévano
lang: en
summary: Since I'm starting to get more into gamedev stuff, I'll start blogging about it just to stay consistent.
tags: gamedev
	godot
	gdscript
	english

I just have a bit of experience with *Godot* and with gamedev in general, so I started with this game as it is pretty straight forward. On a high level the main characteristics of the game are:

- Literally just one sprite going up and down.
- Constant horizontal move of the world/player.
- If you go through the gap in the pipes you score a point.
- If you touch the pipes, the ground or go past the "ceiling" you lose.

The game was originally developed with *Godot 4.0 alpha 8*, but it didn't support HTML5 (webassembly) export... so I backported to *Godot 3.5 rc1*.

^^==Note:== I've updated the game to *Godot 4* and documented it on my [FlappyBird devlog 2](https://blog.luevano.xyz/g/flappybird_godot_devlog_2.html) entry.^^

Not going to specify all the details, only the needed parts and what could be confusing, as the source code is available and can be inspected; also this assumes minimal knowledge of *Godot* in general. Usually when I mention that a set/change of something it usually it's a property and it can be found under the *Inspector* on the relevant node, unless stated otherwise; also, all scripts attached have the same name as the scenes, but in *snake_case* (scenes/nodes in *PascalCase*).

One thing to note, is that I started writing this when I finished the game, so it's hard to go part by part, and it will be hard to test individual parts when going through this as everything is depending on each other. For the next devlog, I'll do it as I go and it will include all the changes to the nodes/scripts as I was finding them, probably better idea and easier to follow.

The source code can be found at [luevano/flappybirdgodot#godot-3.5](https://github.com/luevano/flappybirdgodot/tree/godot-3.5) (`godot-3.5` branch), it also contains the exported versions for HTML5, Windows and Linux (~~be aware that the sound might be too high and I'm too lazy to make it configurable, it was the last thing I added~~ ^^on the latest version this is fixed and audio level is configurable now^^). Playable on [itch.io](https://lorentzeus.itch.io/flappybirdgodot) (*Godot 4* version):

<p style="text-align:center"><iframe src="https://itch.io/embed/1551015?dark=true" width="208" height="167" frameborder="0"><a href="https://lorentzeus.itch.io/flappybirdgodot">FlappyBirdGodot by Lorentzeus</a></iframe></p>

# Table of contents

[TOC]

# Initial setup

## Directory structure

I'm basically going with what I wrote on [Godot project structure](https://blog.luevano.xyz/g/godot_project_structure.html) recently, and probably with minor changes depending on the situation.

## Config

### Default import settings

Since this is just pixel art, the importing settings for textures needs to be adjusted so the sprites don't look blurry. Go to *Project -> Project settings... -> Import defaults* and on the drop down select `Texture`, untick everything and make sure *Compress/Mode* is set to `Lossless`.

![Project settings - Import defaults - Texture settings](${SURL}/images/g/flappybird_godot/project_settings_import_texture.png "Project settings - Import defaults - Texture settings")

### General settings

It's also a good idea to setup some config variables project-wide. To do so, go to *Project -> Project settings... -> General*, select *Application/config* and add a new property (there is a text box at the top of the project settings window) for game scale: `application/config/game_scale` for the type use `float` and then click on add; configure the new property to `3.0`; On the same window, also add `application/config/version` as a `string`, and make it `1.0.0` (or whatever number you want).

![Project settings - General - Game scale and version properties](${SURL}/images/g/flappybird_godot/project_settings_config_properties.png "Project settings - General - Game scale and version properties")

For my personal preferences, also disable some of the *GDScript* debug warnings that are annoying, this is done at *Project -> Project settings... -> General*, select *Debug/GDScript* and toggle off `Unused arguments`, `Unused signal` and `Return value discarded`, and any other that might come up too often and don't want to see.

![Project settings - General - GDScript debug warnings](${SURL}/images/g/flappybird_godot/project_settings_debug_gdscript.png "Project settings - General - GDScript debug warnings")

Finally, set the initial window size in *Project -> Project settings... -> General*, select *Display/Window* and set *Size/Width* and *Size/Height* to `600` and `800`, respectively. As well as the *Stretch/Mode* to `viewport` , and *Stretch/Aspect* to `keep`:

![Project settings - General - Initial window size](${SURL}/images/g/flappybird_godot/project_settings_window_settings.png "Project settings - General - Initial window size")

### Keybindings

I only used 3 actions (keybindings): jump, restart and toggle_debug (optional). To add custom keybindings (so that the `Input.something()` API can be used), go to *Project -> Project settings... -> Input Map* and on the text box write `jump` and click add, then it will be added to the list and it's just a matter of clicking the `+` sign to add a *Physical key*, press any key you want to be used to jump and click ok. Do the same for the rest of the actions.

![Project settings - Input Map - Adding necessary keybindings](${SURL}/images/g/flappybird_godot/project_settings_input_map.png "Project settings - Input Map - Adding necessary keybindings")

### Layers

Finally, rename the physics layers so we don't lose track of which layer is which. Go to *Project -> Layer Names -> 2d Physics* and change the first 5 layer names to (in order): `player`, `ground`, `pipe`, `ceiling` and `score`.

![Project settings - Layer Names - 2D Physics](${SURL}/images/g/flappybird_godot/project_settings_layer_names_2d_physics.png "Project settings - Layer Names - 2D Physics")

# Assets

For the assets I found out about a pack that contains just what I need: [flappy-bird-assets](https://megacrash.itch.io/flappy-bird-assets) by [MegaCrash](https://megacrash.itch.io/); I just did some minor modifications on the naming of the files. For the font I used [Silver](https://poppyworks.itch.io/silver), and for the sound the resources from [FlappyBird-N64](https://github.com/meeq/FlappyBird-N64) (which seems to be taken from [101soundboards.com](https://www.101soundboards.com/boards/10178-flappy-bird-sounds) which the orignal copyright holder is [.Gears](https://dotgears.com/) anyways).

## Importing

Create the necessary directories to hold the respective assets and it's just a matter of dragging and dropping, I used directories: `res://entities/actors/player/sprites/`, `res://fonts/`, `res://levels/world/background/sprites/`, `res://levels/world/ground/sprites/`, `res://levels/world/pipe/sprites/`, `res://sfx/`. For the player sprites, the 
*FileSystem* window looks like this (`entities/actor` directories are really not necessary):

![FileSystem - Player sprite imports](${SURL}/images/g/flappybird_godot/player_sprite_imports.png "FileSystem - Player sprite imports")

It should look similar for other directories, except maybe for the file extensions. For example, for the sfx:

![FileSystem - SFX imports](${SURL}/images/g/flappybird_godot/sfx_imports.png "FileSystem - SFX imports")

# Scenes

Now it's time to actually create the game, by creating the basic scenes that will make up the game. The hardest part and the most confusing is going to be the *TileMaps*, so that goes first.

## TileMaps

I'm using a scene called `WorldTiles` with a *Node2D* node as root called the same. With 2 different *TileMap* nodes as children named `GroundTileMap` and `PipeTileMap` (these are their own scene); yes 2 different *TileMaps* because we need 2 different physics colliders (in *Godot 4.0* you can have a single *TileMap* with different physics colliders in it). Each node has its own script. It should look something like this:

![Scene - WorldTiles (TileMaps)](${SURL}/images/g/flappybird_godot/scene_world_tiles.png "Scene - WorldTiles (TileMaps)")

I used the following directory structure:

![Scene - WorldTiles - Directory structure](${SURL}/images/g/flappybird_godot/scene_world_tiles_directory_structure.png "Scene - WorldTiles - Directory structure")

To configure the `GroundTileMap`, select the node and click on `(empty)` on the *TileMap/Tile set* property and then click on `New TileSet`, then click where the `(empty)` used to be, a new window should open on the bottom:

![TileSet - Configuration window](${SURL}/images/g/flappybird_godot/tile_set_config_window.png "TileSet - Configuration window")

Click on the plus on the bottom left and you can now select the specific tile set to use. Now click on the yellow `+ New Single Tile`, activate the grid and select any of the tiles. Should look like this:

![TileSet - New single tile](${SURL}/images/g/flappybird_godot/tile_set_new_single_tile.png "TileSet - New single tile")

We need to do this because for some reason we can't change the snap options before selecting a tile. After selecting a random tile, set up the *Snap Options/Step* (in the *Inspector*) and set it to `16x16` (or if using a different tile set, to it's tile size):

![TileSet - Tile - Step snap options](${SURL}/images/g/flappybird_godot/tile_set_tile_step_snap_options.png "TileSet - Tile - Step snap options")

Now you can select the actual single tile. Once selected click on `Collision`, use the rectangle tool and draw the rectangle corresponding to that tile's collision:

![TileSet - Tile - Selection and collision](${SURL}/images/g/flappybird_godot/tile_set_tile_selection_collision.png "TileSet - Tile - Selection and collision")

Do the same for the other 3 tiles. If you select the *TileMap* itself again, it should look like this on the right (on default layout it's on the left of the *Inspector*):

![TileSet - Available tiles](${SURL}/images/g/flappybird_godot/tile_set_available_tiles.png "TileSet - Available tiles")

The ordering is important only for the "underground tile", which is the filler ground, it should be at the end (index 3); if this is not the case, repeat the process (it's possible to rearrange them but it's hard to explain as it's pretty weird).

At this point the tilemap doesn't have any physics and the cell size is wrong. Select the `GroundTileMap`, set the *TileMap/Cell/Size* to `16x16`, the *TileMap/Collision/Layer* set to `bit 2` only (ground layer) and disable any *TileMap/Collision/Mask* bits. Should look something like this:

![TileMap - Cell size and collision configuration](${SURL}/images/g/flappybird_godot/tile_map_cell_collision_configuration.png "TileMap - Cell size and collision configuration")

Now it's just a matter of repeating the same for the pipes (`PipeTileMap`), only difference is that when selecting the tiles you need to select 2 tiles, as the pipe is 2 tiles wide, or just set the *Snap Options/Step* to `32x16`, for example, just keep the cell size to `16x16`.

### Default ground tiles

I added few default ground tiles to the scene, just for testing purposes but I left them there. These could be place programatically, but I was too lazy to change things. On the `WorldTiles` scene, while selecting the `GroundTileMap`, you can select the tiles you want to paint with, and left click in the grid to paint with the selected tile. Need to place tiles from `(-8, 7)` to `(10, 7)` as well as the tile below with the filler ground (the tile position/coordinates show at the bottom left, refer to the image below):

![Scene - WorldTiles - Default ground tiles](${SURL}/images/g/flappybird_godot/world_tiles_default_tiles.png "Scene - WorldTiles - Default ground tiles")

## Player

On a new scene called `Player` with a *KinematicBody2D* node named `Player` as the root of the scene, then for the children: *AnimatedSprite* as `Sprite`, *CollisionShape2D* as `Collision` (with a circle shape) and 3 *AudioStreamPlayers* for `JumpSound`, `DeadSound` and `HitSound`. Not sure if it's a good practice to have the audio here, since I did that at the end, pretty lazy. Then, attach a script to the `Player` node and then it should look like this:

![Scene - Player - Node setup](${SURL}/images/g/flappybird_godot/scene_player_node_setup.png "Scene - Player - Node setup")

Select the `Player` node and set the *CollisionShape2D/Collision/Layer* to `1` and the *CollisionObject2D/Collision/Mask* to `2` and `3` (ground and pipe).

For the `Sprite` node, when selecting it click on the `(empty)` for the *AnimatedSprite/Frames* property and click `New SpriteFrames`, click again where the `(empty)` used to be and ane window should open on the bottom:

![Scene - Player - SpriteFrames window](${SURL}/images/g/flappybird_godot/scene_player_spriteframes_window.png "Scene - Player - SpriteFrames window")

Right off the bat, set the `Speed` to `10 FPS` (bottom left) and rename `default` to `bird_1`. With the `bird_1` selected, click on the `Add frames from a Sprite Sheet`, which is the second button under `Animation Frames:` which looks has an icon of a small grid (next to the folder icon), a new window will popup where you need to select the respective sprite sheet to use and configure it for importing. On the `Select Frames` window, change the `Vertical` to `1`, and then select all 4 frames (*Ctrl + Scroll* wheel to zoom in):

![Scene - Player - Sprite sheet importer](${SURL}/images/g/flappybird_godot/scene_player_sprite_sheet_importer.png "Scene - Player - Sprite sheet importer")

After that, the *SpriteFrames* window should look like this:

![Scene - Player - SpriteFrames window with sprite sheet configured](${SURL}/images/g/flappybird_godot/scene_player_spriteframes_window_with_sprite_sheet.png "Scene - Player - SpriteFrames window with sprite sheet configured")

Finally, make sure the `Sprite` node has the *AnimatedSprite/Animation* is set to `bird_1` and that the `Collision` node is configured correctly for its size and position (I just have it as a radius of `7`). As well as dropping the SFX files into the corresponding *AudioStreamPlayer* (into the *AudioStreamPlayer/Stream* property).

## Other

These are really simple scenes that don't require much setup:

- `CeilingDetector`: just an *Area2D* node with a *CollisionShape2D* in the form of a rectangle (*CollisionShape2D/Shape/extents* to `(120, 10)`), stretched horizontally so it fits the whole screen. *CollisionObject2D/Collision/Layer* set to `bit 4` (ceiling) and *CollisionObject2D/Collision/Mask* set to `bit 1` (player).
- `ScoreDetector`: similar to the `CeilingDetector`, but vertical (*CollisionShape2D/Shape/extents* to `(2.5, 128)`) and *CollisionObject2D/Collision/Layer* set to `bit 1` (player).
- `WorldDetector`: *Node2D* with a script attached, and 3 *RayCast2D* as children:
	- `NewTile`: *Raycast2D/Enabled* to true (checked), *Raycast2D/Cast To* `(0, 400)`, *Raycast2D/Collision Mask* to `bit 2` (ground) and *Node2D/Transform/Position* to `(152, -200)`
	- `OldTile`: same as "NewTile", except for the *Node2D/Transform/Position*, set it to `(-152, -200)`.
	- `OldPipe`: same as "OldTile", except for the *Raycast2D/Collision Mask*, set it to `bit 3` (pipe).

## Game

This is the actual `Game` scene that holds all the playable stuff, here we will drop in all the previous scenes; the root node is a *Node2D* and also has an attached script. Also need to add 2 additional *AudioStreamPlayers* for the "start" and "score" sounds, as well as a *Sprite* for the background (*Sprite/Offset/Offset* set to `(0, 10)`) and a *Camera2D* (*Camera2D/Current* set to true (checked)). It should look something like this:

![Scene - Game - Node setup](${SURL}/images/g/flappybird_godot/scene_game_node_setup.png "Scene - Game - Node setup")

The scene viewport should look something like the following:

![Scene - Game - Viewport](${SURL}/images/g/flappybird_godot/scene_game_viewport.png "Scene - Game - Viewport")

## UI

### Fonts

We need some font `Resources` to style the *Label* fonts. Under the *FileSystem* window, right click on the fonts directory (create one if needed) and click on `New Resource...` and select *DynamicFontData*, save it in the "fonts" directory as `SilverDynamicFontData.tres` (`Silver` as it is the font I'm using) then double click the just created resource and set the *DynamicFontData/Font Path* to the actual `Silver.ttf` font (or whatever you want).

Then create a new resource and this time select *DynamicFont*, name it `SilverDynamicFont.tres`, then double click to edit and add the `SilverDynamicFontData.tres` to the *DynamicFont/Font/Font Data* property (and I personally toggled off the *DynamicFont/Font/Antialiased* property), now just set the *DynamicFont/Settings/(Size, Outline Size, Outline Color)* to `32`, `1` and `black`, respectively (or any other values you want). It should look something like this:

![Resource - DynamicFont - Default font](${SURL}/images/g/flappybird_godot/resource_dynamic_font.png "Resource - DynamicFont - Default font")

Do the same for another *DynamicFont* which will be used for the score label, named `SilverScoreDynamicFont.tres`. Only changes are *Dynamic/Settings/(Size, Outline Size)* which are set to `128` and `2`, respectively. The final files for the fonts should look something like this:

![Resource - Dynamicfont - Directory structure](${SURL}/images/g/flappybird_godot/resource_dynamic_font_directory_structure.png "Resource - Dynamicfont - Directory structure")

### Scene setup

This has a bunch of nested nodes, so I'll try to be concise here. The root node is a *CanvasLayer* named `UI` with its own script attached, and for the children:

- `MarginContainer`: *MarginContainer* with *Control/Margin/(Left, Top)* set to `10` and *Control/Margin/(Right, Bottom)* set to `-10`.
	- `InfoContainer`: *VBoxContainer* with *Control/Theme Overrides/Constants/Separation* set to `250`.
		- `ScoreContainer`: *VBoxContainer*.
			- `Score`: *Label* with *Label/Align* set to `Center`, *Control/Theme Overrides/Fonts/Font* to the `SilverScoreDynamicFont.tres`, if needed adjust the *DynamicFont* settings.
			- `HighScore`: same as `Score`, escept for the *Control/Theme Overrides/Fonts/Font* which is set to `SilverDynamicFont.tres`.
		- `StartGame`: Same as `HighScore`.
	- `DebugContainer`: *VBoxContainer*.
		- `FPS`: *Label*.
	- `VersionContainer`: *VBoxContainer* with *BoxContainer/Alignment* set to `Begin`.
		- `Version`: *Label* with *Label/Align* set to `Right`.

The scene ends up looking like this:

![Scene - UI - Node setup](${SURL}/images/g/flappybird_godot/scene_ui.png "Scene - UI - Node setup")

## Main

This is the final scene where we connect the `Game` and the `UI`. It's made of a *Node2D* with it's own script attached and an instance of `Game` and `UI` as it's children.

This is a good time to set the default scene when we run the game by going to *Project -> Project settings... -> General* and in *Application/Run* set the *Main Scene* to the `Main.tscn` scene.

# Scripting

I'm going to keep this scripting part to the most basic code blocks, as it's too much code, for a complete view you can head to the [source code](https://github.com/luevano/flappybird_godot/tree/godot-3.5).

As of now, the game itself doesn't do anything if we hit play. The first thing to do so we have something going on is to do the minimal player scripting.

## Player

The most basic code needed so the bird goes up and down is to just detect `jump` key presses and add a negative jump velocity so it goes up (`y` coordinate is reversed in godot...), we also check the velocity sign of the `y` coordinate to decide if the animation is playing or not.

```gdscript
class_name Player
extends KinematicBody2D

export(float, 1.0, 1000.0, 1.0) var JUMP_VELOCITY: float = 380.0

onready var sprite: AnimatedSprite = $Sprite

var gravity: float = 10 * ProjectSettings.get_setting("physics/2d/default_gravity")
var velocity: Vector2 = Vector2.ZERO


func _physics_process(delta: float) -> void:
	velocity.y += gravity * delta

	if Input.is_action_just_pressed("jump"):
		velocity.y = -JUMP_VELOCITY

	if velocity.y < 0.0:
		sprite.play()
	else:
		sprite.stop()

	velocity = move_and_slide(velocity)
```

You can play it now and you should be able to jump up and down, and the bird should stop on the ground (although you can keep jumping). One thing to notice is that when doing `sprite.stop()` it stays on the last frame, we can fix that using the code below (and then change `sprite.stop()` for `_stop_sprite()`):

```gdscript
func _stop_sprite() -> void:
	if sprite.playing:
		sprite.stop()
	if sprite.frame != 0:
		sprite.frame = 0
```

Where we just check that the last frame has to be the frame 0.

Now just a matter of adding other needed code for moving horizontally, add sound by getting a reference to the *AudioStreamPlayers* and doing `sound.play()` when needed, as well as handling death scenarios by adding a `signal died` at the beginning of the script and handle any type of death scenario using the below function:

```gdscript
func _emit_player_died() -> void:
	# bit 2 corresponds to pipe (starts from 0)
	set_collision_mask_bit(2, false)
	dead = true
	SPEED = 0.0
	emit_signal("died")
	# play the sounds after, because yield will take a bit of time,
	# this way the camera stops when the player "dies"
	velocity.y = -DEATH_JUMP_VELOCITY
	velocity = move_and_slide(velocity)
	hit_sound.play()
	yield(hit_sound, "finished")
	dead_sound.play()
```

Finally need to add the actual checks for when the player dies (like collision with ground or pipe) as well as a function that listens to a signal for when the player goes to the ceiling.

## WorldDetector

The code is pretty simple, we just need a way of detecting if we ran out of ground and send a signal, as well as sending as signal when we start detecting ground/pipes behind us (to remove it) because the world is being generated as we move. The most basic functions needed are:

```gdscript
func _was_colliding(detector: RayCast2D, flag: bool, signal_name: String) -> bool:
	if detector.is_colliding():
		return true
	if flag:
		emit_signal(signal_name)
		return false
	return true


func _now_colliding(detector: RayCast2D, flag: bool, signal_name: String) -> bool:
	if detector.is_colliding():
		if not flag:
			emit_signal(signal_name)
			return true
	return false
```

We need to keep track of 3 "flags": `ground_was_colliding`, `ground_now_colliding` and `pipe_now_colliding` (and their respective signals), which are going to be used to do the checks inside `_physics_process`. For example for checking for new ground: `ground_now_colliding = _now_colliding(old_ground, ground_now_colliding, "ground_started_colliding")`.

## WorldTiles

This script is what handles the `GroundTileMap` as well as the `PipeTileMap` and just basically functions as a "Signal bus" connecting a bunch of signals from the `WorldDetector` with the *TileMaps* and just tracking how many pipes have been placed:

```gdscript
export(int, 2, 20, 2) var PIPE_SEP: int = 6
var tiles_since_last_pipe: int = PIPE_SEP - 1


func _on_WorldDetector_ground_stopped_colliding() -> void:
    emit_signal("place_ground")

    tiles_since_last_pipe += 1
    if tiles_since_last_pipe == PIPE_SEP:
        emit_signal("place_pipe")
        tiles_since_last_pipe = 0


func _on_WorldDetector_ground_started_colliding() -> void:
    emit_signal("remove_ground")


func _on_WorldDetector_pipe_started_colliding() -> void:
    emit_signal("remove_pipe")
```

### GroundTileMap

This is the node that actually places the ground tiles upong receiving a signal. In general, what you want is to keep track of the newest tile that you need to place (empty spot) as well as the last tile that is in the tilemap (technically the first one if you count from left to right). I was experimenting with `enum`s so I used them to define the possible `Ground` tiles:

```gdscript
enum Ground {
	TILE_1,
	TILE_2,
	TILE_3,
	TILE_DOWN_1,
}
```

This way you can just select the tile by doing `Ground.TILE_1`, which will correspond to the `int` value of `0`. So most of the code is just:

```gdscript
# old_tile is the actual first tile, whereas the new_tile_position
#	is the the next empty tile; these also correspond to the top tile
const _ground_level: int = 7
const _initial_old_tile_x: int = -8
const _initial_new_tile_x: int = 11
var old_tile_position: Vector2 = Vector2(_initial_old_tile_x, _ground_level)
var new_tile_position: Vector2 = Vector2(_initial_new_tile_x, _ground_level)


func _place_new_ground() -> void:
	set_cellv(new_tile_position, _get_random_ground())
	set_cellv(new_tile_position + Vector2.DOWN, Ground.TILE_DOWN_1)
	new_tile_position += Vector2.RIGHT


func _remove_first_ground() -> void:
	set_cellv(old_tile_position, -1)
	set_cellv(old_tile_position + Vector2.DOWN, -1)
	old_tile_position += Vector2.RIGHT
```

Where you might notice that the `_initial_new_tile_x` is `11`, instead of `10`, refer to [Default ground tiles](#default-ground-tiles) where we placed tiles from `-8` to `10`, so the next empty one is `11`. These `_place_new_ground` and `_remove_first_ground` functions are called upon receiving the signal.

### PipeTileMap

This is really similar to the `GroundTileMap` code, instead of defining an `enum` for the ground tiles, we define it for the pipe patterns (because each pipe is composed of multiple pipe tiles). If your pipe tile set looks like this (notice the index):

![PipeTileMap - Tile set indexes](${SURL}/images/g/flappybird_godot/tile_set_pipes_indexes.png "PipeTileMap - Tile set indexes")

Then you can use the following "pipe patterns":

```gdscript
var pipe: Dictionary = {
    PipePattern.PIPE_1: [0, 1, 2, 2, 2, 2, 2, 2, 3, 4, -1, -1, -1, 0, 1, 2],
    PipePattern.PIPE_2: [0, 1, 2, 2, 2, 2, 2, 3, 4, -1, -1, -1, 0, 1, 2, 2],
    PipePattern.PIPE_3: [0, 1, 2, 2, 2, 2, 3, 4, -1, -1, -1, 0, 1, 2, 2, 2],
    PipePattern.PIPE_4: [0, 1, 2, 2, 2, 3, 4, -1, -1, -1, 0, 1, 2, 2, 2, 2],
    PipePattern.PIPE_5: [0, 1, 2, 2, 3, 4, -1, -1, -1, 0, 1, 2, 2, 2, 2, 2],
    PipePattern.PIPE_6: [0, 1, 2, 3, 4, -1, -1, -1, 0, 1, 2, 2, 2, 2, 2, 2]
}
```

Now, the pipe system requires a bit more of tracking as we need to instantiate a `ScoreDetector` here, too. I ended up keeping track of the placed pipes/detectors by using a "pipe stack" (and "detector stack") which is just an array of placed objects from which I pop the first when deleting them:

```gdscript
onready var _pipe_sep: int = get_parent().PIPE_SEP
const _pipe_size: int = 16
const _ground_level: int = 7
const _pipe_level_y: int = _ground_level - 1
const _initial_new_pipe_x: int = 11
var new_pipe_starting_position: Vector2 = Vector2(_initial_new_pipe_x, _pipe_level_y)
var pipe_stack: Array

# don't specify type for game, as it results in cyclic dependency,
# as stated here: https://godotengine.org/qa/39973/cyclic-dependency-error-between-actor-and-actor-controller
onready var game = get_parent().get_parent()
var detector_scene: PackedScene = preload("res://levels/detectors/score_detector/ScoreDetector.tscn")
var detector_offset: Vector2 = Vector2(16.0, -(_pipe_size / 2.0) * 16.0)
var detector_stack: Array
```

The `detector_offset` is just me being picky. For placing a new pipe, we get the starting position (bottom pipe tile) and build upwards, then instantiate a new `ScoreDetector` (`detector_scene`) and set it's position to the pipe starting position plus the offset, so it's centered in the pipe, then just need to connect the `body_entered` signal from the detector with the game, so we keep track of the scoring. Finally just add the placed pipe and detector to their corresponding stacks:

```gdscript
func _place_new_pipe() -> void:
    var current_pipe: Vector2 = new_pipe_starting_position
    for tile in pipe[_get_random_pipe()]:
        set_cellv(current_pipe, tile)
        current_pipe += Vector2.UP

    var detector: Area2D = detector_scene.instance()
    detector.position = map_to_world(new_pipe_starting_position) + detector_offset
    detector.connect("body_entered", game, "_on_ScoreDetector_body_entered")
    detector_stack.append(detector)
    add_child(detector)

    pipe_stack.append(new_pipe_starting_position)
    new_pipe_starting_position += _pipe_sep * Vector2.RIGHT
```

For removing pipes, it's really similar but instead of getting the position from the next tile, we pop the first element from the (pipe/detector) stack and work with that. To remove the cells we just set the index to `-1`:

```gdscript
func _remove_old_pipe() -> void:
    var current_pipe: Vector2 = pipe_stack.pop_front()
    var c: int = 0
    while c < _pipe_size:
        set_cellv(current_pipe, -1)
        current_pipe += Vector2.UP
        c += 1

    var detector: Area2D = detector_stack.pop_front()
    remove_child(detector)
    detector.queue_free()
```

These functions are called when receiving the signal to place/remove pipes.

## Saved data

Before proceeding, we require a way to save/load data (for the high scores). We're going to use the *ConfigFile* node that uses a custom version of the `ini` file format. Need to define where to save the data:

```gdscript
const DATA_PATH: String = "user://data.cfg"
const SCORE_SECTION: String = "score"
var _data: ConfigFile
```

Note that `user://` is a OS specific path in which the data can be stored on a per user basis, for more: [File paths](https://docs.godotengine.org/en/stable/tutorials/io/data_paths.html). Then, a way to load the save file:

```gdscript
func _load_data() -> void:
    # create an empty file if not present to avoid error while loading settings
    var file: File = File.new()
    if not file.file_exists(DATA_PATH):
        file.open(DATA_PATH, file.WRITE)
        file.close()

    _data = ConfigFile.new()
    var err: int = _data.load(DATA_PATH)
    if err != OK:
        print("[ERROR] Cannot load data.")
```

A way to save the data:

```gdscript
func save_data() -> void:
    var err: int = _data.save(DATA_PATH)
    if err != OK:
        print("[ERROR] Cannot save data.")
```

And of course, a way to get and set the high score:

```gdscript
func set_new_high_score(high_score: int) -> void:
    _data.set_value(SCORE_SECTION, "high_score", high_score)


func get_high_score() -> int:
    return _data.get_value(SCORE_SECTION, "high_score")
```

Then, whenever this script is loaded we load the data and if it's a new file, then add the default high score of 0:

```gdscript
func _ready() -> void:
    _load_data()

    if not _data.has_section(SCORE_SECTION):
        set_new_high_score(0)
        save_data()
```

Now, this script in particular will need to be a [Singleton (AutoLoad)](https://docs.godotengine.org/en/stable/tutorials/scripting/singletons_autoload.html), which means that there will be only one instance and will be available across all scripts. To do so, go to *Project -> Project settings... -> AutoLoad* and select this script in the `Path:` and add a `Node Name:` (I used `SavedData`, if you use something else, be careful while following this devlog) which will be the name we'll use to access the singleton. Toggle on `Enable` if needed, it should look like this:

![Project settings - AutoLoad - SavedData singleton](${SURL}/images/g/flappybird_godot/project_settings_autoload_saved_data.png "Project settings - AutoLoad - SavedData singleton")

## Game

The game script it's also like a "Signal bus" in the sense that it connects all its childs' signals together, and also has the job of starting/stopping the `_process` and `_physics_process` methods from the childs as needed. First, we need to define the signals and and references to all child nodes:

```gdscript
signal game_started
signal game_over
signal new_score(score, high_score)

onready var player: Player = $Player
onready var background: Sprite= $Background
onready var world_tiles: WorldTiles = $WorldTiles
onready var ceiling_detector: Area2D = $CeilingDetector
onready var world_detector: Node2D = $WorldDetector
onready var camera: Camera2D = $Camera
onready var start_sound: AudioStreamPlayer = $StartSound
onready var score_sound: AudioStreamPlayer = $ScoreSound
```

It's important to get the actual "player speed", as we're using a scale to make the game look bigger (remember, pixel art), to do so we need a reference to the `game_scale` we setup at the beginning and compute the `player_speed`:

```gdscript
var _game_scale: float = ProjectSettings.get_setting("application/config/game_scale")
var player_speed: float


func _ready() -> void:
	scale = Vector2(_game_scale, _game_scale)
	# so we move at the actual speed of the player
	player_speed = player.SPEED / _game_scale
```

This `player_speed` will be needed as we need to move all the nodes (`Background`, `Camera`, etc.) in the `x` axis as the player is moving. This is done in the `_physics_process`:

```gdscript
func _physics_process(delta: float) -> void:
	ceiling_detector.move_local_x(player_speed * delta)
	world_detector.move_local_x(player_speed * delta)
	background.move_local_x(player_speed * delta)
	camera.move_local_x(player_speed * delta)
```

We also need a way to start and stop the processing of all the nodes:

```gdscript
func _set_processing_to(on_off: bool, include_player: bool = true) -> void:
	set_process(on_off)
	set_physics_process(on_off)
	if include_player:
		player.set_process(on_off)
		player.set_physics_process(on_off)
	world_tiles.set_process(on_off)
	world_tiles.set_physics_process(on_off)
	ceiling_detector.set_process(on_off)
	ceiling_detector.set_physics_process(on_off)
```

Where the `player` is a special case, as when the player dies, it should still move (only down), else it would just freeze in place. In `_ready` we connect all the necessary signals as well as initially set the processing to `false` using the last function. To start/restart the game we need to keep a flag called `is_game_running` initially set to `false` and then handle the (re)startability in `_input`:

```gdscript
func _input(event: InputEvent) -> void:
	if not is_game_running and event.is_action_pressed("jump"):
		_set_processing_to(true)
		is_game_running = true
		emit_signal("game_started")
		start_sound.play()

	if event.is_action_pressed("restart"):
		get_tree().reload_current_scene()
```

Then we handle two specific signals:

```gdscript
func _on_Player_died() -> void:
	_set_processing_to(false, false)
	emit_signal("game_over")


func _on_ScoreDetector_body_entered(body: Node2D) -> void:
	score += 1
	if score > high_score:
		high_score = score
		SavedData.set_new_high_score(high_score)
		SavedData.save_data()
	emit_signal("new_score", score, high_score)
	score_sound.play()
```

When the `player` dies, we set all processing to `false`, except for the player itself (so it can drop all the way to the ground). Also, when receiving a "scoring" signal, we manage the current score, as well as saving the new high score when applicable, note that we need to read the `high_score` at the beginning by calling `SavedData.get_high_score()`. This signal we emit will be received by the `UI` so it updates accordingly.

## UI

First thing is to get a reference to all the child *Labels*, an initial reference to the high score as well as the version defined in the project settings:

```gdscript
onready var fps_label: Label = $MarginContainer/DebugContainer/FPS
onready var version_label: Label = $MarginContainer/VersionContainer/Version
onready var score_label: Label = $MarginContainer/InfoContainer/ScoreContainer/Score
onready var high_score_label: Label = $MarginContainer/InfoContainer/ScoreContainer/HighScore
onready var start_game_label: Label = $MarginContainer/InfoContainer/StartGame

onready var _initial_high_score: int = SavedData.get_high_score()

var _version: String = ProjectSettings.get_setting("application/config/version")
```

Then set the initial *Label* values as well as making the `fps_label` invisible:

```gdscript
func _ready() -> void:
	fps_label.visible = false
	version_label.set_text("v%s" % _version)
	high_score_label.set_text("High score: %s" % _initial_high_score)
```

Now we need to handle the `fps_label` update and toggle:

```gdscript
func _input(event: InputEvent) -> void:
	if event.is_action_pressed("toggle_debug"):
		fps_label.visible = !fps_label.visible


func _process(delta: float) -> void:
	if fps_label.visible:
		fps_label.set_text("FPS: %d" % Performance.get_monitor(Performance.TIME_FPS))
```

Finally the signal receiver handlers which are straight forward:

```gdscript
func _on_Game_game_started() -> void:
	start_game_label.visible = false
	high_score_label.visible = false


func _on_Game_game_over() -> void:
	start_game_label.set_text("Press R to restart")
	start_game_label.visible = true
	high_score_label.visible = true


func _on_Game_new_score(score: int, high_score: int) -> void:
	score_label.set_text(String(score))
	high_score_label.set_text("High score: %s" % high_score)
```

## Main

This is the shortest script, it just connects the signals between the `Game` and the `UI`:

```gdscript
onready var game: Game = $Game
onready var ui: UI = $UI

var _game_over: bool = false


func _ready() -> void:
	game.connect("game_started", ui, "_on_Game_game_started")
	game.connect("game_over", ui, "_on_Game_game_over")
	game.connect("new_score", ui, "_on_Game_new_score")
```

# Final notes and exporting

At this point the game should be fully playable (if any detail missing feel free to look into the source code linked at the beginning). Only thing missing is an icon for the game; I did one pretty quicly with the assets I had.

## Preparing the files

If you followed the directory structure I used, then only thing needed is to transform the icon to a native Windows `ico` format (if exporting to Windows, else ignore this part). For this you need [ImageMagick](https://imagemagick.org/index.php) or some other program that can transform `png` (or whatever file format you used for the icon) to `ico`. I used [Chocolatey][https://chocolatey.org/] to install `imagemagick`, then to convert the icon itself used: `magick convert icon.png -define icon:auto-resize=256,128,64,48,32,16 icon.ico` as detailed in *Godot*'s [Changing application icon for Windows](https://docs.godotengine.org/en/stable/tutorials/export/changing_application_icon_for_windows.html).

## Exporting

You need to download the templates for exporting as detailed in *Godot*'s [Exporting projects](https://docs.godotengine.org/en/stable/tutorials/export/exporting_projects.html). Basically you go to *Editor -> Manage Export Templates...* and download the latest one specific to your *Godot* version by clicking on `Download and Install`.

If exporting for Windows then you also need to download `rcedit` from [here](https://github.com/electron/rcedit/releases/latest). Just place it wherever you want (I put it next to the *Godot* executable).

Then go to *Project -> Export...* and the Window should be empty, add a new template by clicking on `Add...` at the top and then select the template you want. I used HTML5, Windows Desktop and Linux/X11. Really the only thing you need to set is the "Export Path" for each template, which is te location of where the executable will be written to, and in the case of the *Windows Desktop* template you could also setup stuff like `Company Name`, `Product Name`, `File/Product Version`, etc..

Once the templates are setup, select any and click on `Export Project` at the bottom, and make sure to untoggle `Export With Debug` in the window that pops up, this checkbox should be at the bottom of the new window.
