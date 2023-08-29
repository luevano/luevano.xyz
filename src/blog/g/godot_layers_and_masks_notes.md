title: Godot layers and masks notes
author: David Luévano
lang: en
summary: Some notes I took regarding Godot's confusing collision layers and masks.
tags: gamedev
	godot
	gdscript
	english

The first time I learned about Godot's collision layers and masks (will refer to them just as layers) I thought I understood them only to find out that they're a bit confusing when trying to figure out interactions between objects that are supposed to detect each other. On my last entry where I [ported the FlappyBird clone to *Godot 4.1*](https://blog.luevano.xyz/g/flappybird_godot_devlog_2.html) I stumbled upon an issue with the bird not colliding properly with the pipes and the ceiling detector not... well, detecting.

At the end of the day the issue wasn't that the layers weren't properly setup but rather that the API to change the state of the collision layers changed between *Godot 3* and *Godot 4*: when calling `set_collision_layer_value` (or `.._mask`) instead of specifying the `bit` which starts at `0`, the `layer_number` is required that happens to start at `1`. This was a headache for like an hour and made me realise that I didn't understand layers that well or else I would've picked the error almost instantly.

While researching I found two really good short explainations that helped me grasp the concepts better in the same [post](https://ask.godotengine.org/4010/whats-difference-between-collision-layers-collision-masks), the first a bit technical (by [Bojidar Marinov](https://ask.godotengine.org/user/Bojidar+Marinov)):

- If enemy's mask and object's mask are set to `0` (i.e. no layers), they will still collide with the player, because the player's mask still includes their respective layers.
- Overall, if the objects are `A` and `B`, the check for collision is `A.mask & B.layers || B.mask & A.layers`, where `&` is bitwise-and, and `||` is the or operator. I.e. it takes the layers that correspond to the other object's mask, and checks if any of them is on in both places. It will then proceed to check it the other way around, and if any of the two tests passes, it would report the collision.

And the second, shorter and less technical but still powerful (in the same post linking back to [Godot 3.0: Using KinematicBody2D](https://kidscancode.org/blog/2018/02/godot3_kinematic2d/)):

- `collision_layer` describes the layers that the object appears in. By default, all bodies are on layer `1`.
- `collision_mask` describes what layers the body will scan for collisions. If an object isn’t in one of the mask layers, the body will ignore it. By default, all bodies scan layer `1`.

While the complete answer is the first, as that is how layers work, the second can be used like a rule: 1) the `layer` is where the object lives, while 2) the `mask` is what the object will detect.

