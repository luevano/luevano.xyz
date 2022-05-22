title: General Godot project structure
author: David Luévano
lang: en
summary: Details on the project structure I'm using for Godot, based on preference and some research I did.
tags: gamedev
	short
	english

One of my first issues when starting a project is how to structure everything. So I had to spend some time researching best practices and go with what I like the most.

The first place to look for is of course the official *Godot* documentation on [Project organization](https://docs.godotengine.org/en/stable/tutorials/best_practices/project_organization.html); along with project structure discussion, also comes with best practices for code style and what-not. I don't like this project/directory structure that much, just because it tells you to bundle everything under the same directory but it's a really good starting point, for example it tells you to use:

- /models/town/house/
	- house.dae
	- window.png
	- door.png

Where I would prefer to have more modularity, for example:

- /levels/structures/town/house (or /levels/town/structures/house)
	- window/
		- window.x
		- window.y
		- window.z
	- door/
		- ...
	- house.x
	- house.y
	- house.z

It might look like it's more work, but I prefer it like this. I wish [this site ](https://www.braindead.bzh/entry/creating-a-game-with-godot-engine-ep-2-project-organization) was still available, as I got most of my ideas from there, but apparently the owner is not maintaining his site anymore; but there is [this excelent comment on reddit](https://www.reddit.com/r/godot/comments/7786ee/comment/dojuzuf/?utm_source=share&utm_medium=web2x&context=3) which shows a project/sirectory structure more in line with what I'm currently using (and similr to the site that is down that I liked that much). I just do somethings a bit different, and end up with:

- /.git
- /assets (raw assets/editable assets for their respective software, could also be the whole imported assets from some packs, where you can just select few of them to actually use)
- /releases (executables ready to publish)
- /src (the actual godot project)
	- .godot/
	- actors/ (or entities)
		- player/
			- assets/
			- sprites/
			- ...
		- enemy/ (this could be a dir with subdirectories for each type of enemy for example...)
			- assets/
			- sprites/
			- ...
		- actor.gd
		- ...
	- levels/ (or scenes)
		- common/
			- assets/
			- sprites/
			- ...
		- main/
			- ...
		- overworld/
			- ...
		- dugeon/
			- ...
		- Game.tscn (I consider the "game" itself a level/scene, so I'm including it here)
		- game.gd
	- objects/
		- box/
			- ...
		- ...
	- screens/
		- main_menu/
			- ...
		- ...
	- globals/ (singletons/autoloads)
	- ui/
		- menus/
			- ...
		- ...
	- Main.tscn (the entry point of the game)
	- main.gd
	- icon.png
	- project.godot
	- ...
- \<any other repository related files\>

And so on, I hope the idea is clear. Basically you need to abstract some entity/object that you're going to use into its more basic form and use subdirectories for each level of abstraction (a player is an actor and thus we use actor/player; a box is part of the world, and is a level so we can use levels/common/decor/box or something like that). Once you have the most basic abstraction done, anything that belongs to that abstraction will have all of its assets/sounds/shaders/etc in it's directory.