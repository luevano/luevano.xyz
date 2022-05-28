title: Creating a FlappyBird clone in Godot 4 devlog 1
author: David Luévano
lang: en
summary: Since I'm starting to get more into gamedev stuff, I'll start blogging about it just to keep consistent. This shows as "devlog 1" just in case I want to include more parts for extra stuff.
tags: gamedev
	godot
	english

I just have a bit of experience with Godot and with gamedev in general, so I started with this game as it is pretty straight forward. On a high level the main characteristics of the game are:

- Literally just one sprite going up and down.
- Constant horizontal move of the world/player.
- If you go through the gap in the pipes you score a point.
- If you touch the pipes, the ground or go past the "ceiling" you lose.

The game was originally developed with *Godot 4.0 alpha 8*, but it didn't support HTML5 (webassembly) export... so I backported to *Godot 3.5 rc1*. The source code can be found [here](https://github.com/luevano/flappybird_godot) and if any doubts you can check that, it also contains the exported versions for HTML5, Windows and Linux (be aware that the sound might be too high and I'm too lazy to make it configurable, it was the last thing I added).

Not going to specify all the details, only the needed parts and what could be confusing, as the source code is available and can be inspected; also this assumes minimal knowledge of *Godot* in general. Usually when I mention that a set/change of something it usually it's a property and it can be found under the *Inspector* on the relevant node, unless stated otherwise; also, all scripts attached have the same name as the scenes, but in *snake_case* (scenes/nodes in *PascalCase*).

## Initial project setup

### Directory structure

I'm basically going with what I wrote on [Godot project structure](https://blog.luevano.xyz/g/godot_project_structure.html) recently, and probably with minor changes depending on the situation.

### Config

#### Default import settings

Since this is just pixel art, the importing settings for textures needs to be adjusted so the sprites don't look blurry. Go to *Project -> Project settings... -> Import defaults* and on the drop down select `Texture`, untick everything and make sure *Compress/Mode* is set to `Lossless`.

![Project settings - Import defaults - Texture settings.](images/g/flappybird_godot/project_settings_import_texture.png)

#### General settings

It's also a good idea to setup some config variables project-wide. To do so, go to *Project -> Project settings... -> General*, select *Application/config* and add a new property (there is a text box at the top of the project settings window) for game scale: `application/config/game_scale` for the type use `float` and then click on add; configure the new property to `3.0`; On the same window, also add `application/config/version` as a `string`, and make it `1.0.0` (or whatever number you want).

![Project settings - General - Game scale and version properties.](images/g/flappybird_godot/project_settings_config_properties.png)

For my personal preferences, also disable some of the *GDScript* debug warnings that are annoying, this is done at *Project -> Project settings -> General*, select *Debug/GDScript* and toggle off "Unused arguments", "Unused signal" and "Return value discarded", and any other that might come up too often and don't want to see.

![Project settings - General - GDScript debug warnings](images/g/flappybird_godot/project_settings_debug_gdscript.png)

Finally, set the initial window size in *Project -> Project settings... -> General*, select *Display/Window* and set *Size/Width* and *Size/Height* to `600` and `800`, respectively. As well as the *Stretch/Mode* to "viewport", and *Stretch/Aspect* to "keep":

![Project settings - General - Initial window size](images/g/flappybird_godot/project_settings_window_settings.png)

#### Keybindings

I only used 3 actions (keybindings): jump, restart and toggle_debug (optional). To add custom keybindings (so that the `Input.something()` API can be used), go to *Project -> Project settings -> Input Map* and on the text box write "jump" and click add, then it will be added to the list and it's just a matter of clicking the `+` sign to add a "Physical key", press any key you want to be used to jump and click ok. Do the same for the rest of the actions.

![Project settings - Input Map - Adding necessary keybindings](images/g/flappybird_godot/project_settings_input_map.png)

#### Layers

Finally, rename the physics layers so we don't lose track of which layer is which. Go to *Project -> Layer Names -> 2d Physics* and change the first 5 layer names to (in order): "player", "ground", "pipe", "ceiling" and "score".

![Project settings - Layer Names - 2D Physics](images/g/flappybird_godot/project_settings_layer_names_2d_physics.png)

