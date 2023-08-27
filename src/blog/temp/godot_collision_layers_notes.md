# Notes on layers and masks

Taken from a comment from https://ask.godotengine.org/4010/whats-difference-between-collision-layers-collision-masks:

1. If enemy's mask and object's mask are set to 0 (i.e. no layers), they will still collide with the player, because the player's mask still includes their respective layers.
2. Overall, if the objects are `A` and `B`, the check for collision is `A.mask & B.layers || B.mask & A.layers`, where `&` is bitwise-and, and `||` is the or operator. I.e. it takes the layers that correspond to the other object's mask, and checks if any of them is on in both places. It will they proceed to check it the other way around, and if any of the two tests passes, it would report the collision.

Also, in the same link (which in turn is taken from https://kidscancode.org/blog/2018/02/godot3_kinematic2d/):

1. `collision_layer` describes the layers that the object appears in. By default, all bodies are on layer `1`.
2. `collision_mask` describes what layers the body will scan for collisions. If an object isn’t in one of the mask layers, the body will ignore it. By default, all bodies scan layer `1`.

