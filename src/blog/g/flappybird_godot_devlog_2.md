title: Porting the FlappyBird clone to Godot 4.1 devlog 2
author: David Luévano
lang: en
summary: Notes on porting my FlappyBird clone to Godot 4.1, as well as notes on the improvements and changes made overall.
tags: gamedev
	godot
	gdscript
	english

As stated in my [FlappyBird devlog 1](https://blog.luevano.xyz/g/flappybird_godot_devlog_1.html) entry I originally started the clone in *Godot 4*, then backported back to *Godot 3* because of HTML5 support, and now I'm porting it back again to *Godot 4* as there is support again and I want to start getting familiar with it for future projects.

The source code can be found at [luevano/flappybirdgodot](https://github.com/luevano/flappybirdgodot) (`main` branch). Playable at [itch.io](https://lorentzeus.itch.io/flappybirdgodot):

<p style="text-align:center"><iframe src="https://itch.io/embed/1551015?dark=true" width="208" height="167" frameborder="0"><a href="https://lorentzeus.itch.io/flappybirdgodot">FlappyBirdGodot by Lorentzeus</a></iframe></p>

# Table of contents

[TOC]

# Porting to Godot 4

**Disclaimer:** I started the port back in *Godot 4.0* something and left the project for a while, then opened the project again in *Godot 4.1*, and it didn't ask to convert anything so probably nowadays the conversion is better. Godot's documentation is pretty useful, I looked at the [GDScript reference](https://docs.godotengine.org/en/stable/tutorials/scripting/gdscript/gdscript_basics.html) and [GDScript exports](https://docs.godotengine.org/en/stable/tutorials/scripting/gdscript/gdscript_exports.html) and that helped a lot.

## General changes

These include the first changes for fixing some of the conflicting code to at least make it run (no gameplay) as well as project settings adjustments.

- Changing the [default import settings](https://blog.luevano.xyz/g/flappybird_godot_devlog_1.html#default-import-settings) for pixel art no longer works (though it's worth to double check as they changed from `Texture` to a `Texture2D`). The important parameter to [change is the *Filter* for the textures](https://ask.godotengine.org/122518/how-to-import-pixel-art-in-godot-4).
	- Since all nodes inherit parameters by default, changing on the parent nodes (or just once in the root such as `Main.tscn`) will suffice: Go to *Inspector -> CanvasItem -> Texture* and change *Filter* from "Inherit" to "Nearest".
- Re-set the *InputMap* as the system probably changed from *Godot 3* to *Godot 4*.
- For `SavedData` singleton, change from `File` to `ConfigFile` and refactor. This is really not needed for making it run, but I changed this right away.
- Remove `velocity` property of `Player` which is already included in `CharacterBody2D`.
- Disable all `TileMap` related code as tile maps have changed drastically, they need more effort to covnert.
- Change `String(int)` to `str(int)`.

## Player

Now that the game at least runs, next thing is to make it "playable":

- `AnimatedSprite` changed to `AnimatedSprite2D` (with the inclusion of `AnimatedSprite3D`). This node type changed with the automatic conversion.
	- Instead of checking if an animation is playing with the the `playing` property, the method `is_playing()` needs to be used.
- The `default_gravity` from the `ProjectSettings` no longer needs to be multiplied by `10` to have reasonable numbers. The default is now `980` instead of `98`. I later changed this when refactoring the code and fine-tuning the feel of the movement.
- The *Collision mask* can be changed programatically with the `set_collision_mask_value` (and similar with the layer). Before, the mask/layer was specified by the `bit` which started from `0`, but now it is accessed by the `layer_number` which starts from `1`.

## World

This is the most challenging part as the `TileMap` system changed drastically, it is basically a *from the ground up redesign*, luckily the `TileMap`s I use are really simple. Since this is not intuitive from the get-go, I took some notes on the steps I took to set up the world `TileMap`.

### Scene

Instead of using one scene per `TileMap` only one `TileMap` can be used with multiple *Atlas* in the `TileSet`. Multiple physics layers can now be used per `TileSet` so you can separate the physics collisions on a per *Atlas* or *Tile* basis. The inclusion of *Tile patterns* also helps when working with multiple *Tiles* for a single cell "placement". How I did it:

1. Created one scene with one `TileMap` node, called `WorldTileMap.tscn`, with only one `TileSet` as multiple *Atlas*' can be used (this would be a single `TileSet` in *Godot 3*).
	- To add a `TileSet`, select the `WorldTileMap` and go to *Inspector -> TileMap -> TileSet* then click on "<empty>" and then "New TileSet" button.
	- To manipulate a `TileSet`, it needs to be selected, either by clicking in the *Inspector* section or on the bottom of the screen (by default) to the left of *TileMap*, as shown in the image below.

![TileMap's TileSet selection highlighted in red, "Add" button in green.](${SURL}/images/g/flappybird_godot4/godot4_tileset_selected_add_atlas.png.png "TileMap's TileSet selection highlighted in red, "Add" button in green".)

2. Add two *Atlas* to the `TileSet` (one for the ground tiles and another for the pipes) by clicking on the "Add" button (as shown in the image above) and then on "Atlas".
3. By selecting an atlas and having the "Setup" selected, change the *Name* to something recognizable like `ground` and add the texture atlas (the spritesheet) by dragging and dropping in the "<empty>" *Texture* field, as shown in the image below. Take a not of the *ID*, they start from `0` and increment for each atlas, but if they're not `0` and `1` change them.

![TileSet atlas setup selection highlighted in red, atlas name and id in green.](${SURL}/images/g/flappybird_godot4/godot4_atlas_setup_selection.png "TileSet atlas setup selection highlighted in red, atlas name and id in green.")

4. I also like to delete unnecessary tiles (for now) by selecting the atlas "Setup" and the "Eraser" tool, as shown in the image below. Then to erase tiles just select them and they'll be highlighted in black, once deleted they will be grayed out. If you want to activate tiles again just deselect the "Eraser" tool and select wanted tiles.

![Atlas setup erase tiles. "Setup" selection and "Eraser" tool highlighted in red and green, respectively.](${SURL}/images/g/flappybird_godot4/godot4_atlas_setup_selection.png "Atlas setup erase tiles. "Setup" selection and "Eraser" tool highlighted in red and green, respectively.")

5. For the pipes it is a good idea to modify the "tile width" for horizontal `1x2` tiles. This can be acomplished by removing all tiles except for one, then going to the "Select" section of the atlas, selecting a tile and extending it either graphically by using the yellow circles or by using the properties, as shown in the image below.

![Atlas resize tile. "Select" selection and "Size in Atlas" highlighted in red and green, respectively.](${SURL}/images/g/flappybird_godot4/godot4_atlas_pipe_wide.png "Atlas resize tile. "Select" selection and "Size in Atlas" highlighted in red and green, respectively.")

6. Add physics (collisions) by selecting the `WorldTileMap`'s `TileSet` and clicking on "Add Element" at the *TileMap -> TileSet -> Physics Layer* twice, one physics layer per atlas. Then set the collision's layers and masks accordingly (ground on layer 2, pipe on 3). In my case, based on my already set [layers](https://blog.luevano.xyz/g/flappybird_godot_devlog_1.html#layers).
	- This will enable physics properties on the tiles when selecting them (by selecting the atlas, being in the correct "Select" section and selecting a tile) and start drawing a polygon with the tools provided. This part is hard to explain in text, but below is an image of how it looks once the polygon is set.

![Tile add physics polygon in Physics Layer 0.](${SURL}/images/g/flappybird_godot4/godot4_tileset_selected_add_atlas.png "Tile add physics polygon on physics layer 0.")

	- Notice that the polygon is drawn in *Physics Layer 0*. Using the grid option to either `1` or `2` is useful when drawing the polygon, make sure the polygon closes itself or it wont be drawn.
8. Create a tile pattern by drawing the tiles wanted in the editor and then going to the *Patterns* tab (to the right of *Tiles*) in the *TileMap*, selecting all tiles wanted in the pattern and dragging the tiles to the *Patterns* window. Added patterns will show in this window as shown in the image below, and assigned with IDs starting from `0`.

![Tileset pattern.](${SURL}/images/g/flappybird_godot4/godot4_tileset_pattern.png "Tileset pattern.")

### Script

Basically merged all 3 scripts (`ground_tile_map.gd`, `pipe_tile_map.gd` and `world_tiles.gd`) into one (`world_tile_map.gd`) and immediatly was able to delete a lot of signal calls between those 3 scripts and redundant code.

The biggest change in the scripting side are the functions to place tiles. For *Godot 3*:

```gdscript
# place single tile in specific cell
void set_cell(x: int, y: int, tile: int, flip_x: bool = false, flip_y: bool = false, transpose: bool = false, autotile_coord: Vector2 = Vector2( 0, 0 ))
void set_cellv(position: Vector2, tile: int, flip_x: bool = false, flip_y: bool = false, transpose: bool = false, autotile_coord: Vector2 = Vector2( 0, 0 ))
```

Whereas in *Godot 4*:

```gdscript
# place single tile in specific cell
void set_cell(layer: int, coords: Vector2i, source_id: int = -1, atlas_coords: Vector2i = Vector2i(-1, -1), alternative_tile: int = 0)
# erase tile at specific cell
void erase_cell(layer: int, coords: Vector2i)
```

How to use these functions in *Godot 4* (new properties or differences/changes):

- `layer`: for my case I only use 1 layer so it is always set to `0`.
- `coords`: would be the equivalent to `position` for `set_cellv` in *Godot 3*.
- `source_id`: which atlas to use (ground: `0` or pipe `1`).
- `atlas_coords`: tile to use in the atlas. This would be the equivalent to `tile` in *Godot 3*.
- `alternative_tile`: for tiles that have alternatives such as mirrored or rotated tiles, not required in my case.

Setting `source_id=-1`, `atlas_coords=Vector21(-1,-1)` or `alternative_tile=-1` will delete the tile at `coords`, similar to just using `erase_cell`.

With the addition to *Tile patterns* (to place multiple tiles), there is a new function:

```gdscript
# place pattern
void set_pattern(layer: int, position: Vector2i, pattern: TileMapPattern)
```

Where `position` has the same meaning as `coords` in `set_cell`/`erase_cell`, not sure why it has a different name. The `pattern` can be obtained by using `get_pattern` method on the `tile_set` property of the `TileMap`. Something like:

```gdscript
var pattern: TileMapPattern = tile_set.get_pattern(index)
```

Other than that, `Vector2` needs to be changed to `Vector2i`.

# Changes and improvements

General changes and additions that have nothing to do with porting to *Godot 4*, things I wanted to add regardless of the version.

## Audio

The audio in the *Godot 3* version was added in the last minute and it was blasting by default with no option to decrease the volume or mute it. To deal with this:

1. Refactored the code into a single scene/script to have better control.
2. Added a volume control slider by following [this GDQuest guide](https://www.gdquest.com/tutorial/godot/audio/volume-slider/).
3. Added a mute button, following the same principle as with the volume control.

The basic code required for these features is the following:

```gdscript
# get audio bus index
var audio_bus_name: String = "Master"
var _bus: int = AudioServer.get_bus_index(audio_bus_name)

# change the volume
var linear_volume: float = 0.5 # 50%, needs to be between 0.0 and 1.0
var db_volume: float = linear_to_db(linear_volume)
AudioServer.set_bus_volume_db(_bus, db_volume)

# mute
AudioServer.set_bus_mute(_bus, true) # false to unmute
```

Just be careful with how the `linear_volume` is set (from a button or slider) as it has to be between `0.0` and `1.0`.

## Event bus

Moved all the signal logic into an event bus to get rid of the coupling I had. This is accomplished by:

1. Creating a singleton (autoload) script which I called `event.gd` and can be accessed with `Event`.
2. All the signals are now defined in `event.gd`.
3. When a signal needs to be emited instead of emitting the signal from any particular script, emit it from the event bus with `Event.<signal_name>.emit(<optional_args>)`.
4. When connecting to a signal instead of taking a reference to where the signal is defined, simply connect it with with `Event.<signal_name>.connect(<callable>[.bind(<optional_args>)])`
	- For signals that already send arguments to the callable, they do not need to be specified in `bind`, only extras are needed here.

## UI

Really the only UI I had before was for rendering fonts, and the way fonts work changed a bit. Before, 3 resources were needed as [noted in my previous entry](https://blog.luevano.xyz/g/flappybird_godot_devlog_1.html#fonts):

1. Font file itself (`.ttf` for example).
2. `DynamicFontData`: used to point to a font file (`.ttf`) and then used as base resource.
3. `DynamicFont`: usable in godot control nodes which holds the `DynamicFontData` and configuration such as size.

Now only 1 resource is needed: `FontFile` which is the `.ttf` file itself or a godot-created resource. There is also a `FontVariation` option, which takes a `FontFile` and looks like its used to create fallback options for fonts. The configuration (such as size) is no longer held in the font resource, but rather in the parent control node (like a `Label`). Double clicking on the `.ttf` file and disabling antialiasing and compression is something that might be needed. Optionally create a `FontLabelSettings` which will hold the `.ttf` file and used as base for `Label`s. Use "Make Unique" for different sizes. Another option is to use *Themes* and *Variations*.

I also created the respective volume button and slider UI for the added audio functionality as well as creating a base `Label` to avoid repeating configuration on each `Label` node.

## Misc

Small changes that don't affect much:

- Updated `@export` to `@export_range`. The auto conversion didn't use the correct annotation and instead used a comment.
- Refactored the `game_scale` methodolgy as it was inconsistent. Now only one size is used as base and everything else is just scaled with the `root` `Window`.
- Got rid of the FPS monitoring, was only using it for debugging purposes back then.