## Assets

For the assets I found out about a pack that contains just what I need: [flappy-bird-assets](https://megacrash.itch.io/flappy-bird-assets) by [MegaCrash](https://megacrash.itch.io/); I just did some minor modifications on the naming of the files. For the font I used [Silver](https://poppyworks.itch.io/silver), and for the sound the resources from [FlappyBird-N64](https://github.com/meeq/FlappyBird-N64) (which seems to be taken from [101soundboards.com](https://www.101soundboards.com/boards/10178-flappy-bird-sounds) which the orignal copyright holder is [.Gears](https://dotgears.com/) anyways).

### Importing

Create the necessary directories to hold the respective assets and it's just a matter of dragging and dropping, I used directories: `res://entities/actors/player/sprites/`, `res://fonts/`, `res://levels/world/background/sprites/`, `res://levels/world/ground/sprites/`, `res://levels/world/pipe/sprites/`, `res://sfx/`. For the player sprites, the "FileSystem" window looks like this (`entities/actor` directories are really not necessary):

![Player sprite imports](images/g/flappybird_godot/player_sprite_imports.png)

It should look similar for other directories, except maybe for the file extensions. For example, for the sfx:

![SFX imports](images/g/flappybird_godot/sfx_imports.png)

## Scenes

Now it's time to actually create the game, by creating the basic scenes that will make up the game. The hardest part and the most confusing is going to be the *TileMaps*, so that goes first.

### TileMaps

I'm using a scene called "WorldTiles" with a *Node2D* node as root called the same. With 2 different *TileMap* nodes as children named "GroundTileMap" and "PipeTileMap" (these are their own scene); yes 2 different *TileMaps* because we need 2 different physics colliders (In Godot 4.0 you can have a single *TileMap* with different physics colliders in it). Each node has its own script. It should look something like this:

![Scene - WorldTiles (TileMaps)](images/g/flappybird_godot/scene_world_tiles.png)

I used the following directory structure:

![Scene - WorldTiles - Directory structure](images/g/flappybird_godot/scene_world_tiles_directory_structure.png)

To configure the GroundTileMap, select the node and click on "(empty)" on the *TileMap/Tile set* property and then click on "New TileSet", then click where the "(empty)" used to be, a new window should open on the bottom:

![TileSet - Configuration window](images/g/flappybird_godot/tile_set_config_window.png)

Click on the plus on the bottom left and you can now select the specific tile set to use. Now click on the yellow "+ New Single Tile", activate the grid and select any of the tiles. Should look like this:

![TileSet - New single tile](images/g/flappybird_godot/tile_set_new_single_tile.png)

We need to do this because for some reason we can't change the snap options before selecting a tile. After selecting a random tile, set up the *Snap Options/Step* (in the *Inspector*) and set it to 16x16 (or if using a different tile set, to it's tile size):

![TileSet - Tile - Step snap options](images/g/flappybird_godot/tile_set_tile_step_snap_options.png)

Now you can select the actual single tile. Once selected click on "Collision", use the rectangle tool and draw the rectangle corresponding to that tile's collision:

![TileSet - Tile - Selection and collision](images/g/flappybird_godot/tile_set_tile_selection_collision.png)

