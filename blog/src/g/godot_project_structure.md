title: General Godot project structure
author: David Luévano
lang: en
summary: Details on the project structure I'm using for Godot, based on preference and some research I did.
tags: gamedev
	short
	english

One of my first issues when starting a project is how to structure everything. So I had to spend some time researching best practices and go with what I like the most and after trying some of them I wanted to write down somewhere what I'm sticking with.

The first place to look for is, of course, the official *Godot* documentation on [Project organization](https://docs.godotengine.org/en/stable/tutorials/best_practices/project_organization.html); along with project structure discussion, also comes with best practices for code style and what-not. I don't like this project/directory structure that much, just because it tells you to bundle everything under the same directory but it's a really good starting point, for example it tells you to use:

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

It might look like it's more work, but I prefer it like this. I wish [this site](https://www.braindead.bzh/entry/creating-a-game-with-godot-engine-ep-2-project-organization) was still available, as I got most of my ideas from there and was a pretty good resource, but apparently the owner is not maintaining his site anymore; but there is [this excelent comment on reddit](https://www.reddit.com/r/godot/comments/7786ee/comment/dojuzuf/?utm_source=share&utm_medium=web2x&context=3) which shows a project/directory structure more in line with what I'm currently using (and similr to the site that is down that I liked). I ended up with:

- /.git
- /assets (raw assets/editable assets/asset packs)
- /releases (executables ready to publish)
- /src (the actual godot project)
	- .godot/
	- actors/ (or entities)
		- player/
			- sprites/
			- player.x
			- ...
		- enemy/ (this could be a dir with subdirectories for each type of enemy for example...)
			- sprites/
			- enemy.x
			- ...
		- actor.x
		- ...
	- levels/ (or scenes)
		- common/
			- sprites/
			- ...
		- main/
			- ...
		- overworld/
			- ...
		- dugeon/
			- ...
		- Game.tscn (I'm considering the "Game" as a level/scene)
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
	- sfx/
		- ...
	- vfx/
		- ...
	- etc/
		- ...
	- Main.tscn (the entry point of the game)
	- main.gd
	- icon.png (could also be on a separate "icons" directory)
	- project.godot
	- ...
- \<any other repository related files\>

And so on, I hope the idea is clear. I'll probably change my mind on the long run, but for now this has been working fine.