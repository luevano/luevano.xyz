title: Final improvements to the FlappyBird clone and Android support devlog 3
author: David Luévano
lang: en
summary: Notes on the final improvements to my FlappyBird clone made in Godot 4.x. Also details on the support for Android.
tags: gamedev
	godot
	gdscript
	english

Decided to conclude my FlappyBird journey with one last set of improvements, following up on devlogs [1](https://blog.luevano.xyz/g/flappybird_godot_devlog_1.html) and [2](https://blog.luevano.xyz/g/flappybird_godot_devlog_2.html). Focusing on **refactoring**, **better UI**, **sprite selection** and Android support.

I missed some features that I really wanted to get in but I'm already tired of working on this toy project and already eager to move to another one. Most of the features I wanted to add are just *QoL* UI enhancements and extra buttons basically.

The source code can be found at [luevano/flappybirdgodot](https://github.com/luevano/flappybirdgodot). Playable at [itch.io](https://lorentzeus.itch.io/flappybirdgodot):

<p style="text-align:center"><iframe src="https://itch.io/embed/1551015?dark=true" width="208" height="167" frameborder="0"><a href="https://lorentzeus.itch.io/flappybirdgodot">FlappyBirdGodot by Lorentzeus</a></iframe></p>

# Table of contents

[TOC]

# Refactoring

The first part for my refactor was to move everything out of the `src/` directory into the root directory of the git repository, organizing it a tiny bit better, personal preference from what I've learned so far. I also decided to place all the raw aseprite assets next to the imported one, this way its easier to make modifications and then save directly in the same directory. Also, a list of other refactoring done:

- The way I handled the gameplay means that I needed to make the camera, background and the (ceiling and tiles) "detectors" move along with the player, while restricting their movement in the `x` axis, really hacky. Instead, I did what I should've done from the beginning... just let the tiles move backwards and keep everything static with the player only moving up an down (as how I stated at the beginning of [FlappyBirdgodot devlog 1](https://blog.luevano.xyz/g/flappybird_godot_devlog_1.html) but didn't actually follow).
- Moved the `set_process` methodology to their own scripts, instead of handling everything in `main.gd` while also taking advantage of how signals work now. Instead of doing:

```gdscript
func _ready():
    Event.game_pause.connect(_on_game_pause)

func _on_game_pause(pause: bool):
    set_process(pause)
```

Just connecting to `set_process` is enough:

```gdscript
func _ready():
    Event.game_pause.connect(set_process)
    # and when the signal doesn't send anything:
    Event.game_start.connect(set_process.bind(true))
    Event.game_over.connect(set_process.bind(false))
```

# Improvements

## Background parallax

First thing was to add a moving background functionality, by adding 2 of the same `Sprite2D`'s one after another and everytime the first sprite moves out of the screen, position it right after the second sprite. Some sample code to accomplish this:

```gdscript
func _ready():
   # Sprite2D and CompressedTexture2D nodes
   background_orig.texture = background_texture
   texture_size = background_orig.texture.get_size()

   backgrounds.append(background_orig.duplicate())
   backgrounds.append(background_orig.duplicate())
   backgrounds[1].position = background_orig.position + Vector2(texture_size.x, 0.0)

   add_child(backgrounds[0])
   add_child(backgrounds[1])
   background_orig.visible = false

# ifirst (index first) it's a boolean value starting with false and
#   its a hacky way of tracking the first sprites
#   (the one closest to the left of the screen) in the array
func _process(delta: float):
    for background in backgrounds:
        background.move_local_x(- SPEED * delta)

    # moves the sprite that just exited the screen to the right of the upcoming sprite
    if backgrounds[int(ifirst)].position.x <= - background_orig.position.x:
        backgrounds[int(ifirst)].position.x = backgrounds[int(!ifirst)].position.x + texture_size.x
        ifirst = !ifirst
```

Then I added background parallax by separating the background sprites in two: background and "foreground" (the buildings in the original sprites). And to move them separately just applied the same logic described above with 2 different speeds.

## Sprite switcher

Also added a way to select between the bird sprites and the backgrounds, currently pretty primitive but functional. Accomplished this by holding textures in an exported array, then added a bit of logic to cycle between them (example for the background):

```gdscript
func _get_new_sprite_index(index: int) -> int:
    return clampi(index, 0, background_textures.size() - 1)


func _set_sprites_index(index: int) -> int:
    var new_index: int = _get_new_sprite_index(index)
    if new_index == itexture:
        return new_index
    for bg in backgrounds:
        bg.texture = background_textures[new_index]
    for fg in foregrounds:
        fg.texture = foreground_textures[new_index]
    itexture = new_index
    return new_index
```

Then, in custom signals I just call `_set_sprites_index` with a `texture_index +/- 1`.

## Save data

Moved from manual `ConfigFile` (which is an `.ini` file basically) to `Resource` which is easier to work with and faster to implement.

Accomplished by defining a new `data_resource.gd`:

```gdscript
class_name DataResource
extends Resource

@export var high_score: int
@export var volume: float
@export var mute: bool
@export var bird: int
@export var background: int

func _init():
    high_score = 0
    volume = 0.5
    mute = false
    bird = 0
    background = 0
```

Where the `@export`s are not needed unless you need to manage the `.tres` resource files for testing in-editor.

Then, the `data.gd` script needs to be changed accordingly, most notably:

- The file extension is `.tres` instead of `.cfg`.
- No need for "config sections".
- Saving changes to:

```gdscript
func save():
    var err: int = ResourceSaver.save(_data, DATA_PATH)
    if err != OK:
        print("[ERROR] Couldn't save data.")
```

- The loader gets simplified (mostly because the default values are set in the `_init()` function of the `data_resource.gd`) to:

```gdscript
func _load_data():
    if ResourceLoader.exists(DATA_PATH):
        _data = load(DATA_PATH)
    else:
        _data = DataResource.new()
        save()
```

- The attributes/config/saved data can be retrieved directly by the `data_resource.gd` variable name, for example: instead of `_data.get_value(SCORE_SECTION, "high_score")` it's now simply `_data.high_score`. And similar for setting the values.

Compared to the [3.x version](https://blog.luevano.xyz/g/flappybird_godot_devlog_1.html#saved-data) it is a lot more simple. Though I still have setters and getters for each attribute/config (I'll se how to change this in the future).

# Android

I did add android support but it's been so long since I did it that I actually don't remember (this entry has been sitting in a draft for months). In general I followed the official guide for [Exporting for Android](https://docs.godotengine.org/en/stable/tutorials/export/exporting_for_android.html), setting up Android studio and remotely debugging with my personal phone; it does take a while to setup but after that it's as simple as doing *"one click deploys"*.

Most notably, I had to enable touch screen support and make the buttons clickable either by an actual mouse click or touch input. Some of the *Project Settings* that I remember that needs changes are:

- *display/window/handheld/orientation* set to `Portrait`.
- *input_devices/pointing/emulate_touch_from_mouse* and *input_devices/pointing/emulate_mouse_from_touch* both set to `on`.

# Misc

Found a bug on the `ScoreDetector` where it would collide with the `Ceiling`. While this is really not a problem outside of me doing tests I fixed it by [applying the correct layer/mask](https://blog.luevano.xyz/g/godot_layers_and_masks_notes.html).