Do the same for the other 3 tiles. If you select the *TileMap* itself again, it should look like this on the right (on default layout it's on the left of the *Inspector*):

![TileSet - Available tiles](images/g/flappybird_godot/tile_set_available_tiles.png)

The ordering is important only for the "underground tile", which is the filler ground, it should be at the end (index 3); if this is not the case, repeat the process (it's possible to rearrange them but it's hard to explain as it's pretty weird).

At this point the tilemap doesn't have any physics and the cell size is wrong. Select the "GroundTileMap", set the *TileMap/Cell/Size* to 16x16, the *TileMap/Collision/Layer* set to `bit 2` only (ground layer) and disable any *TileMap/Collision/Mask* bits. Should look something like this:

![TileMap - Cell size and collision configuration](images/g/flappybird_godot/tile_map_cell_collision_configuration.png)

Now it's just a matter of repeating the same for the pipes ("PipeTileMap"), only difference is that when selecting the tiles you need to select 2 tiles, as the pipe is 2 tiles wide, or just set the *Snap Options/Step* to 32x16, for example, just keep the cell size to 16x16.

#### Default ground tiles

I added few default ground tiles to the scene, just for testing purposes but I left them there. These could be place programatically, but I was too lazy to change things. On the "WorldTiles" scene, while selecting the "GroundTileMap", you can select the tiles you want to paint with, and left click in the grid to paint with the selected tile. Need to place tiles from `(-8, 7)` to `(10, 7)` as well as the tile below with the filler ground (the tile position/coordinates show at the bottom left, refer to the image below):

![Scene - WorldTiles - Default ground tiles](images/g/flappybird_godot/world_tiles_default_tiles.png)

### Player

On a new scene called "Player" with a *KinematicBody2D* node named "Player" as the root of the scene, then for the children: *AnimatedSprite* as "Sprite", *CollisionShape2D* as "Collision" (with a circle shape) and 3 *AudioStreamPlayers* for "JumpSound", "DeadSound" and "HitSound". Not sure if it's a good practice to have the audio here, since I did that at the end, pretty lazy. Then, attach a script to the "Player" node and then it should look like this:

![Scene - Player - Node setup](images/g/flappybird_godot/scene_player_node_setup.png)

Select the "Player" node and set the *CollisionShape2D/Collision/Layer* to 1 and the *CollisionObject2D/Collision/Mask* to 2 and 3 (ground and pipe).

For the "Sprite" node, when selecting it click on the "(empty)" for the *AnimatedSprite/Frames* property and click "New SpriteFrames", click again where the "(empty)" used to be and ane window should open on the bottom:

![Scene - Player - SpriteFrames window](images/g/flappybird_godot/scene_player_spriteframes_window.png)

Right off the bat, set the "Speed" to `10 FPS` (bottom left) and rename "default" to "bird_1". With the "bird_1" selected, click on the "Add frames from a Sprite Sheet", which is the second button under "Animation Frames:" which looks has an icon of a small grid (next to the folder icon), a new window will popup where you need to select the respective sprite sheet to use and configure it for importing. On the "Select Frames" window, change the "Vertical" to 1, and then select all 4 frames (*Ctrl + Scroll* wheel to zoom in):

![Scene - Player - Sprite sheet importer](images/g/flappybird_godot/scene_player_sprite_sheet_importer.png)

After that, the *SpriteFrames* window should look like this:

![Scene - Player - SpriteFrames window with sprite sheet configured](images/g/flappybird_godot/scene_player_spriteframes_window_with_sprite_sheet.png)

Finally, make sure the "Sprite" node has the *AnimatedSprite/Animation* is set to "bird_1" and that the "Collision" node is configured correctly for its size and position (I just have it as a radius of 7). As well as dropping the SFX files into the corresponding *AudioStreamPlayer* (into the *AudioStreamPlayer/Stream* property).

### Other

These are really simple scenes that don't require much setup:

- "CeilingDetector": just an *Area2D* node with a *CollisionShape2D* in the form of a rectangle (*CollisionShape2D/Shape/extents* to `(120, 10)`), stretched horizontally so it fits the whole screen. *CollisionObject2D/Collision/Layer* set to `bit 4` (ceiling) and *CollisionObject2D/Collision/Mask* set to bit 1 (player).
- "ScoreDetector": similar to the "CeilingDetector", but vertical (*CollisionShape2D/Shape/extents* to `(2.5, 128)`) and *CollisionObject2D/Collision/Layer* set to `bit 1` (player).
- "WorldDetector": *Node2D* with a script attached, and 3 *RayCast2D* as children:
	- "NewTile": *Raycast2D/Enabled* to true (checked), *Raycast2D/Cast To* `(0, 400)`, *Raycast2D/Collision Mask* to `bit 2` (ground) and *Node2D/Transform/Position* to `(152, -200)`
	- "OldTile": same as "NewTile", except for the *Node2D/Transform/Position*, set it to `(-152, -200)`.
	- "OldPipe": same as "OldTile", except for the *Raycast2D/Collision Mask*, set it to `bit 3` (pipe).

### Game

This is the actual "Game" scene that holds all the playable stuff, here we will drop in all the previous scenes; the root node is a *Node2D* and also has an attached script. Also need to add 2 additional *AudioStreamPlayers* for the "start" and "score" sounds, as well as a *Sprite* for the background (*Sprite/Offset/Offset* set to `(0, 10)`) and a *Camera2D* (*Camera2D/Current* set to true (checked)). It should look something like this:

![Scene - Game - Node setup](images/g/flappybird_godot/scene_game_node_setup.png)

The scene viewport should look something like the following:

![Scene - Game - Viewport](images/g/flappybird_godot/scene_game_viewport.png)

### UI

#### Fonts

We need some font "Resources" to style the *Label* fonts. Under the *FileSystem* window, right click on the fonts directory (create one if needed) and click on "New Resource..." and select *DynamicFontData*, save it in the "fonts" directory as "SilverDynamicFontData.tres" ("Silver" as it is the font I'm using) then double click the just created resource and set the *DynamicFontData/Font Path* to the actual "Silver.ttf" font (or whatever you want).

Then create a new resource and this time select *DynamicFont*, name it "SilverDynamicFont.tres", then double click to edit and add the "SilverDynamicFontData.tres" to the *DynamicFont/Font/Font Data* property (and I personally toggled off the *DynamicFont/Font/Antialiased* property), now just set the *DynamicFont/Settings/(Size, Outline Size, Outline Color)* to 32, 1 and black, respectively (or any other values you want). It should look something like this:

![Resource - DynamicFont - Default font](images/g/flappybird_godot/resource_dynamic_font.png)

Do the same for another *DynamicFont* which will be used for the score label, named "SilverScoreDynamicFont.tres". Only changes are *Dynamic/Settings/(Size, Outline Size)* which are set to 128 and 2, respectively. The final files for the fonts should look something like this:

![Resource - Dynamicfont - Directory structure](images/g/flappybird_godot/resource_dynamic_font_directory_structure.png)

#### Scene setup

This has a bunch of nested nodes, so I'll try to be concise here. The root node is a *CanvasLayer* named "UI" with its own script attached, and for the children:

- "MarginContainer": *MarginContainer* with *Control/Margin/(Left, Top)* set `10` and *Control/Margin/(Right, Bottom)* set to `-10`.
	- "InfoContainer": *VBoxContainer* with *Control/Theme Overrides/Constants/Separation* set to `250`.
		- "ScoreContainer": *VBoxContainer*.
			- "Score": *Label* with *Label/Align* set to "Center", *Control/Theme Overrides/Fonts/Font* to the "SilverScoreDynamicFont.tres", if needed adjust the *DynamicFont* settings.
			- "HighScore: same as "Score", escept for the *Control/Theme Overrides/Fonts/Font* which is set to "SilverDynamicFont.tres".
		- "StartGame": Same as "HighScore".
	- "DebugContainer": *VBoxContainer*.
		- "FPS": *Label*.
	- "VersionContainer": *VBoxContainer* with *BoxContainer/Alignment* set to "Begin".
		- "Version": *Label* with *Label/Align* set to "Right".

The scene ends up looking like this:

![Scene - UI - Node setup](images/g/flappybird_godot/scene_ui.png)

### Main

This is the final scene where we connect the Game and the UI. It's made of a *Node2D* with it's own script attached and an instance of "Game" and "UI" as it's children.

This is a good time to set the default scene when we run the game by going to *Project -> Project settings... -> General* and in *Application/Run* set the *Main Scene* to the "Main.tscn" scene.

## Scripting

As of now, the game itself doesn't do anything if we hit play.

## Temp notes

- [x] Texture presets for pixel art.
- [x] Game scale option in settings.
- [x] Specifics on the tilemap/tileset config.
- [x] Setup physics layers.
- [x] Ggscript debug remove: unused argument, unused signal, return value
- [ ] Transform png icon to ico for windows releases: magick convert icon.png -define icon:auto-resize=256,128,64,48,32,16 icon.ico
- [ ] Download rcedit and put it somewhere near godot for ease of access
- [ ] When exporting toggle off debug mode