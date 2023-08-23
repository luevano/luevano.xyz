title: Migrating the FlappyBird clone to Godot 4 devlog 2
author: David Luévano
lang: en
summary: I'm migrating back my FlappyBird clone back to Godot 4 and probably tweaking a few things.
tags: gamedev
	godot
	gdscript
	english

As stated in the [FlappyBird devlog 1](https://blog.luevano.xyz/g/flappybird_godot_devlog_1.html) I originally started the clone in *Godot 4*, then backported back to *Godot 3* because of HTML5 support, and now I'm porting it back again to *Godot 4* as there is support again and I want to start getting familiar with it for future projects.

The source code can be found at [luevano/flappybird_godot](https://github.com/luevano/flappybird_godot) (same as with the original, but on main branch). I'll try to fix the audio, add better controls and polish it a bit more code-wise. It should be playable at [itch.io](https://lorentzeus.itch.io/flappybirdgodot) in the browser:

<p style="text-align:center"><iframe src="https://itch.io/embed/1551015?dark=true" width="208" height="167" frameborder="0"><a href="https://lorentzeus.itch.io/flappybirdgodot">FlappyBirdGodot by Lorentzeus</a></iframe></p>

# Table of contents

[TOC]

# Initial porting

I used the automatic 3.x to 4 porting option when loading a project in Godot as a starting point.

Add follow ignores for GDScript:

1. Unused parameter.
2. Unused private parameter.

Couldn't add logging plugin [KOBUGE-Games/godot-logger](https://github.com/KOBUGE-Games/godot-logger), changing from `INFO` to `DEBUG` its a pain if trying to do from singleton. Tried teh following after adding:

1. Change from `Logger` to `Log` in the autoload configuration.
2. Add config and always load it with `Log.<load/save>_config("res://logger.cfg")`.

Initially modify all conflicting code:

1. Change from `File` class to `ConfigFile` and refactor. Also add logging to `SavedData`.
2. Comment out the `velocity` property of `Player` which is already included in `CharacterBody2D`
3. Disable all `WorldTiles` related code in `game.gd` as well as the `world_detector` (probably because of the signal?).
4. Comment out the game label as `String(int)` doesn't work anymore.
5. In general resolve conflicting code issues that the automatic tool didn't catch.


# General settings

1. For pixel art the [default import settings](https://blog.luevano.xyz/g/flappybird_godot_devlog_1.html#default-import-settings) no longer affect much, but it's worth to double check as they changed from `Texture` importer to a `Texture2D` and the imported textures could be messed up. The important parameter to change is the *Filter* for the textures in the *Inspector* of each node but since all nodes inherit parameters by default, changing on the parent nodes (or just once in the root such as `Main.tscn`) will suffice: Change *Inspector -> CanvasItem -> Texture -> Filter* from "inherit" to "Nearest".

# Player

Now that the game at least runs, next thing is to make it "playable". I did the following changes:

1. Re-set the InputMap. By default the InputMap was resetted, probably the system changed from *Godot 3* to *Godot 4*.
2. *AnimatedSprite* changed to *AnimatedSprite2D* with the inclusion of *AnimatedSprite3D*. This node type changed with the automatic conversion.
	- Instead of checking if an animation is playing with the the `playing` property, the method `is_playing()` is used.
3. The `default_gravity` from the `ProjectSettings` no longer needs to be multiplied by `10` to have reasonable numbers. The default is now `980` instead of `98`.

# World

This is the most challenging part as the `TileMap` system changed drastically, it is basically a from the ground up redesign. Luckily the `TileMap`s used in this small game are really simple. From the scene perspective I did the following:

1. Only one scene with one node: `TileMap`, called `WorldTileMap.tscn`.
2. For the `WorldTileMap` add only one `TileSet`: select the node and go to *Inspector -> TileMap -> TileSet* then click on "<empty>" and then "New TileSet" button. To manipulate `TileSet`s it needs to be selected, either by clicking in the *Inspector* section or on the bottom screen (by default) to the left of *TileMap*, as shown in the image below.

![TileMap's TileSet selection highlighted in red, "Add" button in green.](${SURL}/images/g/flappybird_godot4/godot4_tileset_selected_add_atlas.png.png "TileMap's TileSet selection highlighted in red, "Add" button in green".)

3. Add two *Atlas* to the `TileSet`: with the `TileSet` selected click on the "Add" button (as shown in the image above) and then on "Atlas" a couple of times to add 2 atlas (one for the ground tiles and another for the pipes).
4. By selecting an atlas and having the "Setup" selected, change the *Name* to something recognizable like `ground` and add the texture atlas by dragging and dropping in the "<empty>" *Texture* field, as shown in the image below. I also like to have the *ID* starting from `0` and incrementing naturally.

![TileSet Atlas setup selection highlighted in red, atlas name and id in green.](${SURL}/images/g/flappybird_godot4/godot4_atlas_setup_selection.png "TileSet Atlas setup selection highlighted in red, atlas name and id in green.")

5. I also like to delete unnecessary tiles (for now) by selecting the atlas "Setup" and the "Eraser" tool, as shown in the image. Then to erase tiles just select them and they'll be highlighted in black, once deleted they will be grayed out. If you want to activate tiles again just deselect the "Eraser" tool and select wanted tiles.

![Atlas setup erase tiles. "Setup" selection and "Eraser" tool highlighted in red and green, respectively.](${SURL}/images/g/flappybird_godot4/godot4_atlas_setup_selection.png "Atlas setup erase tiles. "Setup" selection and "Eraser" tool highlighted in red and green, respectively.")

6. For the pipes it is a good idea to modify the "tile width", by using a single extender tile per section (horizontal tiles of `1x2`). This can be acomplished by removing all tiles except for one, then going to the "Select" section of the atlas, selecting a tile and extending it either graphically by using the yellow circles or by using the properties, as shown in the image below.

![Atlas resize tile. "Select" selection and "Size in Atlas" highlighted in red and green, respectively.](${SURL}/images/g/flappybird_godot4/godot4_atlas_pipe_wide.png "Atlas resize tile. "Select" selection and "Size in Atlas" highlighted in red and green, respectively.")

7. Add physics (collisions) by selecting the `WorldTileMap`'s `TileSet` and clicking on "Add Element" at the *TileMap -> TileSet -> Physics Layer* twice, one layer per atlas. Then set the collision's layers and masks accordingly. In my case, based on my already set [layers](https://blog.luevano.xyz/g/flappybird_godot_devlog_1.html#layers):
	- Physics layer 0 (ground): layer to `bit 2` and mask to `bit 1`.
	- Physics layer 1 (pipe): layer to `bit 3` and mask to `bit 1`.

This will enable physics properties on the tiles when selecting them (by selecting the atlas, being in the correct "Select" section and selecting a tile) and start drawing a polygon with the tools provided. This part is hard to explain in text, but below is an image of how it looks once drawn.

![Tile add physics polygon in Physics Layer 0.](${SURL}/images/g/flappybird_godot4/godot4_tileset_selected_add_atlas.png "Tile add physics polygon on physics layer 0.")

Notice that the polygon is drawn in *Physics Layer 0*. Using the grid option to either `1` or `2` is useful when drawing the polygon, make sure the polygon closes itself or it wont be drawn.

8. For the scripting part, I basically merged all 3 scripts (`world_tiles.gd`, `pipe_tile_map.gd`, `ground_tile_map.gd`) into one (`world_tile_map.gd`) and immediatly was able to delete a lot of signal calls between those 3 scripts and redundant code.

# Event bus

Moved all the signal logic into an event bus to get rid of the coupling I had. This is accomplished by:

1. Creating a singleton (autoload) script which I called `event.gd` and `Event`.
2. All the signals are defined in `event.gd`.
3. When a signal needs to be emited, instead of emitting the signal from any particular script, emit it from the event bus with `Event.<signal_name>.emit(<optional_args>)`.
4. When connecting to a signal, instead of taking a reference to where the signal is defined, simply connect it with the event bus with `Event.<signal_name>.connect(<callable>[.bind(<optional_args>)])`

For a concrete example assume the following 2 files:

== TODO ==


# UI

Really the only UI I had before was for rendering fonts for the (high) score, and the way fonts work changed quite a bit. Before 3 resources were needed as noted in my previous entry [FlappyBird devlog 1: Fonts](https://blog.luevano.xyz/g/flappybird_godot_devlog_1.html#fonts):

1. Font file itself (`.ttf` for example).
2. `DynamicFontData`: used to point to a font file (`.ttf`) and then used as based resource.
3. `DynamicFont`: usable godot control node holding the font data and configuration such as size.

Now only 1 resource is needed: `FontFile` which is the `.ttf` file itself or a godot-created resource. There is also a `FontVariation` option, which takes a `FontFile` and looks like its used to create fallback options for fonts. The configuration (such as size) is no longer held in the font resource, but rather in the parent control node (like a `Label`).

Double clicking on the `.ttf` file and disabling antialiasing and compression is something that might be needed.

# Other

1. Change `String(int)` to `int as String`. Doing `"%s" % int` should also work.
2. Change `version` from `1.0.0` to `2.0.0`.

